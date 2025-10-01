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
const PASSWORD_SALT = process.env.LUCE_PASSWORD_SALT || 'luce-demo-salt';
const DEFAULT_SEED_PASSWORD = 'SeedPass123!';

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

function hashPassword(password) {
  if (typeof password !== 'string' || !password.trim()) {
    return '';
  }

  return crypto.createHash('sha256').update(`${PASSWORD_SALT}:${password}`).digest('hex');
}

const DEFAULT_SEED_PASSWORD_HASH = hashPassword(DEFAULT_SEED_PASSWORD);

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

function ensureSignupPasswordColumn(callback) {
  db.all('PRAGMA table_info(signups)', (err, columns) => {
    if (err) {
      console.error('Failed to inspect signups table', err);
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    const hasPasswordColumn = Array.isArray(columns) && columns.some(column => column.name === 'password_hash');
    if (hasPasswordColumn) {
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    db.run('ALTER TABLE signups ADD COLUMN password_hash TEXT', alterErr => {
      if (alterErr) {
        console.error('Failed to add password_hash column', alterErr);
      }

      if (typeof callback === 'function') {
        callback();
      }
    });
  });
}

const SUPPLIER_SEED_TOTAL = 100;
const SELLER_SEED_TOTAL = 1000;
const MEMBER_SEED_TOTAL = 2000;

const SUPPLIER_CATEGORIES = ['fashion', 'beauty', 'wellness', 'goods'];
const SELLER_CHANNELS = ['네이버 쇼핑라이브', '카카오 쇼핑라이브', '틱톡', '자체몰', '기타'];
const SELLER_EXPERIENCE = ['none', '1-5', '6-10', '10+'];

const SAMPLE_PRODUCTS = [
  {
    supplierEmail: 'seed-supplier-001@luce.app',
    title: '블랙 테일러드 수트 세트',
    category: 'fashion',
    retailPrice: '₩129,000',
    fit: '세미 오버핏 · 44~77 추천',
    specs: '구성: 재킷+팬츠 · 소재: 울 60%, 폴리 40%',
    description: '스튜디오 촬영과 라이브에 최적화된 클래식 블랙 수트 세트입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520975918318-2e5c89421bb1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1525171254930-643fc658b64f?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-002@luce.app',
    title: '스모크 그레이 핸드메이드 코트',
    category: 'fashion',
    retailPrice: '₩189,000',
    fit: '클래식 핏 · 44~77 추천',
    specs: '소재: 울 80%, 캐시미어 10%, 나일론 10%',
    description: '부드러운 멜란지 텍스처가 돋보이는 시그니처 핸드메이드 코트입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521572363361-107fa21061d3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-003@luce.app',
    title: '크림 캐시미어 니트 세트',
    category: 'fashion',
    retailPrice: '₩149,000',
    fit: '릴렉스드 핏 · FREE 사이즈',
    specs: '구성: 니트 톱+스커트 · 소재: 캐시미어 20%, 울 40%, 나일론 40%',
    description: '데일리 룩과 홈웨어 모두 활용 가능한 부드러운 캐시미어 니트 세트입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529946825183-b49d4aa67c66?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-004@luce.app',
    title: '라이트 워시 데님 재킷',
    category: 'fashion',
    retailPrice: '₩98,000',
    fit: '레귤러 핏 · S/M/L',
    specs: '소재: 코튼 100% · YKK 메탈 지퍼 사용',
    description: '빈티지 라이트 워시가 매력적인 데님 재킷으로 시즌리스 아이템입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=800&q=80&sat=-10',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80&sat=-30',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80&sat=10',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80&sat=15',
    ],
  },
  {
    supplierEmail: 'seed-supplier-005@luce.app',
    title: '실버 새틴 슬립 드레스',
    category: 'fashion',
    retailPrice: '₩115,000',
    fit: '슬림 스트레이트 · 44~66 추천',
    specs: '소재: 폴리 새틴 100% · 안감 있음',
    description: '무광 실버 톤이 돋보이는 미니멀 새틴 슬립 드레스로 밤 라이브 연출에 적합합니다.',
    gallery: [
      'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80&sat=25',
      'https://images.unsplash.com/photo-1520975918318-2e5c89421bb1?auto=format&fit=crop&w=800&q=80&sat=10',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80&sat=-20',
      'https://images.unsplash.com/photo-1525171254930-643fc658b64f?auto=format&fit=crop&w=800&q=80&sat=-35',
    ],
  },
  {
    supplierEmail: 'seed-supplier-006@luce.app',
    title: '루미너스 글로우 세럼',
    category: 'beauty',
    retailPrice: '₩39,000',
    fit: '모든 피부 타입',
    specs: '주요성분: 비타민C 유도체, 나이아신아마이드, 저분자 히알루론산',
    description: '즉각적인 광채와 수분감을 선사하는 데일리 글로우 세럼입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506812574058-fc75fa93fead?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522337094840-5d44d07b3fd0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1530639836709-43c8db92c852?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-007@luce.app',
    title: '미네랄 무드 팔레트',
    category: 'beauty',
    retailPrice: '₩49,000',
    fit: '웜·쿨톤 겸용',
    specs: '구성: 섀도우 6종, 하이라이터 1종, 블러셔 1종',
    description: '데일리와 라이브 연출 모두 소화 가능한 미네랄 무드 팔레트입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80&sat=-20',
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80&blur=10',
    ],
  },
  {
    supplierEmail: 'seed-supplier-008@luce.app',
    title: '클린밤 멀티 클렌저',
    category: 'beauty',
    retailPrice: '₩27,000',
    fit: '모든 피부 타입',
    specs: '주요성분: 시어버터, 비타민E, 세라마이드',
    description: '메이크업과 피부 노폐물을 부드럽게 녹여내는 멀티 밤 타입 클렌저입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1586495985093-0fef08e5d0d1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80&sat=-35',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80&sat=35',
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80&sat=-10',
      'https://images.unsplash.com/photo-1526925539332-aa3b66e35444?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-009@luce.app',
    title: '시그니처 립 틴트 5종',
    category: 'beauty',
    retailPrice: '₩59,000',
    fit: '워터·무스 듀얼 텍스처',
    specs: '구성: 누드, 코랄, 레드, 로즈, 플럼',
    description: '도매 전용 단독 컬러웨이로 구성된 5종 립 틴트 세트입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80&hue=10',
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80&sat=25',
      'https://images.unsplash.com/photo-1506919258185-6078a8efc118?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1573497491208-6b1acb260507?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-010@luce.app',
    title: '모이스처 앰플 패치',
    category: 'beauty',
    retailPrice: '₩34,000',
    fit: '건성·복합성 추천',
    specs: '성분: 히알루론산, 펩타이드, 판테놀',
    description: '방송 전 빠른 집중 케어를 돕는 마이크로 패치 타입 앰플입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1535078528505-07f99a49b790?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80&sat=-30',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80&sat=-45',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80&sat=5',
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80&sat=15',
    ],
  },
  {
    supplierEmail: 'seed-supplier-011@luce.app',
    title: '식물성 프로틴 블렌드',
    category: 'wellness',
    retailPrice: '₩45,000',
    fit: '1일 1포 섭취',
    specs: '주요성분: 완두 단백 70%, 귀리 단백 20%, 비건 프로바이오틱스',
    description: '방송 전후 에너지 케어를 돕는 저당 식물성 단백질 블렌드입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1580915411954-282cb1c5f678?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8cbe?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1615485290382-5db9fee81847?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584367367093-894d8405334b?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-012@luce.app',
    title: '비건 데일리 멀티비타민',
    category: 'wellness',
    retailPrice: '₩29,000',
    fit: '성인 1일 2정',
    specs: '주요성분: 비타민 B군, 비타민 D3, 아연, 마그네슘',
    description: '도심 라이프스타일에 맞춘 비건 멀티비타민 포뮬라입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1584367367093-894d8405334b?auto=format&fit=crop&w=800&q=80&sat=-10',
      'https://images.unsplash.com/photo-1584367366561-72d2b2d88887?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1576092768240-3a16e8f1229d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575876105750-7d58c03f0c4f?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-013@luce.app',
    title: '슬림 밸런스 프로바이오틱스',
    category: 'wellness',
    retailPrice: '₩33,000',
    fit: '저녁 식후 1포',
    specs: '주요성분: 10종 유산균, 가르시니아, 치커리 식이섬유',
    description: '컨디션 유지와 라이트한 라인 관리를 돕는 프로바이오틱스 제품입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1581508512444-b7a8aeae8d0b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584367367093-894d8405334b?auto=format&fit=crop&w=800&q=80&sat=-25',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80&sat=25',
      'https://images.unsplash.com/photo-1615485290382-5db9fee81847?auto=format&fit=crop&w=800&q=80&sat=-10',
      'https://images.unsplash.com/photo-1580915411954-282cb1c5f678?auto=format&fit=crop&w=800&q=80&sat=-15',
    ],
  },
  {
    supplierEmail: 'seed-supplier-014@luce.app',
    title: '데일리 그린 라떼 파우더',
    category: 'wellness',
    retailPrice: '₩25,000',
    fit: '물·우유 200ml에 1포',
    specs: '주요성분: 유기농 케일, 시금치, 스피루리나, 곡물 5종',
    description: '부담 없는 맛으로 구성된 녹황색 채소 파우더 라떼입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517677129300-07b130802f46?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80&sat=-5',
      'https://images.unsplash.com/photo-1576402187878-974f70c890a5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1615485290382-5db9fee81847?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-015@luce.app',
    title: '하이드레이션 이온 드링크',
    category: 'wellness',
    retailPrice: '₩32,000',
    fit: '운동 전후 1병',
    specs: '주요성분: 나트륨, 칼륨, 마그네슘, 비타민 B군',
    description: '라이브 촬영 전후 컨디션 유지를 돕는 프리미엄 이온 음료입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=800&q=80&hue=180',
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80&sat=40',
      'https://images.unsplash.com/photo-1576402187878-974f70c890a5?auto=format&fit=crop&w=800&q=80&sat=-30',
    ],
  },
  {
    supplierEmail: 'seed-supplier-016@luce.app',
    title: '모던 레더 크로스백',
    category: 'goods',
    retailPrice: '₩129,000',
    fit: '원사이즈 · 스트랩 조절 가능',
    specs: '소재: 풀그레인 가죽 · 내부 포켓 3개',
    description: '데일리와 방송 연출 모두에 어울리는 미니멀 레더 크로스백입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80&sat=-45',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80&sat=-5',
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=800&q=80&sat=-20',
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1510414696678-2415ad8474aa?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-017@luce.app',
    title: '스테이트먼트 실버 이어커프',
    category: 'goods',
    retailPrice: '₩45,000',
    fit: '프리사이즈',
    specs: '소재: 925 실버 · 무니켈',
    description: '빛을 받으면 은은하게 반짝이는 입체 실버 이어커프 세트입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80&sat=-35',
      'https://images.unsplash.com/photo-1516637090014-cb1ab0d08fc7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520923642038-b4259acecbd7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80&sat=-60',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80&sat=30',
    ],
  },
  {
    supplierEmail: 'seed-supplier-018@luce.app',
    title: '타임리스 가죽 워치',
    category: 'goods',
    retailPrice: '₩178,000',
    fit: '케이스 36mm · 방수 5ATM',
    specs: '소재: 스테인리스 케이스, 사피아노 가죽 스트랩',
    description: '미니멀 다이얼과 슬림 베젤이 돋보이는 타임리스 워치입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80&sat=10',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80&sat=-20',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1456926631375-92c8ce872def?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520923642038-b4259acecbd7?auto=format&fit=crop&w=800&q=80&sat=-15',
    ],
  },
  {
    supplierEmail: 'seed-supplier-019@luce.app',
    title: '에센셜 블랙 로퍼',
    category: 'goods',
    retailPrice: '₩139,000',
    fit: '사이즈 225~270',
    specs: '소재: 소가죽 어퍼 · 비브람 솔',
    description: '방송 착장에 깔끔하게 어울리는 클래식 블랙 로퍼입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542293787938-4d2226cd9f3c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=800&q=80&sat=25',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    supplierEmail: 'seed-supplier-020@luce.app',
    title: '라운드 메탈 안경',
    category: 'goods',
    retailPrice: '₩89,000',
    fit: '프리사이즈 · 경량 18g',
    specs: '소재: 티타늄 합금 · 블루라이트 차단 렌즈',
    description: '세련된 라운드 쉐입으로 얼굴형에 관계없이 잘 어울리는 메탈 안경입니다.',
    gallery: [
      'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80&sat=-50',
      'https://images.unsplash.com/photo-1520923642038-b4259acecbd7?auto=format&fit=crop&w=800&q=80&sat=-40',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80&sat=-35',
      'https://images.unsplash.com/photo-1516637090014-cb1ab0d08fc7?auto=format&fit=crop&w=800&q=80&sat=-20',
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80&sat=-55',
    ],
  },
];

