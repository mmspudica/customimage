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

const PASSWORD_ITERATIONS = 15000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = 'sha512';
const DEFAULT_LEGACY_PASSWORD = 'luce1234!';

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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString('hex');
  return `${salt}:${PASSWORD_ITERATIONS}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') {
    return false;
  }

  const [salt, iterationsValue, hash] = stored.split(':');
  if (!salt || !iterationsValue || !hash) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  try {
    const derived = crypto
      .pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
      .toString('hex');

    const storedBuffer = Buffer.from(hash, 'hex');
    const derivedBuffer = Buffer.from(derived, 'hex');

    if (storedBuffer.length !== derivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, derivedBuffer);
  } catch (error) {
    return false;
  }
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function ensureSignupPasswordColumn(callback) {
  db.all('PRAGMA table_info(signups)', (err, columns) => {
    if (err) {
      callback(err);
      return;
    }

    const hasPasswordColumn = Array.isArray(columns)
      ? columns.some(column => column.name === 'password_hash')
      : false;

    if (hasPasswordColumn) {
      callback(null);
      return;
    }

    db.run('ALTER TABLE signups ADD COLUMN password_hash TEXT', callback);
  });
}

function backfillMissingPasswords(callback) {
  db.all("SELECT id FROM signups WHERE password_hash IS NULL OR TRIM(password_hash) = ''", (err, rows) => {
    if (err) {
      callback(err);
      return;
    }

    if (!rows || rows.length === 0) {
      callback(null);
      return;
    }

    const placeholder = hashPassword(DEFAULT_LEGACY_PASSWORD);
    const stmt = db.prepare('UPDATE signups SET password_hash = ? WHERE id = ?');
    rows.forEach(row => {
      stmt.run(placeholder, row.id);
    });
    stmt.finalize(finalizeErr => {
      if (finalizeErr) {
        callback(finalizeErr);
        return;
      }
      callback(null);
    });
  });
}

function buildImageSet(query, baseSig) {
  const encodedQuery = encodeURIComponent(query);
  return Array.from({ length: 5 }, (_unused, index) =>
    `https://source.unsplash.com/800x1200/?${encodedQuery}&sig=${baseSig + index}`
  );
}

const FEATURED_SUPPLIERS = [
  {
    brand: '루체 아틀리에',
    phone: '02-100-1100',
    email: 'atelier@luce.app',
    category: 'fashion',
    channel: 'https://instagram.com/luceatelier',
    experience: null,
    notes: '미니멀 실루엣과 소재감을 강조하는 시그니처 라인',
    password: 'atelier123!',
  },
  {
    brand: '모노데이 라인',
    phone: '02-200-2200',
    email: 'monoday@luce.app',
    category: 'fashion',
    channel: 'https://monoday.co.kr',
    experience: null,
    notes: '셋업과 테일러드 아이템에 특화된 도매 셀렉션',
    password: 'monoday123!',
  },
  {
    brand: '글로우랩 뷰티',
    phone: '02-300-3300',
    email: 'glow@luce.app',
    category: 'beauty',
    channel: 'https://instagram.com/glowlab',
    experience: null,
    notes: '비건 기반 스킨케어와 색조 라인을 운영',
    password: 'glowlab123!',
  },
  {
    brand: '누트라셀',
    phone: '02-400-4400',
    email: 'nutra@luce.app',
    category: 'wellness',
    channel: 'https://nutracell.kr',
    experience: null,
    notes: '건기식 OEM 파트너와 협력한 프리미엄 라인',
    password: 'nutracell123!',
  },
  {
    brand: '모던 오브제',
    phone: '02-500-5500',
    email: 'object@luce.app',
    category: 'goods',
    channel: 'https://instagram.com/modernobject',
    experience: null,
    notes: '잡화와 라이프스타일 소품을 큐레이션하는 셀렉샵',
    password: 'object123!',
  },
];

