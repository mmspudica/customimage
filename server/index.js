const path = require('path');
const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'luce.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const SESSION_COOKIE = 'luce_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

const sessions = new Map();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : '';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${safeExt}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const productUpload = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'gallery', maxCount: 5 },
]);

function cleanupUploadedFiles(files) {
  if (!files) {
    return;
  }

  Object.values(files).forEach(fileGroup => {
    fileGroup.forEach(file => {
      if (file && file.path) {
        fs.unlink(file.path, err => {
          if (err) {
            console.error('Failed to remove uploaded file', err);
          }
        });
      }
    });
  });
}

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      brand TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      category TEXT,
      channel TEXT,
      experience TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      retail_price TEXT NOT NULL,
      fit TEXT NOT NULL,
      specs TEXT,
      description TEXT,
      primary_image TEXT NOT NULL,
      gallery TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES signups(id)
    )`
  );
});

app.use(express.json());

const VALID_CATEGORIES = new Set(['fashion', 'beauty', 'wellness', 'goods']);
const SIGNUP_TYPES = new Set(['supplier', 'seller', 'member']);

function parseGallery(raw) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(url => typeof url === 'string' && url.trim().length).map(url => url.trim());
    }
    return [];
  } catch (error) {
    return [];
  }
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) {
    return {};
  }

  return header.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return acc;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      acc[trimmed] = '';
      return acc;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    acc[key] = decodeURIComponent(value || '');
    return acc;
  }, {});
}

function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { token, ...session };
}

function createSupplierSession(supplier) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    supplierId: supplier.id,
    supplierBrand: supplier.brand,
    supplierPhone: supplier.phone,
    supplierEmail: supplier.email,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSupplierPayload(session) {
  return {
    id: session.supplierId,
    brand: session.supplierBrand,
    phone: session.supplierPhone,
    email: session.supplierEmail,
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

app.post('/api/signup', (req, res) => {
  const { type, brand, phone, email, category = null, channel = null, experience = null, notes = null } = req.body || {};

  if (!type || !brand || !phone || !email) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  if (!SIGNUP_TYPES.has(type)) {
    return res.status(400).json({ error: '유효하지 않은 가입 유형입니다.' });
  }

  db.run(
    'INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      type,
      String(brand).trim(),
      String(phone).trim(),
      String(email).trim(),
      category ? String(category).trim() : null,
      channel ? String(channel).trim() : null,
      experience ? String(experience).trim() : null,
      notes ? String(notes).trim() : null,
    ],
    function (err) {
      if (err) {
        console.error('DB insert error', err);
        return res.status(500).json({ error: '신청 저장 중 오류가 발생했습니다.' });
      }

      return res.status(201).json({ id: this.lastID });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { brand, phone, email } = req.body || {};

  const normalizedBrand = typeof brand === 'string' ? brand.trim() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';

  if (!normalizedBrand || !normalizedPhone || !normalizedEmail) {
    return res.status(400).json({ error: '브랜드, 연락처, 이메일을 모두 입력해주세요.' });
  }

  db.get(
    `SELECT id, brand, phone, email
       FROM signups
      WHERE type = 'supplier' AND brand = ? AND phone = ? AND email = ?`,
    [normalizedBrand, normalizedPhone, normalizedEmail],
    (err, supplier) => {
      if (err) {
        console.error('Supplier login lookup error', err);
        return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
      }

      if (!supplier) {
        return res.status(401).json({ error: '등록된 공급업체 정보와 일치하지 않습니다.' });
      }

      const token = createSupplierSession(supplier);
      const sessionRecord = sessions.get(token);
      if (!sessionRecord) {
        sessions.delete(token);
        return res.status(500).json({ error: '세션 생성에 실패했습니다.' });
      }

      setSessionCookie(res, token);
      return res.json({ supplier: getSupplierPayload(sessionRecord) });
    }
  );
});

app.post('/api/logout', (req, res) => {
  const session = getSession(req);
  if (session) {
    sessions.delete(session.token);
  }

  clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/session', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({ authenticated: true, supplier: getSupplierPayload(session) });
});

app.get('/api/signups', (_req, res) => {
  db.all('SELECT * FROM signups ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('DB select error', err);
      return res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
    }

    res.json(rows);
  });
});

app.get('/api/suppliers', (_req, res) => {
  db.all(
    `SELECT id, brand, phone, email, created_at
     FROM signups
     WHERE type = 'supplier'
     ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) {
        console.error('DB supplier select error', err);
        return res.status(500).json({ error: '공급업체 정보를 불러오는 중 오류가 발생했습니다.' });
      }

      res.json(rows);
    }
  );
});