function buildSupplierSeedRecords() {
  return Array.from({ length: SUPPLIER_SEED_TOTAL }, (_value, index) => {
    const number = String(index + 1).padStart(3, '0');
    const category = SUPPLIER_CATEGORIES[index % SUPPLIER_CATEGORIES.length];
    const phoneSuffix = String(7000 + index + 1).slice(-4);

    return {
      type: 'supplier',
      brand: `샘플 공급업체 ${number}`,
      phone: `010-6000-${phoneSuffix}`,
      email: `seed-supplier-${number}@luce.app`,
      category,
      channel: `https://instagram.com/luce.supplier.${number}`,
      experience: null,
      notes: '샘플 데이터',
      passwordHash: DEFAULT_SEED_PASSWORD_HASH,
    };
  });
}

function buildSellerSeedRecords() {
  return Array.from({ length: SELLER_SEED_TOTAL }, (_value, index) => {
    const number = String(index + 1).padStart(4, '0');
    const phoneSuffix = String(8100 + index + 1).slice(-4);
    const channel = SELLER_CHANNELS[index % SELLER_CHANNELS.length];
    const experience = SELLER_EXPERIENCE[index % SELLER_EXPERIENCE.length];

    return {
      type: 'seller',
      brand: `샘플 셀러 ${number}`,
      phone: `010-7000-${phoneSuffix}`,
      email: `seed-seller-${number}@luce.app`,
      category: null,
      channel,
      experience,
      notes: '샘플 데이터',
      passwordHash: DEFAULT_SEED_PASSWORD_HASH,
    };
  });
}

