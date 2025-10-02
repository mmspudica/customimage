(function () {
  const STORAGE_KEYS = {
    suppliers: 'luce-demo-suppliers',
    sellers: 'luce-demo-sellers',
    members: 'luce-demo-members',
    session: 'luce-demo-supplier-session',
    products: 'luce-demo-products',
  };

  const demoSuppliers = [
    {
      id: 'sup-luce',
      brand: 'LUCE Supply Lab',
      company: '주식회사 루체 인터내셔널',
      email: 'test@test.com',
      password: 'test1234',
      phone: '010-1234-5678',
      category: '패션',
    },
    {
      id: 'sup-glow',
      brand: 'Glow Recipe Collective',
      email: null,
      password: null,
      phone: '010-2345-6789',
      category: '뷰티',
    },
    {
      id: 'sup-vital',
      brand: 'Vital Day Nutrition',
      email: null,
      password: null,
      phone: '010-4567-8910',
      category: '건기식',
    },
    {
      id: 'sup-craft',
      brand: 'Crafted Living Studio',
      email: null,
      password: null,
      phone: '010-5678-9012',
      category: '잡화',
    },
  ];

  const LOOKS = [
    {
      id: 'look-fashion-01',
      title: '모노톤 테일러드 자켓 셋업',
      category: 'fashion',
      price: 189000,
      supplierId: 'sup-luce',
      supplierName: 'LUCE Supply Lab',
      description: '마이크로 스트레치 원단으로 제작된 미드나잇 블랙 셋업.',
      specs: '어깨 37 · 가슴 48 · 총장 72 · 소매 60',
      gallery: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1542293787938-4d2226c50666?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1525171254930-643fc658b64c?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-fashion-02',
      title: '소프트 실크 블라우스',
      category: 'fashion',
      price: 89000,
      supplierId: 'sup-luce',
      supplierName: 'LUCE Supply Lab',
      description: '은은한 광택감의 실크 100% 블라우스.',
      specs: '가슴 52 · 총장 65 · 소매 58',
      gallery: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-100',
        'https://images.unsplash.com/photo-1542293787938-4d2226c50666?auto=format&fit=crop&w=900&q=80&sat=-50',
        'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-fashion-03',
      title: '하이라이즈 와이드 트라우저',
      category: 'fashion',
      price: 129000,
      supplierId: 'sup-luce',
      supplierName: 'LUCE Supply Lab',
      description: '투버튼으로 허리를 안정적으로 잡아주는 와이드 팬츠.',
      specs: '허리 34 · 엉덩이 48 · 총장 103',
      gallery: [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-20',
        'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=80&sat=-50',
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-fashion-04',
      title: '라이트 울 가디건',
      category: 'fashion',
      price: 109000,
      supplierId: 'sup-luce',
      supplierName: 'LUCE Supply Lab',
      description: '14게이지 울 혼방으로 제작된 미니멀 가디건.',
      specs: '가슴 50 · 총장 64 · 소매 60',
      gallery: [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-80',
        'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80&sat=-60',
        'https://images.unsplash.com/photo-1454942901704-3c44c11b2ad1?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-fashion-05',
      title: '모던 하프코트',
      category: 'fashion',
      price: 219000,
      supplierId: 'sup-luce',
      supplierName: 'LUCE Supply Lab',
      description: '더블 브레스티드 구조와 이너 벨트로 실루엣을 잡아주는 하프코트.',
      specs: '어깨 39 · 가슴 50 · 총장 86 · 소매 60',
      gallery: [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-30',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80&sat=-20',
        'https://images.unsplash.com/photo-1525171254930-643fc658b64c?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80&sat=-40',
      ],
    },
    {
      id: 'look-beauty-01',
      title: '에센스-토너 듀오',
      category: 'beauty',
      price: 39000,
      supplierId: 'sup-glow',
      supplierName: 'Glow Recipe Collective',
      description: '수분막을 형성해주는 저분자 히알루론 토너 & 에센스 세트.',
      specs: '전성분: 정제수, 히알루론산, 판테놀 외',
      gallery: [
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80&sat=-50',
      ],
    },
    {
      id: 'look-beauty-02',
      title: '모노 톤 업 쿠션',
      category: 'beauty',
      price: 32000,
      supplierId: 'sup-glow',
      supplierName: 'Glow Recipe Collective',
      description: '블랙 하드 케이스에 담은 세미 매트 쿠션 파운데이션.',
      specs: 'SPF 35 · 톤업 베이스 포함',
      gallery: [
        'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80&sat=-100',
      ],
    },
    {
      id: 'look-beauty-03',
      title: '클린 세럼 3-스텝 키트',
      category: 'beauty',
      price: 45000,
      supplierId: 'sup-glow',
      supplierName: 'Glow Recipe Collective',
      description: '저자극 필링-진정-보습 세럼으로 구성된 나이트 루틴 키트.',
      specs: '사용법: 1주 2회, 단계별 2펌프',
      gallery: [
        'https://images.unsplash.com/photo-1585386959984-a4155228ef44?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80&sat=-80',
        'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80&sat=-60',
        'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80&sat=-40',
      ],
    },
    {
      id: 'look-beauty-04',
      title: '루미너스 바디 오일',
      category: 'beauty',
      price: 36000,
      supplierId: 'sup-glow',
      supplierName: 'Glow Recipe Collective',
      description: '블랙 앰버 향으로 마무리되는 라이트 텍스처 바디 오일.',
      specs: '전성분: 스위트 아몬드 오일, 비타민 E 외',
      gallery: [
        'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=900&q=80&sat=-30',
        'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80&sat=-20',
        'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80&sat=-30',
        'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=900&q=80&sat=-20',
      ],
    },
    {
      id: 'look-beauty-05',
      title: '딥 클렌징 밤',
      category: 'beauty',
      price: 28000,
      supplierId: 'sup-glow',
      supplierName: 'Glow Recipe Collective',
      description: '워터프루프 메이크업까지 녹여내는 블랙밤 텍스처.',
      specs: '사용법: 마른 손+얼굴, 마사지 후 미온수 세안',
      gallery: [
        'https://images.unsplash.com/photo-1556228578-8c89e6adf27c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1612810806695-30ba7451d48e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80&sat=-60',
        'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=900&q=80&sat=-40',
      ],
    },
    {
      id: 'look-wellness-01',
      title: '모닝 밸런스 비타민',
      category: 'wellness',
      price: 27000,
      supplierId: 'sup-vital',
      supplierName: 'Vital Day Nutrition',
      description: '하루 한 알, 수용성 비타민 8종을 한 번에 채울 수 있는 서방형 제제.',
      specs: '1일 섭취량: 1정, 비타민 B군 100%',
      gallery: [
        'https://images.unsplash.com/photo-1581349485608-9469926dfbc2?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1576110598658-095053e1f6d4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1581349485608-9469926dfbc2?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1580281657521-6f0882bb68f0?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1561213850-6c9e0b28b891?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-wellness-02',
      title: '플랜트 단백 스틱',
      category: 'wellness',
      price: 33000,
      supplierId: 'sup-vital',
      supplierName: 'Vital Day Nutrition',
      description: '식물성 단백질 15g과 식이섬유가 들어간 스틱 파우더.',
      specs: '1일 1포, 단백질 15g, 식이섬유 6g',
      gallery: [
        'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1579722826044-918d984d25b6?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1552332214-29b51e70c8b4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1612540503182-8213710edbba?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-wellness-03',
      title: '바이탈 프로바이오틱스',
      category: 'wellness',
      price: 29000,
      supplierId: 'sup-vital',
      supplierName: 'Vital Day Nutrition',
      description: '100억 CFU 다균종 포뮬러로 장내 밸런스를 유지.',
      specs: '1일 1캡슐, 냉장보관 권장',
      gallery: [
        'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80&sat=-30',
        'https://images.unsplash.com/photo-1611689348461-54c03c24db31?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1611689348461-54c03c24db31?auto=format&fit=crop&w=900&q=80&sat=-60',
        'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-wellness-04',
      title: '딥 슬립 허브티',
      category: 'wellness',
      price: 19000,
      supplierId: 'sup-vital',
      supplierName: 'Vital Day Nutrition',
      description: '캐모마일과 패션플라워가 블렌딩된 취침 전 허브티.',
      specs: '1회 200ml, 취침 30분 전',
      gallery: [
        'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80&sat=-80',
        'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-wellness-05',
      title: '이너 뷰티 콜라겐 젤리',
      category: 'wellness',
      price: 25000,
      supplierId: 'sup-vital',
      supplierName: 'Vital Day Nutrition',
      description: '저분자 피쉬 콜라겐 3000mg이 들어간 젤리 타입 이너 뷰티.',
      specs: '1일 1포, 냉장보관 권장',
      gallery: [
        'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1552332214-29b51e70c8b4?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1611689348461-54c03c24db31?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1580281657521-6f0882bb68f0?auto=format&fit=crop&w=900&q=80&sat=-40',
      ],
    },
    {
      id: 'look-goods-01',
      title: '아카이브 미니 크로스백',
      category: 'goods',
      price: 69000,
      supplierId: 'sup-craft',
      supplierName: 'Crafted Living Studio',
      description: '이태리 소가죽으로 완성한 블랙 미니 크로스백.',
      specs: '가로 18 · 세로 13 · 폭 6cm',
      gallery: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80&sat=-20',
        'https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-40',
        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-goods-02',
      title: '미니멀 가죽 스니커즈',
      category: 'goods',
      price: 119000,
      supplierId: 'sup-craft',
      supplierName: 'Crafted Living Studio',
      description: '블랙 & 화이트 투톤의 핸드메이드 스니커즈.',
      specs: '사이즈 230-270, 굽 높이 3cm',
      gallery: [
        'https://images.unsplash.com/photo-1520340356584-6aac276b6a1a?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-goods-03',
      title: '스튜디오 에디션 캔들 세트',
      category: 'goods',
      price: 42000,
      supplierId: 'sup-craft',
      supplierName: 'Crafted Living Studio',
      description: '블랙 세라믹 홀더에 담은 세 가지 무드 향 캔들.',
      specs: '버닝타임 25h, 파라핀 프리',
      gallery: [
        'https://images.unsplash.com/photo-1512427691650-1e0c41d02581?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1511288599936-782564f6088d?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
      ],
    },
    {
      id: 'look-goods-04',
      title: '모노 워치 & 레더 스트랩',
      category: 'goods',
      price: 159000,
      supplierId: 'sup-craft',
      supplierName: 'Crafted Living Studio',
      description: '심플한 다이얼과 교체형 스트랩이 특징인 워치 세트.',
      specs: '케이스 36mm, 생활 방수',
      gallery: [
        'https://images.unsplash.com/photo-1472417583565-62e7bdeda490?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1473649085228-583485e6e4d7?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1462396881884-de2c07cb95ed?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1462396881884-de2c07cb95ed?auto=format&fit=crop&w=900&q=80&sat=-80',
      ],
    },
    {
      id: 'look-goods-05',
      title: '그래픽 니트 담요',
      category: 'goods',
      price: 59000,
      supplierId: 'sup-craft',
      supplierName: 'Crafted Living Studio',
      description: '블랙 & 크림 투톤의 기하학 패턴 니트 블랭킷.',
      specs: '150 × 130cm, 울 혼방',
      gallery: [
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1518895949257-7621c3c786d4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1457530378978-8bac673b8062?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
      ],
    },
  ];

  const METRIC_TOTALS = {
    products: LOOKS.length,
    suppliers: 100,
    sellers: 1000,
    members: 2000,
  };

  function safeGetLocalStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (error) {
      // ignore
    }
    return null;
  }

  function readCollection(key) {
    const storage = safeGetLocalStorage();
    if (!storage) {
      return [];
    }

    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeCollection(key, value) {
    const storage = safeGetLocalStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // ignore
    }
  }

  function seedDemoAccounts() {
    const suppliers = readCollection(STORAGE_KEYS.suppliers);
    const exists = suppliers.some(item => item.email === demoSuppliers[0].email);
    if (!exists) {
      suppliers.push({
        ...demoSuppliers[0],
        createdAt: new Date().toISOString(),
      });
      writeCollection(STORAGE_KEYS.suppliers, suppliers);
    }
  }

  function getSession() {
    const storage = safeGetLocalStorage();
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(STORAGE_KEYS.session);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function setSession(payload) {
    const storage = safeGetLocalStorage();
    if (!storage) {
      return;
    }

    if (!payload) {
      storage.removeItem(STORAGE_KEYS.session);
      return;
    }

    storage.setItem(STORAGE_KEYS.session, JSON.stringify(payload));
  }

  function addSignup(type, payload) {
    if (!type || !payload) {
      return;
    }

    const key = STORAGE_KEYS[type];
    if (!key) {
      return;
    }

    const current = readCollection(key);
    current.push({
      ...payload,
      createdAt: new Date().toISOString(),
    });
    writeCollection(key, current);
  }

  function getSignups(type) {
    const key = STORAGE_KEYS[type];
    if (!key) {
      return [];
    }
    return readCollection(key);
  }

  function getStoredProducts() {
    return readCollection(STORAGE_KEYS.products);
  }

  function addProduct(payload) {
    if (!payload) {
      return;
    }

    const products = getStoredProducts();
    products.push({
      ...payload,
      id: payload.id || `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    writeCollection(STORAGE_KEYS.products, products);
  }

  window.LUCE_DEMO = {
    LOOKS,
    SUPPLIERS: demoSuppliers,
    METRICS: METRIC_TOTALS,
    STORAGE_KEYS,
    seedDemoAccounts,
    addSignup,
    getSignups,
    getSession,
    setSession,
    getStoredProducts,
    addProduct,
  };
})();