const SAMPLE_PRODUCTS = [
  {
    title: '소프트 플리츠 실크 블라우스',
    category: 'fashion',
    retailPrice: '₩129,000',
    fit: 'FREE · 세미 오버핏 실루엣',
    specs: '어깨 38cm · 가슴 52cm · 총장 62cm · 실크 70% · 레이온 30%',
    description: '은은한 광택과 풍부한 드레이프로 데일리 룩과 방송 룩 모두에 어울리는 블라우스.',
    supplierEmail: 'atelier@luce.app',
    images: buildImageSet('fashion outfit', 0),
  },
  {
    title: '모노 테일러드 롱 트렌치',
    category: 'fashion',
    retailPrice: '₩189,000',
    fit: 'S · M · L / 레귤러 핏',
    specs: '어깨 40cm · 총장 116cm · 폴리 78% · 레이온 22%',
    description: '워터프루프 가공과 더블 버튼 디테일로 간절기 필수 아이템인 클래식 트렌치.',
    supplierEmail: 'monoday@luce.app',
    images: buildImageSet('fashion trench coat', 10),
  },
  {
    title: '듀얼 톤 리넨 수트셋',
    category: 'fashion',
    retailPrice: '₩239,000',
    fit: '자켓 S-XL · 팬츠 26-30',
    specs: '리넨 55% · 코튼 45% · 자켓 소매 60cm · 팬츠 총장 98cm',
    description: '여름 라이브 커머스에서 활용도 높은 통기성 좋은 리넨 셋업.',
    supplierEmail: 'monoday@luce.app',
    images: buildImageSet('fashion linen suit', 20),
  },
  {
    title: '라이트 무드 니트 투피스',
    category: 'fashion',
    retailPrice: '₩99,000',
    fit: 'FREE · 슬림 핏',
    specs: '상의 총장 52cm · 하의 총장 78cm · 비스코스 65% · 나일론 35%',
    description: '실내외 온도 차에 대응하는 가벼운 니트 소재로 셀러 룩북 촬영용으로 추천.',
    supplierEmail: 'atelier@luce.app',
    images: buildImageSet('fashion knit set', 30),
  },
  {
    title: '네오 스트리트 데님 자켓',
    category: 'fashion',
    retailPrice: '₩119,000',
    fit: 'S · M · L / 루즈 핏',
    specs: '청중량 12oz · 총장 64cm · 소매 61cm · 코튼 100%',
    description: '워싱과 절개 디테일로 포인트를 준 스트리트 감성의 데님 아우터.',
    supplierEmail: 'monoday@luce.app',
    images: buildImageSet('fashion denim jacket', 40),
  },
  {
    title: '글로우 리페어 세럼',
    category: 'beauty',
    retailPrice: '₩42,000',
    fit: '30ml · 전 피부 타입',
    specs: '나이아신아마이드 5% · 비타민C 유도체 3% · 피부 자극 테스트 완료',
    description: '속건조를 잡아주는 부스터 세럼으로 방송 전 촉촉한 광을 연출합니다.',
    supplierEmail: 'glow@luce.app',
    images: buildImageSet('beauty skincare serum', 50),
  },
  {
    title: '벨벳 포커스 립 듀오',
    category: 'beauty',
    retailPrice: '₩28,000',
    fit: '매트 & 글로시 2종 세트',
    specs: '피부 저자극 테스트 완료 · 비건 포뮬라',
    description: '방송 조명에서도 선명하게 발색되는 트렌디한 MLBB 컬러 구성.',
    supplierEmail: 'glow@luce.app',
    images: buildImageSet('beauty makeup lipstick', 60),
  },
  {
    title: '모이스처 밸런스 크림',
    category: 'beauty',
    retailPrice: '₩36,000',
    fit: '50ml · 워터리 젤 텍스처',
    specs: '히알루론산 7중 복합체 · 판테놀 2%',
    description: '수분 장벽을 탄탄하게 채워주는 젤 크림으로 장시간 촬영에도 번들거림 없이 유지.',
    supplierEmail: 'glow@luce.app',
    images: buildImageSet('beauty moisturizer', 70),
  },
  {
    title: '아로마 딥 클렌징 밤',
    category: 'beauty',
    retailPrice: '₩32,000',
    fit: '90g · 오일-밤 제형',
    specs: '천연 오일 95% 함유 · 워터프루프 메이크업 제거',
    description: '향 균형이 좋은 아로마 블렌딩으로 홈케어 콘텐츠에 적합한 클렌징 밤.',
    supplierEmail: 'glow@luce.app',
    images: buildImageSet('beauty cleansing balm', 80),
  },
  {
    title: '스킨 루미너스 토너',
    category: 'beauty',
    retailPrice: '₩24,000',
    fit: '200ml · 약산성 포뮬라',
    specs: 'PHA 3% · 병풀 추출물 10%',
    description: '결 정리를 도와주는 토너로 셀러 데모 방송 전 피부 결을 매끄럽게 정돈.',
    supplierEmail: 'glow@luce.app',
    images: buildImageSet('beauty toner', 90),
  },
  {
    title: '데일리 밸런스 비타민 팩',
    category: 'wellness',
    retailPrice: '₩39,000',
    fit: '30포 · 하루 1포',
    specs: '비타민 C 1000mg · 아연 8.5mg · 국내 GMP 생산',
    description: '면역 케어에 집중한 필수 영양소 조합으로 스튜디오 협찬에 최적화된 패키지.',
    supplierEmail: 'nutra@luce.app',
    images: buildImageSet('supplement daily pack', 100),
  },
  {
    title: '플랜트 프로틴 파우더',
    category: 'wellness',
    retailPrice: '₩58,000',
    fit: '750g · 바닐라 & 카카오 블렌드',
    specs: '완두 단백질 20g · 설탕 무첨가 · 글루텐 프리',
    description: '채식 셀러와 홈트 콘텐츠에 어울리는 고단백 음료 베이스.',
    supplierEmail: 'nutra@luce.app',
    images: buildImageSet('protein powder vegan', 110),
  },
  {
    title: '이너 글로우 콜라겐 스틱',
    category: 'wellness',
    retailPrice: '₩44,000',
    fit: '30포 · 저분자 콜라겐',
    specs: '콜라겐 3,000mg · 비타민C 60mg 함유',
    description: '피부 탄력 케어용 이지 섭취 스틱으로 셀러가 간편하게 소개할 수 있습니다.',
    supplierEmail: 'nutra@luce.app',
    images: buildImageSet('collagen supplement stick', 120),
  },
  {
    title: '밤부 허브 디톡스 티',
    category: 'wellness',
    retailPrice: '₩26,000',
    fit: '티백 20입 · 무카페인',
    specs: '레몬밤 · 히비스커스 · 라벤더 블렌딩',
    description: '수분 대사를 돕는 허브 블렌딩으로 야간 방송 전후 컨텐츠에 활용도 높습니다.',
    supplierEmail: 'nutra@luce.app',
    images: buildImageSet('wellness herbal tea', 130),
  },
  {
    title: '프리바이오틱 유산균 캡슐',
    category: 'wellness',
    retailPrice: '₩52,000',
    fit: '60캡슐 · 2개월분',
    specs: '프로바이오틱스 10종 · 프리바이오틱스 150mg',
    description: '위산 코팅 공법으로 생존율을 높인 장 건강 특화 유산균.',
    supplierEmail: 'nutra@luce.app',
    images: buildImageSet('probiotic supplement', 140),
  },
  {
    title: '스톤 스트랩 레더 백',
    category: 'goods',
    retailPrice: '₩168,000',
    fit: '원사이즈 · 크로스 & 숄더 겸용',
    specs: '천연 소가죽 · 폭 10cm · 내부 포켓 2개',
    description: '버클과 스트랩 길이 조절로 다양한 스타일에 대응하는 스테디셀러 백.',
    supplierEmail: 'object@luce.app',
    images: buildImageSet('leather crossbody bag', 150),
  },
  {
    title: '모던 라인 크로노 워치',
    category: 'goods',
    retailPrice: '₩215,000',
    fit: '42mm · 스테인리스 밴드',
    specs: '50m 방수 · 사파이어 글라스 · 일본 미요타 무브먼트',
    description: '시크한 블랙 다이얼 포인트로 라이브 세트에서도 존재감 있는 워치.',
    supplierEmail: 'object@luce.app',
    images: buildImageSet('modern chronograph watch', 160),
  },
  {
    title: '아트웍 실버 이어링 세트',
    category: 'goods',
    retailPrice: '₩58,000',
    fit: '3종 세트 · 925 실버',
    specs: '니켈 프리 · 폴리싱 천 포함',
    description: '디자인이 다른 세 가지 이어링으로 방송 룩을 빠르게 변주할 수 있습니다.',
    supplierEmail: 'object@luce.app',
    images: buildImageSet('silver earrings set', 170),
  },
  {
    title: '캐시미어 블렌드 머플러',
    category: 'goods',
    retailPrice: '₩89,000',
    fit: '200 x 35cm · 경량 니트',
    specs: '울 70% · 캐시미어 30% · 드라이클리닝 권장',
    description: '톤온톤 컬러 구성으로 겨울 시즌 룩북 연출에 활용도 높은 머플러.',
    supplierEmail: 'object@luce.app',
    images: buildImageSet('cashmere scarf', 180),
  },
  {
    title: '소프트 스퀘어 로퍼',
    category: 'goods',
    retailPrice: '₩138,000',
    fit: '230-270mm · 5mm 인솔',
    specs: '천연 소가죽 · 논슬립 아웃솔 · 기본/스페셜 컬러 6종',
    description: '장시간 착용에도 편안한 쿠셔닝으로 셀러 촬영 및 라이브에 적합한 로퍼.',
    supplierEmail: 'object@luce.app',
    images: buildImageSet('minimal leather loafers', 190),
  },
];

