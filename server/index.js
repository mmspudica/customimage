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

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

const sessions = new Map();

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!password || !salt || !hash) {
    return false;
  }

  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch (error) {
    return false;
  }
}

function createImageUrl(label) {
  return `https://dummyimage.com/900x1200/111111/ffffff.png&text=${encodeURIComponent(label)}`;
}

function buildGallery(prefix) {
  return [
    createImageUrl(`${prefix} - Thumbnail`),
    createImageUrl(`${prefix} - Detail 1`),
    createImageUrl(`${prefix} - Detail 2`),
    createImageUrl(`${prefix} - Detail 3`),
    createImageUrl(`${prefix} - Detail 4`),
    createImageUrl(`${prefix} - Detail 5`),
  ];
}

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

app.use(express.json());

const VALID_CATEGORIES = new Set(['fashion', 'beauty', 'wellness', 'goods']);
const SIGNUP_TYPES = new Set(['supplier', 'seller', 'member']);

const SUPPLIER_TARGET = 100;
const SELLER_TARGET = 1000;
const MEMBER_TARGET = 2000;

const SAMPLE_SUPPLIER_PASSWORD = 'luce1234!';
const SAMPLE_SELLER_PASSWORD = 'seller1234!';
const SAMPLE_MEMBER_PASSWORD = 'member1234!';
const TEST_SUPPLIER_EMAIL = 'test@test.com';
const TEST_SUPPLIER_PASSWORD = 'test1234';

