const path = require('path');
const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
let server = null;

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function dbGet(sql, params = []) {
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

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

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
      password_hash TEXT,
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
const DEFAULT_SUPPLIER_COUNT = 100;
const DEFAULT_SELLER_COUNT = 1000;
const DEFAULT_MEMBER_COUNT = 2000;
const DEMO_SUPPLIER_EMAIL = 'demo-supplier@luce.app';
const DEMO_SUPPLIER_PASSWORD = 'luce1234';

let cachedSeedPasswordHash = null;

const SAMPLE_PRODUCTS = [
  {
    title: '모노 클래식 테일러드 자켓',
    category: 'fashion',
    retailPrice: '₩139,000',
    fit: 'FREE (44-66)',
    specs: '소재: 울 40%, 폴리 60% · 안감 있음',
    description: '루체 시그니처 패턴을 담은 테일러드 자켓으로 셀러 방송 메인룩에 최적화된 실루엣입니다.',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '루체 플리츠 미디 스커트',
    category: 'fashion',
    retailPrice: '₩89,000',
    fit: 'S, M, L',
    specs: '소재: 폴리 100% · 뒷밴딩 · 안감 있음',
    description: '무광 블랙 플리츠가 선사하는 고급스러운 드레이핑으로 셀러 룩북의 베스트 아이템입니다.',
    images: [
      'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1509411603548-4b1b2a3c1c58?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512412046876-f38535317ac7?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '시그니처 스트랩 셔츠 드레스',
    category: 'fashion',
    retailPrice: '₩119,000',
    fit: 'FREE (44-66반)',
    specs: '소재: 면 65%, 나일론 35% · 허리벨트 포함',
    description: '방송에서 움직임이 돋보이는 셔츠 드레스로, 허리 스트랩으로 다양한 실루엣을 연출할 수 있습니다.',
    images: [
      'https://images.unsplash.com/photo-1524504388940-0f24f2b1a4b8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511288591221-514fef1bfbf9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511295742368-f5f34d25c417?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503342452485-86f0cd1646eb?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '블랙 레이어드 니트 세트',
    category: 'fashion',
    retailPrice: '₩79,000',
    fit: 'FREE (44-66)',
    specs: '소재: 비스코스 52%, 폴리 26%, 나일론 22%',
    description: '탑과 가디건이 함께 구성된 블랙 니트 세트로, 라이브 방송에서 다양한 스타일링이 가능합니다.',
    images: [
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503342394128-c104d54d6939?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1542293787938-4d2226c9a3c0?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '라운지 소프트 코튼 셋업',
    category: 'fashion',
    retailPrice: '₩98,000',
    fit: 'S, M, L',
    specs: '소재: 코튼 80%, 스판 20% · 기모 안감',
    description: '스튜디오 대기와 방송 모두 소화 가능한 편안한 코튼 셋업으로, 시즈널 컬렉션의 하이라이트입니다.',
    images: [
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1539109135190-8db897c131ae?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '시어 루미너스 세럼',
    category: 'beauty',
    retailPrice: '₩49,000',
    fit: '30ml',
    specs: '주성분: 나이아신아마이드 5%, 히알루론산 7중 복합',
    description: '투명한 광채를 연출하는 고보습 세럼으로 방송 전 피부 컨디셔닝용으로 사랑받는 제품입니다.',
    images: [
      'https://images.unsplash.com/photo-1585386959984-a4155228ef44?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1612810806695-30ba5f068ee1?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1616394584738-0c39f1da5c37?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505575967455-40e256f73376?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '미드나잇 톤업 크림',
    category: 'beauty',
    retailPrice: '₩32,000',
    fit: '50ml',
    specs: '주성분: 글루타티온, 시어버터, 비타민C 유도체',
    description: '한 톤 밝혀주는 수분 텍스처 크림으로, 방송 직전 톤 보정에 특화된 아이템입니다.',
    images: [
      'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '글로우 핏 쿠션 파운데이션',
    category: 'beauty',
    retailPrice: '₩37,000',
    fit: 'SPF 35 / PA+++ · 21호 & 23호',
    specs: '커버력: 중상 · 지속력: 12시간',
    description: '빛 반사에 강한 세미 글로우 쿠션으로, 라이브 촬영 조명 아래에서 자연스러운 피부 표현을 완성합니다.',
    images: [
      'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1611078489935-0cb964de46d8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1521570140871-84fb4b0548fa?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '실버 라인 아이라이너 키트',
    category: 'beauty',
    retailPrice: '₩22,000',
    fit: '펜슬 + 리퀴드 2종',
    specs: '컬러: 블랙, 실버 글리터 · 워터프루프',
    description: '방송에서 포인트를 살리는 아이라이너 키트로, 빠른 터치에도 번짐 없이 유지됩니다.',
    images: [
      'https://images.unsplash.com/photo-1580136608770-1e446a06b7f3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1611078489935-0cb964de46d8?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '스칼프 밸런싱 헤어미스트',
    category: 'beauty',
    retailPrice: '₩29,000',
    fit: '100ml',
    specs: '주성분: 티트리, 판테놀, 비오틴',
    description: '장시간 촬영에도 두피를 산뜻하게 유지해주는 미스트로, 셀러 준비 공간에서 필수 아이템입니다.',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524504388940-0f24f2b1a4b8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1616394584738-0c39f1da5c37?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '바이탈 프로틴 스틱 5종 세트',
    category: 'wellness',
    retailPrice: '₩34,000',
    fit: '20g x 10포',
    specs: '주성분: 완두단백, 콜라겐, 비타민B 컴플렉스',
    description: '방송 전후 에너지 보충을 돕는 단백질 스틱으로, 휴대가 간편해 셀러와 스태프가 즐겨 찾습니다.',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524592094714-0d9c0f6c3564?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1572448862528-307cd2f9e914?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1582719478250-5cfc35a15158?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '발란스업 이너뷰티 젤리',
    category: 'wellness',
    retailPrice: '₩27,000',
    fit: '15g x 14포',
    specs: '주성분: 히비스커스, 비타민C, 피쉬콜라겐',
    description: '촬영 당일 컨디션을 끌어올리는 이너뷰티 젤리로, 상큼한 풍미와 가벼운 제형이 특징입니다.',
    images: [
      'https://images.unsplash.com/photo-1536514498073-50e69d39c6cb?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1542444459-db06b78b1c00?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551970634-747846a548cb?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '그레이인 커피 프로틴 쉐이크',
    category: 'wellness',
    retailPrice: '₩39,000',
    fit: '45g x 7포',
    specs: '주성분: 유청단백, MCT 오일, 카카오닙스',
    description: '방송 준비로 바쁜 스태프가 즐겨 찾는 커피맛 프로틴 쉐이크로, 포만감과 집중력을 동시에 제공합니다.',
    images: [
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '하이포커스 멀티비타민',
    category: 'wellness',
    retailPrice: '₩25,000',
    fit: '60정 / 30일 분량',
    specs: '주성분: 비타민B군, 아연, 마그네슘',
    description: '라이브 커머스 일정에 맞춘 멀티비타민으로, 집중력과 회복력을 동시에 잡은 포뮬러입니다.',
    images: [
      'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1532635241-17e820acc59f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1582719478250-ff84a17b7a5b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1582719478250-3ee3d9fc1c2e?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '리커버리 데이티 플랜',
    category: 'wellness',
    retailPrice: '₩31,000',
    fit: '30포 / 2주 프로그램',
    specs: '주성분: L-테아닌, 로즈힙, 감태',
    description: '연속 방송 일정 후 회복을 돕는 데이티 플랜으로, 스튜디오 셀렉션 사전 안내 자료로 활용됩니다.',
    images: [
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1536514498073-50e69d39c6cb?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524592094714-0d9c0f6c3564?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '프리미엄 레더 토트백',
    category: 'goods',
    retailPrice: '₩158,000',
    fit: '가로 34cm · 세로 28cm · 폭 12cm',
    specs: '소재: 이태리 베지터블 가죽 · 내부 포켓 3칸',
    description: '도심 라이브 이동에 최적화된 클래식 토트백으로, 카메라와 소품을 안전하게 수납할 수 있습니다.',
    images: [
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522312346375-43c2e88be3e0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '시그니처 실버 이어커프 세트',
    category: 'goods',
    retailPrice: '₩46,000',
    fit: '이어커프 3종 세트',
    specs: '소재: 925 실버 · 니켈프리 코팅',
    description: '촬영 조명에서도 반짝이는 실버 이어커프로, 방송 스타일링에 빠르게 포인트를 줄 수 있습니다.',
    images: [
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524504388940-0f24f2b1a4b8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512412046876-f38535317ac7?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '루체 모듈러 액세서리 박스',
    category: 'goods',
    retailPrice: '₩28,000',
    fit: '4단 모듈러 · 자석 잠금',
    specs: '소재: ABS, 자석 · 구성: 트레이 4개',
    description: '셀렉션에서 고른 액세서리를 카테고리별로 정리할 수 있는 모듈러 박스로, 스튜디오 준비 동선을 줄여줍니다.',
    images: [
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '모듈라 스튜디오 조명 세트',
    category: 'goods',
    retailPrice: '₩189,000',
    fit: 'LED 라이트 2ea + 삼각대',
    specs: '밝기: 최대 4800lm · 색온도: 3200K~5600K',
    description: '셀러 라이브 연습과 촬영에 사용되는 이동형 조명 세트로, 빠르게 세팅 가능한 경량 구성이 강점입니다.',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '블랙 스튜디오 플래너',
    category: 'goods',
    retailPrice: '₩19,000',
    fit: 'A5 사이즈 · 120p',
    specs: '구성: 일정, 체크리스트, 방송 회고 페이지',
    description: '스튜디오 준비 과정을 기록할 수 있는 플래너로, 체크리스트 연동에 맞춘 전용 서식이 수록되어 있습니다.',
    images: [
      'https://images.unsplash.com/photo-1512412046876-f38535317ac7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '셀러 프레젠테이션 보드',
    category: 'goods',
    retailPrice: '₩24,000',
    fit: '자석형 · 45 x 60cm',
    specs: '구성: 자석 카드 12장, 마커 2개, 보드 이레이저',
    description: '라이브 시나리오와 상품 포인트를 한눈에 정리할 수 있는 자석형 보드로, 셀렉션 준비 시간을 줄여줍니다.',
    images: [
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1488722796624-0aa6f1bb6399?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1454166155302-ef4863c27e70?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    title: '루체 방송용 소품 키트',
    category: 'goods',
    retailPrice: '₩42,000',
    fit: '구성: 장갑, 테이프, 스티커, 패브릭 시트',
    specs: '스튜디오 전용 맞춤 소품 세트',
    description: '방송 테이블 연출에 필요한 필수 소품을 모은 키트로, 매 방송 동일 퀄리티를 유지할 수 있게 도와줍니다.',
    images: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1482449479593-36e690c2232c?auto=format&fit=crop&w=900&q=80',
    ],
  },
];

function getSeedPasswordHash() {
  if (!cachedSeedPasswordHash) {
    cachedSeedPasswordHash = bcrypt.hashSync(DEMO_SUPPLIER_PASSWORD, 10);
  }

  return cachedSeedPasswordHash;
}

async function ensurePasswordColumn() {
  try {
    const columns = await dbAll('PRAGMA table_info(signups)');
    const hasPasswordColumn = Array.isArray(columns)
      ? columns.some(column => column?.name === 'password_hash')
      : false;

    if (!hasPasswordColumn) {
      await dbRun('ALTER TABLE signups ADD COLUMN password_hash TEXT');
    }
  } catch (error) {
    console.error('Failed to ensure password column on signups table', error);
    throw error;
  }
}

function supplierSeedGenerator(sequence) {
  const padded = String(sequence).padStart(3, '0');
  const categories = ['fashion', 'beauty', 'wellness', 'goods'];
  const category = categories[(sequence - 1) % categories.length];

  return {
    brand: `공급업체 ${padded}`,
    phone: `010-${String(2000 + ((sequence * 13) % 8000)).padStart(4, '0')}-${String(7000 + ((sequence * 17) % 9000)).padStart(4, '0')}`,
    email: `supplier${padded}@demo.luce`,
    category,
    channel: `https://supplier${padded}.luce-demo.kr`,
    experience: '파일럿 파트너',
    notes: '시연용 자동 생성 계정입니다.',
  };
}

function sellerSeedGenerator(sequence) {
  const padded = String(sequence).padStart(4, '0');
  const channels = ['네이버 쇼핑라이브', '카카오 쇼핑라이브', '틱톡', '자체몰', '기타'];
  const experiences = ['none', '1-5', '6-10', '10+'];

  return {
    brand: `셀러 ${padded}`,
    phone: `010-${String(3200 + ((sequence * 23) % 6000)).padStart(4, '0')}-${String(4100 + ((sequence * 19) % 5000)).padStart(4, '0')}`,
    email: `seller${padded}@demo.luce`,
    channel: channels[(sequence - 1) % channels.length],
    experience: experiences[(sequence - 1) % experiences.length],
    notes: '셀렉션 테스트용 더미 데이터입니다.',
  };
}

function memberSeedGenerator(sequence) {
  const padded = String(sequence).padStart(4, '0');
  const categories = ['fashion', 'beauty', 'wellness', 'goods', ''];

  return {
    brand: `일반회원 ${padded}`,
    phone: `010-${String(5200 + ((sequence * 7) % 4000)).padStart(4, '0')}-${String(6100 + ((sequence * 11) % 6000)).padStart(4, '0')}`,
    email: `member${padded}@demo.luce`,
    category: categories[(sequence - 1) % categories.length] || null,
    notes: '라이브 커머스 소식 구독용 자동 생성 멤버입니다.',
  };
}

async function ensureDemoSupplierAccount() {
  const passwordHash = getSeedPasswordHash();
  const existing = await dbGet(
    `SELECT id FROM signups WHERE type = 'supplier' AND LOWER(email) = LOWER(?)`,
    [DEMO_SUPPLIER_EMAIL]
  );

  if (existing) {
    await dbRun(
      `UPDATE signups
          SET brand = ?, phone = ?, category = ?, channel = ?, experience = ?, notes = ?, password_hash = ?
        WHERE id = ?`,
      [
        'LUCE 데모 공급업체',
        '010-0000-0001',
        'fashion',
        'https://vivaruby.co.kr/',
        '10+',
        '데모 계정입니다. 로그인 테스트용으로 제공됩니다.',
        passwordHash,
        existing.id,
      ]
    );
    return existing.id;
  }

  const result = await dbRun(
    `INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'supplier',
      'LUCE 데모 공급업체',
      '010-0000-0001',
      DEMO_SUPPLIER_EMAIL,
      'fashion',
      'https://vivaruby.co.kr/',
      '10+',
      '데모 계정입니다. 로그인 테스트용으로 제공됩니다.',
      passwordHash,
    ]
  );

  return result.lastID;
}

async function ensureSignupCount(type, target, generator) {
  const row = await dbGet('SELECT COUNT(*) AS count FROM signups WHERE type = ?', [type]);
  const existing = row?.count ? Number(row.count) : 0;

  if (existing >= target) {
    return;
  }

  const needed = target - existing;
  for (let i = 0; i < needed; i += 1) {
    const sequence = existing + i + 1;
    const record = generator(sequence);
    const passwordHash =
      typeof record.password === 'string' && record.password.length
        ? bcrypt.hashSync(String(record.password), 10)
        : getSeedPasswordHash();

    await dbRun(
      `INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        record.brand,
        record.phone,
        record.email.toLowerCase(),
        record.category || null,
        record.channel || null,
        record.experience || null,
        record.notes || null,
        passwordHash,
      ]
    );
  }
}

async function ensureSampleProducts(demoSupplierId) {
  const supplierRows = await dbAll(
    `SELECT id FROM signups WHERE type = 'supplier' ORDER BY id ASC LIMIT 5`
  );
  const supplierIds = supplierRows.map(row => row.id);

  if (!supplierIds.length && demoSupplierId) {
    supplierIds.push(demoSupplierId);
  }

  if (!supplierIds.length) {
    return;
  }

  for (let i = 0; i < SAMPLE_PRODUCTS.length; i += 1) {
    const product = SAMPLE_PRODUCTS[i];
    const existing = await dbGet('SELECT id FROM products WHERE title = ?', [product.title]);
    if (existing) {
      continue;
    }

    const supplierId = supplierIds[i % supplierIds.length];
    await dbRun(
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

async function seedDemoData() {
  let demoSupplierId = null;

  try {
    demoSupplierId = await ensureDemoSupplierAccount();
  } catch (error) {
    console.error('Failed to ensure demo supplier account', error);
  }

  try {
    await ensureSignupCount('supplier', DEFAULT_SUPPLIER_COUNT, supplierSeedGenerator);
  } catch (error) {
    console.error('Failed to seed supplier accounts', error);
  }

  try {
    await ensureSignupCount('seller', DEFAULT_SELLER_COUNT, sellerSeedGenerator);
  } catch (error) {
    console.error('Failed to seed seller accounts', error);
  }

  try {
    await ensureSignupCount('member', DEFAULT_MEMBER_COUNT, memberSeedGenerator);
  } catch (error) {
    console.error('Failed to seed member accounts', error);
  }

  try {
    await ensureSampleProducts(demoSupplierId);
  } catch (error) {
    console.error('Failed to seed sample products', error);
  }
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

app.post('/api/signup', async (req, res) => {
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
  const passwordValue = typeof password === 'string' ? password : '';

  if (!normalizedType || !normalizedBrand || !normalizedPhone || !normalizedEmail || !passwordValue) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  if (!SIGNUP_TYPES.has(normalizedType)) {
    return res.status(400).json({ error: '유효하지 않은 가입 유형입니다.' });
  }

  if (passwordValue.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상 입력해주세요.' });
  }

  const normalizedCategory = category ? String(category).trim() : null;
  const normalizedChannel = channel ? String(channel).trim() : null;
  const normalizedExperience = experience ? String(experience).trim() : null;
  const normalizedNotes = notes ? String(notes).trim() : null;

  try {
    const passwordHash = await bcrypt.hash(passwordValue, 10);
    const result = await dbRun(
      `INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedType,
        normalizedBrand,
        normalizedPhone,
        normalizedEmail,
        normalizedCategory || null,
        normalizedChannel || null,
        normalizedExperience || null,
        normalizedNotes || null,
        passwordHash,
      ]
    );

    return res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error('DB insert error', error);
    return res.status(500).json({ error: '신청 저장 중 오류가 발생했습니다.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const passwordValue = typeof password === 'string' ? password : '';

  if (!normalizedEmail || !passwordValue) {
    return res.status(400).json({ error: '이메일과 비밀번호를 모두 입력해주세요.' });
  }

  try {
    const supplier = await dbGet(
      `SELECT id, brand, phone, email, password_hash AS passwordHash
         FROM signups
        WHERE type = 'supplier' AND LOWER(email) = ?`,
      [normalizedEmail]
    );

    if (!supplier?.passwordHash) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(passwordValue, supplier.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const token = createSupplierSession(supplier);
    const sessionRecord = sessions.get(token);
    if (!sessionRecord) {
      sessions.delete(token);
      return res.status(500).json({ error: '세션 생성에 실패했습니다.' });
    }

    setSessionCookie(res, token);
    return res.json({ supplier: getSupplierPayload(sessionRecord) });
  } catch (error) {
    console.error('Supplier login lookup error', error);
    return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
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

async function bootstrap() {
  try {
    await ensurePasswordColumn();
  } catch (error) {
    console.error('Startup migration failed', error);
  }

  try {
    await seedDemoData();
  } catch (error) {
    console.error('Startup seeding failed', error);
  }

  server = app.listen(PORT, () => {
    console.log(`LUCE lookbook server running on http://localhost:${PORT}`);
  });
}

bootstrap();

const shutdown = signal => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);

  const closeServer = () => {
    db.close();
    process.exit(0);
  };

  if (server) {
    server.close(closeServer);
  } else {
    closeServer();
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