app.get('/api/products', (_req, res) => {
  db.all(
    `SELECT p.id, p.title, p.category, p.retail_price AS retailPrice, p.fit, p.specs, p.description,
            p.primary_image AS primaryImage, p.gallery, p.created_at AS createdAt,
            s.brand AS supplierBrand, s.id AS supplierId
     FROM products p
     LEFT JOIN signups s ON s.id = p.supplier_id
     ORDER BY p.created_at DESC`,
    (err, rows) => {
      if (err) {
        console.error('DB product select error', err);
        return res.status(500).json({ error: '상품 정보를 불러오는 중 오류가 발생했습니다.' });
      }

      const products = rows.map(row => {
        const gallery = parseGallery(row.gallery);
        if (!gallery.length && row.primaryImage) {
          gallery.push(row.primaryImage);
        }

        return {
          id: `LB-${row.id}`,
          title: row.title,
          category: row.category,
          retailPrice: row.retailPrice,
          fit: row.fit,
          specs: row.specs || '',
          description: row.description || '',
          image: row.primaryImage,
          gallery,
          supplier: {
            id: row.supplierId,
            brand: row.supplierBrand,
          },
          createdAt: row.createdAt,
        };
      });

      res.json(products);
    }
  );
});

app.get('/api/metrics', (_req, res) => {
  db.get(
    `SELECT
        (SELECT COUNT(*) FROM products) AS productCount,
        (SELECT COUNT(*) FROM signups WHERE type = 'supplier') AS supplierCount,
        (SELECT COUNT(*) FROM signups WHERE type = 'seller') AS sellerCount,
        (SELECT COUNT(*) FROM signups WHERE type = 'member') AS memberCount,
        (SELECT MAX(created_at) FROM products) AS latestProduct
     `,
    (err, row) => {
      if (err) {
        console.error('DB metrics error', err);
        return res.status(500).json({ error: '지표 정보를 불러오는 중 오류가 발생했습니다.' });
      }

      const metrics = {
        products: row?.productCount ? Number(row.productCount) : 0,
        suppliers: row?.supplierCount ? Number(row.supplierCount) : 0,
        sellers: row?.sellerCount ? Number(row.sellerCount) : 0,
        members: row?.memberCount ? Number(row.memberCount) : 0,
        latestProduct: row?.latestProduct || null,
      };

      res.json(metrics);
    }
  );
});

