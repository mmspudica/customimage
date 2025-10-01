const path = require('path');
const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'luce.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

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

app.post('/api/signup', (req, res) => {
  const { type, brand, phone, email, category = null, channel = null, experience = null, notes = null } = req.body || {};

  if (!type || !brand || !phone || !email) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  const normalizedType = type === 'wholesale' ? 'wholesale' : 'seller';

  db.run(
    'INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      normalizedType,
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
     WHERE type = 'wholesale'
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

app.post('/api/products', (req, res) => {
  const {
    supplierId,
    title,
    category,
    retailPrice,
    fit,
    specs = '',
    description = '',
    images,
  } = req.body || {};

  const numericSupplierId = Number(supplierId);
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedCategory = typeof category === 'string' ? category.trim() : '';
  const normalizedRetailPrice = typeof retailPrice === 'string' ? retailPrice.trim() : '';
  const normalizedFit = typeof fit === 'string' ? fit.trim() : '';
  const normalizedSpecs = typeof specs === 'string' ? specs.trim() : '';
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';

  const imageList = Array.isArray(images)
    ? images
    : typeof images === 'string'
      ? images.split(/\r?\n|,/)
      : [];

  const gallery = imageList
    .map(url => (typeof url === 'string' ? url.trim() : ''))
    .filter(url => url.length);

  if (!numericSupplierId || Number.isNaN(numericSupplierId)) {
    return res.status(400).json({ error: '공급업체를 선택해주세요.' });
  }

  if (!normalizedTitle || !normalizedCategory || !normalizedRetailPrice || !normalizedFit) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  if (!VALID_CATEGORIES.has(normalizedCategory)) {
    return res.status(400).json({ error: '지원하지 않는 카테고리입니다.' });
  }

  if (!gallery.length) {
    return res.status(400).json({ error: '최소 한 개 이상의 이미지 URL이 필요합니다.' });
  }

  db.get(
    `SELECT id, brand FROM signups WHERE id = ? AND type = 'wholesale'`,
    [numericSupplierId],
    (lookupErr, supplier) => {
      if (lookupErr) {
        console.error('Supplier lookup error', lookupErr);
        return res.status(500).json({ error: '공급업체 검증 중 오류가 발생했습니다.' });
      }

      if (!supplier) {
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
          gallery[0],
          JSON.stringify(gallery),
        ],
        function (insertErr) {
          if (insertErr) {
            console.error('Product insert error', insertErr);
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

const staticDir = path.join(__dirname, '..');
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