const CATEGORY_ORDER = ['fashion', 'beauty', 'wellness', 'goods'];
const SELLER_CHANNELS = ['네이버 쇼핑라이브', '카카오 쇼핑라이브', '틱톡', '자체몰'];
const SELLER_EXPERIENCE = ['none', '1-5', '6-10', '10+'];

function buildSupplierSeed(position) {
  const sequence = String(position + 1).padStart(3, '0');
  const category = CATEGORY_ORDER[position % CATEGORY_ORDER.length];
  const first = String(7000 + position).padStart(4, '0');
  const second = String(2000 + (position * 17) % 8000).padStart(4, '0');
  return {
    brand: `루체 공급업체 ${sequence}`,
    phone: `010-${first}-${second}`,
    email: `supplier${sequence}@seed.luce.app`,
    category,
    channel: `https://supplier${sequence}.luce.app`,
    notes: 'LUCE 데모용 자동 생성 공급업체 데이터',
    password: `supplier${sequence}!`,
  };
}

function buildSellerSeed(position) {
  const sequence = String(position + 1).padStart(4, '0');
  const channel = SELLER_CHANNELS[position % SELLER_CHANNELS.length];
  const experience = SELLER_EXPERIENCE[position % SELLER_EXPERIENCE.length];
  const first = String(3000 + (position % 7000)).padStart(4, '0');
  const second = String(6000 + (position * 11) % 4000).padStart(4, '0');
  return {
    brand: `셀러 ${sequence}`,
    phone: `010-${first}-${second}`,
    email: `seller${sequence}@seed.luce.app`,
    channel,
    experience,
    notes: 'LUCE 데모용 자동 생성 셀러 데이터',
    password: `seller${sequence}!`,
  };
}