function buildMemberSeedRecords() {
  return Array.from({ length: MEMBER_SEED_TOTAL }, (_value, index) => {
    const number = String(index + 1).padStart(4, '0');
    const phoneSuffix = String(9300 + index + 1).slice(-4);

    return {
      type: 'member',
      brand: `샘플 회원 ${number}`,
      phone: `010-8000-${phoneSuffix}`,
      email: `seed-member-${number}@luce.app`,
      category: null,
      channel: null,
      experience: null,
      notes: null,
      passwordHash: DEFAULT_SEED_PASSWORD_HASH,
    };
  });
}

function seedAccounts(records, callback) {
  if (!records.length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  const statement = db.prepare(
    'INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  let index = 0;

  const next = () => {
    if (index >= records.length) {
      statement.finalize(err => {
        if (err) {
          console.error('Seed finalize error', err);
        }
        if (typeof callback === 'function') {
          callback();
        }
      });
      return;
    }

    const record = records[index++];
    db.get('SELECT id FROM signups WHERE email = ?', [record.email], (err, existing) => {
      if (err) {
        console.error('Seed lookup error', err);
        next();
        return;
      }

      if (existing) {
        next();
        return;
      }

      statement.run(
        [
          record.type,
          record.brand,
          record.phone,
          record.email,
          record.category,
          record.channel,
          record.experience,
          record.notes,
          record.passwordHash,
        ],
        runErr => {
          if (runErr) {
            console.error('Seed insert error', runErr);
          }
          next();
        }
      );
    });
  };

  next();
}

function seedSampleProducts(callback) {
  db.get('SELECT COUNT(*) AS count FROM products', (err, row) => {
    if (err) {
      console.error('Seed product count error', err);
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    if (row?.count >= SAMPLE_PRODUCTS.length) {
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    const supplierEmails = [...new Set(SAMPLE_PRODUCTS.map(product => product.supplierEmail))];
    if (!supplierEmails.length) {
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    const placeholders = supplierEmails.map(() => '?').join(', ');
    db.all(`SELECT id, email FROM signups WHERE email IN (${placeholders})`, supplierEmails, (lookupErr, rows) => {
      if (lookupErr) {
        console.error('Seed supplier lookup error', lookupErr);
        if (typeof callback === 'function') {
          callback();
        }
        return;
      }

      const supplierMap = new Map();
      rows.forEach(rowRecord => {
        supplierMap.set(rowRecord.email, rowRecord.id);
      });

      const statement = db.prepare(
        'INSERT INTO products (supplier_id, title, category, retail_price, fit, specs, description, primary_image, gallery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );

      let productIndex = 0;

      const insertNext = () => {
        if (productIndex >= SAMPLE_PRODUCTS.length) {
          statement.finalize(finalizeErr => {
            if (finalizeErr) {
              console.error('Seed product finalize error', finalizeErr);
            }
            if (typeof callback === 'function') {
              callback();
            }
          });
          return;
        }

        const product = SAMPLE_PRODUCTS[productIndex++];
        const supplierId = supplierMap.get(product.supplierEmail);
        if (!supplierId) {
          insertNext();
          return;
        }

        db.get(
          'SELECT id FROM products WHERE supplier_id = ? AND title = ?',
          [supplierId, product.title],
          (productLookupErr, existing) => {
            if (productLookupErr) {
              console.error('Seed product lookup error', productLookupErr);
              insertNext();
              return;
            }

            if (existing) {
              insertNext();
              return;
            }

            const gallery = Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [];
            const primaryImage = gallery.length ? gallery[0] : '';
            statement.run(
              [
                supplierId,
                product.title,
                product.category,
                product.retailPrice,
                product.fit,
                product.specs,
                product.description,
                primaryImage,
                JSON.stringify(gallery),
              ],
              insertErr => {
                if (insertErr) {
                  console.error('Seed product insert error', insertErr);
                }
                insertNext();
              }
            );
          }
        );
      };

      insertNext();
    });
  });
}

function seedBaselineData() {
  seedAccounts(buildSupplierSeedRecords(), () => {
    seedAccounts(buildSellerSeedRecords(), () => {
      seedAccounts(buildMemberSeedRecords(), () => {
        seedSampleProducts(() => {});
      });
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
});

ensureSignupPasswordColumn(seedBaselineData);

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

  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!type || !brand || !phone || !email || !normalizedPassword) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  if (normalizedPassword.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상으로 설정해주세요.' });
  }

  if (!SIGNUP_TYPES.has(type)) {
    return res.status(400).json({ error: '유효하지 않은 가입 유형입니다.' });
  }

  const passwordHash = hashPassword(normalizedPassword);

  db.run(
    'INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      type,
      String(brand).trim(),
      String(phone).trim(),
      String(email).trim(),
      category ? String(category).trim() : null,
      channel ? String(channel).trim() : null,
      experience ? String(experience).trim() : null,
      notes ? String(notes).trim() : null,
      passwordHash,
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

  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ error: '이메일과 비밀번호를 모두 입력해주세요.' });
  }

  db.get(
    `SELECT id, brand, phone, email, password_hash AS passwordHash
       FROM signups
      WHERE type = 'supplier' AND email = ?`,
    [normalizedEmail],
    (err, supplier) => {
      if (err) {
        console.error('Supplier login lookup error', err);
        return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
      }

      if (!supplier || !supplier.passwordHash) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      const hashed = hashPassword(normalizedPassword);
      if (hashed !== supplier.passwordHash) {
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

    const sanitized = rows.map(row => {
      const { password_hash: _passwordHash, ...rest } = row;
      return rest;
    });

    res.json(sanitized);
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