const SAMPLE_PRODUCTS = [
  {
    title: '모던 테일러드 블레이저',
    category: 'fashion',
    retailPrice: '₩129,000',
    fit: '오버핏 · 프리사이즈',
    specs: '폴리에스터 80%, 레이온 20%',
    description: '투톤 안감과 미니멀 라펠을 더한 시그니처 블레이저. 셀러들이 바로 써먹는 스테디셀러입니다.',
    gallery: buildGallery('Fashion 01'),
  },
  {
    title: '스트럭처드 와이드 트라우저',
    category: 'fashion',
    retailPrice: '₩89,000',
    fit: '미디엄 라이즈 · S/M/L',
    specs: '울 50%, 폴리에스터 50%',
    description: '허리 안쪽 실리콘 테이프와 와이드 실루엣으로 롱기장을 연출하는 팬츠입니다.',
    gallery: buildGallery('Fashion 02'),
  },
  {
    title: '미니멀 슬립 드레스',
    category: 'fashion',
    retailPrice: '₩79,000',
    fit: '스트레이트 핏 · 프리사이즈',
    specs: '비스코스 65%, 나일론 35%',
    description: '레이어링하기 좋은 슬립 드레스로 방송 조명에서 은은하게 빛나도록 가공했습니다.',
    gallery: buildGallery('Fashion 03'),
  },
  {
    title: '실키 셔츠 블라우스',
    category: 'fashion',
    retailPrice: '₩69,000',
    fit: '레귤러 핏 · S/M/L',
    specs: '텐셀 70%, 폴리에스터 30%',
    description: '광택감이 살아 있는 실키 셔츠. 베이직 룩에 포인트로 활용하기 좋습니다.',
    gallery: buildGallery('Fashion 04'),
  },
  {
    title: '테크니컬 롱 파카',
    category: 'fashion',
    retailPrice: '₩189,000',
    fit: '릴랙스드 핏 · S/M/L',
    specs: '나일론 100% (생활 방수)',
    description: '방수 지퍼와 드로코드를 갖춘 경량 롱 파카. 야외 촬영과 라이브 모두에 어울립니다.',
    gallery: buildGallery('Fashion 05'),
  },
  {
    title: '클린 글래스 스킨 세트',
    category: 'beauty',
    retailPrice: '₩59,000',
    fit: '모든 피부 타입',
    specs: '토너 150ml, 세럼 30ml, 크림 50ml',
    description: '각질을 정돈하고 유수분 밸런스를 맞춰주는 3단계 글래스 스킨 루틴 세트입니다.',
    gallery: buildGallery('Beauty 01'),
  },
  {
    title: '벨벳 립 팔레트',
    category: 'beauty',
    retailPrice: '₩32,000',
    fit: '4 셰이드',
    specs: '비타민E, 시어버터 함유',
    description: '쿨톤과 웜톤을 모두 커버하는 4색 립 팔레트. 방송 중 컬러 믹싱 시연에 적합합니다.',
    gallery: buildGallery('Beauty 02'),
  },
  {
    title: '아로마 테라피 미스트',
    category: 'beauty',
    retailPrice: '₩24,000',
    fit: '100ml',
    specs: '라벤더·시트러스 에센셜 오일',
    description: '피부 진정과 공간 리프레시를 동시에 돕는 이중 사용 미스트입니다.',
    gallery: buildGallery('Beauty 03'),
  },
  {
    title: '콜드 브루 세럼',
    category: 'beauty',
    retailPrice: '₩41,000',
    fit: '저자극 포뮬라',
    specs: '카페인 2%, 히알루론산 5중 복합',
    description: '칙칙한 피부를 깨우는 쿨링 세럼. 프라이머 대용으로도 활용됩니다.',
    gallery: buildGallery('Beauty 04'),
  },
  {
    title: '클리어 밸런싱 토너 패드',
    category: 'beauty',
    retailPrice: '₩27,000',
    fit: '70매',
    specs: 'PHA 3%, 티트리 추출물',
    description: '세안 후 한 장으로 각질과 피지를 정돈하는 토너 패드. 스튜디오 준비 시간을 줄여줍니다.',
    gallery: buildGallery('Beauty 05'),
  },
  {
    title: '데일리 비타민 팩',
    category: 'wellness',
    retailPrice: '₩39,000',
    fit: '30포',
    specs: '멀티비타민 & 미네랄 블렌드',
    description: '한 포에 하루 영양 밸런스를 담은 데일리 비타민팩. 이동 중에도 간편하게 섭취합니다.',
    gallery: buildGallery('Wellness 01'),
  },
  {
    title: '이너 밸런스 프로바이오틱',
    category: 'wellness',
    retailPrice: '₩33,000',
    fit: '60캡슐',
    specs: '프로바이오틱스 10억 CFU',
    description: '장 케어와 피부 컨디션을 동시에 잡는 프로바이오틱 캡슐. 냉장 보관이 필요 없습니다.',
    gallery: buildGallery('Wellness 02'),
  },
  {
    title: '식물성 단백질 쉐이크',
    category: 'wellness',
    retailPrice: '₩42,000',
    fit: '750g',
    specs: '완두단백 20g/1서빙',
    description: '무첨가, 저당 식물성 단백질. 스튜디오 준비 전 빠르게 에너지를 채울 수 있습니다.',
    gallery: buildGallery('Wellness 03'),
  },
  {
    title: '포커스 오메가3 컴플렉스',
    category: 'wellness',
    retailPrice: '₩45,000',
    fit: '90캡슐',
    specs: 'rTG 오메가3 1,000mg',
    description: '집중력과 눈 건강을 동시에 케어하는 고순도 오메가3 제품입니다.',
    gallery: buildGallery('Wellness 04'),
  },
  {
    title: '나이트 릴렉스 허브티',
    category: 'wellness',
    retailPrice: '₩21,000',
    fit: '20티백',
    specs: '캐모마일, 레몬밤, 패션플라워',
    description: '방송 준비 후 긴장을 풀어주는 허브티 블렌드. 카페인이 없습니다.',
    gallery: buildGallery('Wellness 05'),
  },
  {
    title: '모듈러 레더 토트',
    category: 'goods',
    retailPrice: '₩158,000',
    fit: 'ONE SIZE',
    specs: '풀 그레인 레더, 내부 파우치 포함',
    description: '스트랩을 탈착해 크로스와 토트로 변형되는 모듈러 가방입니다.',
    gallery: buildGallery('Goods 01'),
  },
  {
    title: '스톤 실버 이어커프',
    category: 'goods',
    retailPrice: '₩38,000',
    fit: '지름 18mm',
    specs: '925 실버, 큐빅 세팅',
    description: '피어싱 없이 착용 가능한 이어커프. 셀러 착용컷 연출에 활용도가 높습니다.',
    gallery: buildGallery('Goods 02'),
  },
  {
    title: '모노그램 캔버스 파우치',
    category: 'goods',
    retailPrice: '₩29,000',
    fit: '230 x 150mm',
    specs: '코튼 캔버스, 방수 코팅',
    description: '방송 준비 소품을 깔끔하게 수납할 수 있는 모노그램 파우치입니다.',
    gallery: buildGallery('Goods 03'),
  },
  {
    title: '라이트웨이트 트래블 머그',
    category: 'goods',
    retailPrice: '₩22,000',
    fit: '350ml',
    specs: '이중 구조 스테인리스, 실리콘 리드',
    description: '이동 중에도 보온·보냉이 유지되는 경량 머그. 스튜디오 스태프 필수템입니다.',
    gallery: buildGallery('Goods 04'),
  },
  {
    title: '그래픽 코튼 토트',
    category: 'goods',
    retailPrice: '₩26,000',
    fit: '380 x 420mm',
    specs: '유기농 면 100%',
    description: 'LUCE 시그니처 그래픽이 들어간 코튼 토트백. 사은품 구성으로 제격입니다.',
    gallery: buildGallery('Goods 05'),
  },
];