app.post('/api/products', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  productUpload(req, res, err => {
    if (err) {
      console.error('Product upload error', err);
      const message =
        err instanceof multer.MulterError
          ? '이미지 업로드에 실패했습니다. 파일 수와 용량을 확인해주세요.'
          : '이미지 업로드에 실패했습니다.';
      return res.status(400).json({ error: message });
    }

    const {
      title,
      category,
      retailPrice,
      fit,
      specs = '',
      description = '',
    } = req.body || {};

    const numericSupplierId = Number(session.supplierId);
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedCategory = typeof category === 'string' ? category.trim() : '';
    const normalizedRetailPrice = typeof retailPrice === 'string' ? retailPrice.trim() : '';
    const normalizedFit = typeof fit === 'string' ? fit.trim() : '';
    const normalizedSpecs = typeof specs === 'string' ? specs.trim() : '';
    const normalizedDescription = typeof description === 'string' ? description.trim() : '';

    const thumbnailFile = Array.isArray(req.files?.thumbnail)
      ? req.files.thumbnail.find(file => file && file.filename)
      : null;
    const detailFiles = Array.isArray(req.files?.gallery)
      ? req.files.gallery.filter(file => file && file.filename)
      : [];

    if (!numericSupplierId || Number.isNaN(numericSupplierId)) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: '공급업체를 선택해주세요.' });
    }

    if (!normalizedTitle || !normalizedCategory || !normalizedRetailPrice || !normalizedFit) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
    }

    if (!VALID_CATEGORIES.has(normalizedCategory)) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: '지원하지 않는 카테고리입니다.' });
    }

    if (!thumbnailFile) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: '썸네일 이미지를 업로드해주세요.' });
    }

    if (!detailFiles.length) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: '상세 이미지를 최소 한 장 이상 업로드해주세요.' });
    }

    const thumbnailPath = `/uploads/${thumbnailFile.filename}`;
    const galleryPaths = detailFiles.map(file => `/uploads/${file.filename}`).slice(0, 5);

    db.get(
      `SELECT id, brand FROM signups WHERE id = ? AND type = 'supplier'`,
      [numericSupplierId],
      (lookupErr, supplier) => {
        if (lookupErr) {
          console.error('Supplier lookup error', lookupErr);
          cleanupUploadedFiles(req.files);
          return res.status(500).json({ error: '공급업체 검증 중 오류가 발생했습니다.' });
        }

        if (!supplier) {
          cleanupUploadedFiles(req.files);
          return res.status(400).json({ error: '등록된 공급업체만 상품을 업로드할 수 있습니다.' });
        }

        db.run(
          `INSERT INTO products (supplier_id, title, category, retail_price, fit, specs, description, primary_image, gallery)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            numericSupplierId,
            normalizedTitle,
            normalizedCategory,
            normalizedRetailPrice,
            normalizedFit,
            normalizedSpecs,
            normalizedDescription,
            thumbnailPath,
            JSON.stringify(galleryPaths),
          ],
          function (insertErr) {
            if (insertErr) {
              console.error('Product insert error', insertErr);
              cleanupUploadedFiles(req.files);
              return res.status(500).json({ error: '상품 저장 중 오류가 발생했습니다.' });
            }

            db.get(
              `SELECT p.id, p.title, p.category, p.retail_price AS retailPrice, p.fit, p.specs, p.description,
                      p.primary_image AS primaryImage, p.gallery, p.created_at AS createdAt,
                      s.brand AS supplierBrand, s.id AS supplierId
               FROM products p
               LEFT JOIN signups s ON s.id = p.supplier_id
               WHERE p.id = ?`,
              [this.lastID],
              (selectErr, row) => {
                if (selectErr || !row) {
                  if (selectErr) {
                    console.error('Product fetch error', selectErr);
                  }
                  return res.status(201).json({ id: this.lastID });
                }

                const gallery = parseGallery(row.gallery);
                if (!gallery.length && row.primaryImage) {
                  gallery.push(row.primaryImage);
                }

                res.status(201).json({
                  id: `LB-${row.id}`,
                  title: row.title,
                  category: row.category,
                  retailPrice: row.retailPrice,
                  fit: row.fit,
                  specs: row.specs || '',
                  description: row.description || '',
                  image: row.primaryImage,
                  gallery,
                  supplier: {
                    id: row.supplierId,
                    brand: row.supplierBrand,
                  },
                  createdAt: row.createdAt,
                });
              }
            );
          }
        );
      }
    );
  });
});

const staticDir = path.join(__dirname, '..');

app.get('/admin.html', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.redirect('/login.html?redirect=admin.html');
  }

  res.sendFile(path.join(staticDir, 'admin.html'));
});

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(staticDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`LUCE lookbook server running on http://localhost:${PORT}`);
});

const shutdown = signal => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