function buildMemberSeed(position) {
  const sequence = String(position + 1).padStart(4, '0');
  const category = CATEGORY_ORDER[position % CATEGORY_ORDER.length];
  const first = String(8000 + (position % 1000)).padStart(4, '0');
  const second = String(1000 + (position * 13) % 9000).padStart(4, '0');
  return {
    brand: `일반회원 ${sequence}`,
    phone: `010-${first}-${second}`,
    email: `member${sequence}@seed.luce.app`,
    category,
    notes: 'LUCE 업데이트 구독 신청',
    password: `member${sequence}!`,
  };
}

async function seedFeaturedSuppliers() {
  const supplierIdMap = {};

  for (const supplier of FEATURED_SUPPLIERS) {
    const hashedPassword = hashPassword(supplier.password);
    const existing = await getAsync(
      "SELECT id FROM signups WHERE type = 'supplier' AND email = ?",
      [supplier.email]
    );

    if (existing && existing.id) {
      await runAsync(
        `UPDATE signups
            SET brand = ?, phone = ?, category = ?, channel = ?, notes = ?, password_hash = ?
          WHERE id = ?`,
        [
          supplier.brand,
          supplier.phone,
          supplier.category,
          supplier.channel,
          supplier.notes,
          hashedPassword,
          existing.id,
        ]
      );
      supplierIdMap[supplier.email] = existing.id;
      continue;
    }

    const { lastID } = await runAsync(
      `INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'supplier',
        supplier.brand,
        supplier.phone,
        supplier.email,
        supplier.category,
        supplier.channel,
        supplier.experience,
        supplier.notes,
        hashedPassword,
      ]
    );
    supplierIdMap[supplier.email] = lastID;
  }

  return supplierIdMap;
}

async function seedGenericSignups(type, targetCount, builder) {
  const row = await getAsync('SELECT COUNT(*) AS count FROM signups WHERE type = ?', [type]);
  const existingCount = row && typeof row.count === 'number' ? row.count : Number(row?.count || 0);

  if (existingCount >= targetCount) {
    return existingCount;
  }

  for (let index = existingCount; index < targetCount; index += 1) {
    const seed = builder(index);
    const hashedPassword = hashPassword(seed.password);
    await runAsync(
      `INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        seed.brand,
        seed.phone,
        seed.email,
        seed.category || null,
        seed.channel || null,
        seed.experience || null,
        seed.notes || null,
        hashedPassword,
      ]
    );
  }

  return targetCount;
}