function generatePhone(seed) {
  const mid = String(1000 + (seed % 9000)).padStart(4, '0');
  const tail = String(2000 + ((seed * 7) % 9000)).padStart(4, '0');
  return `010-${mid}-${tail}`;
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (columns.some(item => item?.name === column)) {
    return;
  }

  await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function ensureTestSupplier() {
  const existing = await get(
    `SELECT id FROM signups WHERE type = 'supplier' AND LOWER(email) = LOWER(?) LIMIT 1`,
    [TEST_SUPPLIER_EMAIL]
  );

  if (existing?.id) {
    return existing.id;
  }

  const { hash, salt } = createPasswordHash(TEST_SUPPLIER_PASSWORD);

  const result = await run(
    `INSERT INTO signups (type, brand, phone, email, password_hash, password_salt, category, channel, experience, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'supplier',
      '테스트 공급업체',
      '010-0000-0000',
      TEST_SUPPLIER_EMAIL,
      hash,
      salt,
      'fashion',
      '테스트 계정',
      'pilot-ready',
      '샘플 데이터',
    ]
  );

  return result.lastID;
}

async function seedSuppliers() {
  await ensureTestSupplier();
  const categories = Array.from(VALID_CATEGORIES);
  const existingRows = await all(
    `SELECT LOWER(email) AS email FROM signups WHERE type = 'supplier'`
  );
  const existingEmails = new Set(existingRows.map(row => row.email));

  if (existingEmails.size >= SUPPLIER_TARGET) {
    return 0;
  }

  await run('BEGIN TRANSACTION');
  let inserted = 0;

  try {
    for (let i = 1; existingEmails.size < SUPPLIER_TARGET; i += 1) {
      const sequence = String(i).padStart(3, '0');
      const email = `supplier${sequence}@lookbook.app`;

      if (existingEmails.has(email)) {
        continue;
      }

      const brand = `루체 공급업체 ${sequence}`;
      const { hash, salt } = createPasswordHash(SAMPLE_SUPPLIER_PASSWORD);
      const phone = generatePhone(i);

      await run(
        `INSERT INTO signups (type, brand, phone, email, password_hash, password_salt, category, channel, experience, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'supplier',
          brand,
          phone,
          email,
          hash,
          salt,
          categories[(i - 1) % categories.length],
          '파일럿 전용 업로드',
          'pilot-ready',
          '샘플 데이터',
        ]
      );
      existingEmails.add(email);
      inserted += 1;
    }

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => null);
    throw error;
  }

  return inserted;
}

async function seedSellers() {
  const channels = ['네이버 쇼핑라이브', '카카오 쇼핑라이브', '틱톡', '자체몰'];
  const experiences = ['none', '1-5', '6-10', '10+'];
  await run('BEGIN TRANSACTION');
  let inserted = 0;

  try {
    for (let i = 1; i <= SELLER_TARGET; i += 1) {
      const sequence = String(i).padStart(4, '0');
      const email = `seller${sequence}@lookbook.app`;
      const existing = await get(
        `SELECT id FROM signups WHERE type = 'seller' AND email = ?`,
        [email]
      );

      if (existing) {
        continue;
      }

      const brand = `셀러 파트너 ${sequence}`;
      const { hash, salt } = createPasswordHash(SAMPLE_SELLER_PASSWORD);
      const phone = generatePhone(SELLER_TARGET + i);
      const channel = channels[(i - 1) % channels.length];
      const experience = experiences[(i - 1) % experiences.length];

      await run(
        `INSERT INTO signups (type, brand, phone, email, password_hash, password_salt, category, channel, experience, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'seller',
          brand,
          phone,
          email,
          hash,
          salt,
          null,
          channel,
          experience,
          '샘플 데이터',
        ]
      );
      inserted += 1;
    }

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => null);
    throw error;
  }

  return inserted;
}

async function seedMembers() {
  const interests = Array.from(VALID_CATEGORIES);
  await run('BEGIN TRANSACTION');
  let inserted = 0;

  try {
    for (let i = 1; i <= MEMBER_TARGET; i += 1) {
      const sequence = String(i).padStart(4, '0');
      const email = `member${sequence}@lookbook.app`;
      const existing = await get(
        `SELECT id FROM signups WHERE type = 'member' AND email = ?`,
        [email]
      );

      if (existing) {
        continue;
      }

      const brand = `루체 팬 ${sequence}`;
      const { hash, salt } = createPasswordHash(SAMPLE_MEMBER_PASSWORD);
      const phone = generatePhone(MEMBER_TARGET + i);
      const category = interests[(i - 1) % interests.length];

      await run(
        `INSERT INTO signups (type, brand, phone, email, password_hash, password_salt, category, channel, experience, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'member',
          brand,
          phone,
          email,
          hash,
          salt,
          category,
          null,
          null,
          '샘플 데이터',
        ]
      );
      inserted += 1;
    }

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => null);
    throw error;
  }

  return inserted;
}

async function seedSampleProducts() {
  const suppliers = await all(
    `SELECT id FROM signups WHERE type = 'supplier' ORDER BY id LIMIT ?`,
    [SUPPLIER_TARGET]
  );

  if (!suppliers.length) {
    return 0;
  }

  let inserted = 0;

  for (let i = 0; i < SAMPLE_PRODUCTS.length; i += 1) {
    const product = SAMPLE_PRODUCTS[i];
    const existing = await get(
      `SELECT id, gallery FROM products WHERE title = ? AND category = ?`,
      [product.title, product.category]
    );

    const gallery = Array.isArray(product.gallery) ? product.gallery : [];
    const primaryImage = gallery[0] || createImageUrl(`${product.title} - Thumbnail`);

    if (existing) {
      const currentGallery = parseGallery(existing.gallery);
      if (currentGallery.length < gallery.length) {
        await run(
          `UPDATE products SET primary_image = ?, gallery = ? WHERE id = ?`,
          [primaryImage, JSON.stringify(gallery), existing.id]
        );
      }
      continue;
    }

    const supplier = suppliers[i % suppliers.length];

    await run(
      `INSERT INTO products (supplier_id, title, category, retail_price, fit, specs, description, primary_image, gallery)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplier.id,
        product.title,
        product.category,
        product.retailPrice,
        product.fit,
        product.specs,
        product.description,
        primaryImage,
        JSON.stringify(gallery),
      ]
    );
    inserted += 1;
  }

  return inserted;
}

async function seedSampleData() {
  await seedSuppliers();
  await seedSellers();
  await seedMembers();
  await seedSampleProducts();
}

async function initializeDatabase() {
  await run(
    `CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      brand TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT,
      password_salt TEXT,
      category TEXT,
      channel TEXT,
      experience TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
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

  await ensureColumn('signups', 'password_hash', 'TEXT');
  await ensureColumn('signups', 'password_salt', 'TEXT');

  await seedSampleData();
}

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
  const {
    type,
    brand,
    phone,
    email,
    password,
    category = null,
    channel = null,
    experience = null,
    notes = null,
  } = req.body || {};

  const normalizedType = typeof type === 'string' ? type.trim() : '';
  const normalizedBrand = typeof brand === 'string' ? brand.trim() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalizedType || !normalizedBrand || !normalizedPhone || !normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  if (!SIGNUP_TYPES.has(normalizedType)) {
    return res.status(400).json({ error: '유효하지 않은 가입 유형입니다.' });
  }

  if (normalizedPassword.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상으로 설정해주세요.' });
  }

  db.get(
    `SELECT id FROM signups WHERE type = ? AND LOWER(email) = LOWER(?) LIMIT 1`,
    [normalizedType, normalizedEmail],
    (lookupErr, existing) => {
      if (lookupErr) {
        console.error('Signup lookup error', lookupErr);
        return res.status(500).json({ error: '신청 저장 중 오류가 발생했습니다.' });
      }

      if (existing) {
        return res.status(409).json({ error: '이미 등록된 이메일입니다.' });
      }

      const { hash, salt } = createPasswordHash(normalizedPassword);

      db.run(
        `INSERT INTO signups (type, brand, phone, email, password_hash, password_salt, category, channel, experience, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedType,
          normalizedBrand,
          normalizedPhone,
          normalizedEmail,
          hash,
          salt,
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
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ error: '이메일과 비밀번호를 모두 입력해주세요.' });
  }

  db.get(
    `SELECT id, brand, phone, email, password_hash AS passwordHash, password_salt AS passwordSalt
       FROM signups
      WHERE type = 'supplier' AND LOWER(email) = LOWER(?)`,
    [normalizedEmail],
    (err, supplier) => {
      if (err) {
        console.error('Supplier login lookup error', err);
        return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
      }

      if (!supplier || !verifyPassword(normalizedPassword, supplier.passwordSalt, supplier.passwordHash)) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
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
  db.all(
    `SELECT id, type, brand, phone, email, category, channel, experience, notes, created_at
       FROM signups
      ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) {
        console.error('DB select error', err);
        return res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
      }

      res.json(rows);
    }
  );
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

let serverInstance = null;

initializeDatabase()
  .then(() => {
    serverInstance = app.listen(PORT, () => {
      console.log(`LUCE lookbook server running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });

const shutdown = signal => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  const finalize = () => {
    db.close();
    process.exit(0);
  };

  if (serverInstance) {
    serverInstance.close(finalize);
  } else {
    finalize();
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