async function seedSampleProducts(supplierIdMap) {
  for (const product of SAMPLE_PRODUCTS) {
    const existing = await getAsync('SELECT id FROM products WHERE title = ?', [product.title]);
    if (existing && existing.id) {
      continue;
    }

    const supplierId = supplierIdMap[product.supplierEmail];
    if (!supplierId) {
      continue;
    }

    await runAsync(
      `INSERT INTO products (supplier_id, title, category, retail_price, fit, specs, description, primary_image, gallery)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplierId,
        product.title,
        product.category,
        product.retailPrice,
        product.fit,
        product.specs,
        product.description,
        product.images[0],
        JSON.stringify(product.images),
      ]
    );
  }
}

async function seedDatabase() {
  try {
    const supplierIdMap = await seedFeaturedSuppliers();
    await seedGenericSignups('supplier', 100, buildSupplierSeed);
    await seedGenericSignups('seller', 1000, buildSellerSeed);
    await seedGenericSignups('member', 2000, buildMemberSeed);
    await seedSampleProducts(supplierIdMap);
  } catch (error) {
    console.error('Database seed error', error);
  }
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
      password_hash TEXT,
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

  ensureSignupPasswordColumn(err => {
    if (err) {
      console.error('Failed to ensure password column', err);
      seedDatabase();
      return;
    }

    backfillMissingPasswords(backfillError => {
      if (backfillError) {
        console.error('Failed to backfill missing password hashes', backfillError);
      }
      seedDatabase();
    });
  });
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
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';
  const normalizedCategory = typeof category === 'string' && category.trim().length
    ? category.trim()
    : null;
  const normalizedChannel = typeof channel === 'string' && channel.trim().length ? channel.trim() : null;
  const normalizedExperience = typeof experience === 'string' && experience.trim().length
    ? experience.trim()
    : null;
  const normalizedNotes = typeof notes === 'string' && notes.trim().length ? notes.trim() : null;

  if (!normalizedType || !normalizedBrand || !normalizedPhone || !normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  if (!SIGNUP_TYPES.has(normalizedType)) {
    return res.status(400).json({ error: '유효하지 않은 가입 유형입니다.' });
  }

  if (normalizedCategory && !VALID_CATEGORIES.has(normalizedCategory)) {
    return res.status(400).json({ error: '지원하지 않는 카테고리입니다.' });
  }

  if (normalizedPassword.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상으로 설정해주세요.' });
  }

  const hashedPassword = hashPassword(normalizedPassword);

  db.run(
    'INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      normalizedType,
      normalizedBrand,
      normalizedPhone,
      normalizedEmail,
      normalizedCategory,
      normalizedChannel,
      normalizedExperience,
      normalizedNotes,
      hashedPassword,
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
  const { email, password } = req.body || {};

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ error: '이메일과 비밀번호를 모두 입력해주세요.' });
  }

  db.get(
    `SELECT id, brand, phone, email, password_hash
       FROM signups
      WHERE type = 'supplier' AND email = ?`,
    [normalizedEmail],
    (err, supplier) => {
      if (err) {
        console.error('Supplier login lookup error', err);
        return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
      }

      if (!supplier || !verifyPassword(normalizedPassword, supplier.password_hash)) {
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
