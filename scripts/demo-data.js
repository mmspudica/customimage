(function () {
  const STORAGE_KEY = 'luce-lookbook-demo';
  const SESSION_KEY = 'luce-lookbook-session';
  const fallbackStore = {
    data: null,
    session: null,
  };

  function createGallery(seed) {
    return Array.from({ length: 5 }, (_, index) => `https://picsum.photos/seed/${seed}-${index}/960/1200`);
  }

  function createProduct(config) {
    const gallery = createGallery(config.id);
    return {
      ...config,
      image: gallery[0],
      gallery,
    };
  }

  const DEFAULT_LOOKBOOK = [
    createProduct({
      id: 'fashion-aurora-trench',
      title: '오로라 트렌치 셋업',
      category: 'fashion',
      retailPrice: '189,000원',
      fit: 'FREE (44-66)',
      specs: '폴리에스터 80%, 레이온 20% · 드라이클리닝 권장 · 베이지/블랙 2컬러',
      description: '도심 라이브 방송을 위한 클래식 트렌치 셋업. 허리 벨트와 구조적인 숄더가 시그니처입니다.',
      supplier: { id: 'sup-arte', brand: '아르떼 패션', email: 'arte@luce.app' },
      createdAt: '2025-02-18T09:00:00+09:00',
    }),
    createProduct({
      id: 'fashion-mono-lounge',
      title: '모노 라운지 수트',
      category: 'fashion',
      retailPrice: '129,000원',
      fit: 'FREE (55-77)',
      specs: '텐셀 60%, 폴리 35%, 스판 5% · 머신워시 가능 · 차콜/아이보리',
      description: '라이브 피팅에 최적화된 드레이프 실루엣의 라운지 수트. 심플한 라인으로 다채로운 스타일링이 가능합니다.',
      supplier: { id: 'sup-line', brand: '라인 아틀리에', email: 'atelier@luce.app' },
      createdAt: '2025-02-16T09:00:00+09:00',
    }),
    createProduct({
      id: 'fashion-silhouette-knit',
      title: '실루엣 니트 드레스',
      category: 'fashion',
      retailPrice: '98,000원',
      fit: 'FREE (44-66)',
      specs: '비스코스 70%, 나일론 30% · 신축성 우수 · 블랙/포그블루',
      description: '카메라 친화적인 세미 머메이드 라인의 니트 드레스. 허리 라인 절개로 체형을 정돈해줍니다.',
      supplier: { id: 'sup-silhouette', brand: '실루엣 컴퍼니', email: 'silhouette@luce.app' },
      createdAt: '2025-02-14T09:00:00+09:00',
    }),
    createProduct({
      id: 'fashion-layered-shirt',
      title: '레이어드 시그니처 셔츠',
      category: 'fashion',
      retailPrice: '76,000원',
      fit: 'FREE (44-66)',
      specs: '코튼 100% · 세미 오버핏 · 화이트/스카이/스트라이프',
      description: '방송 조명에서도 깨끗하게 떨어지는 레이어드 셔츠. 이너, 아우터 모두 활용 가능한 스테디 아이템입니다.',
      supplier: { id: 'sup-layer', brand: '레이어 스튜디오', email: 'layer@luce.app' },
      createdAt: '2025-02-12T09:00:00+09:00',
    }),
    createProduct({
      id: 'fashion-aston-jacket',
      title: '애스턴 컷아웃 재킷',
      category: 'fashion',
      retailPrice: '215,000원',
      fit: 'FREE (44-66)',
      specs: '울 70%, 폴리 30% · 싱글 버튼 · 차콜/라이트그레이',
      description: '사선 컷아웃 디테일로 각도마다 포인트가 되는 크롭 재킷. 미니멀 셋업과 궁합이 좋습니다.',
      supplier: { id: 'sup-aston', brand: '애스턴 테일러링', email: 'aston@luce.app' },
      createdAt: '2025-02-10T09:00:00+09:00',
    }),
    createProduct({
      id: 'beauty-luminous-serum',
      title: '루미너스 세럼 듀오',
      category: 'beauty',
      retailPrice: '79,000원',
      fit: '30ml x 2',
      specs: '나이아신아마이드 5%, 펩타이드 콤플렉스 · 12개월 사용권장',
      description: '피부광을 살려주는 투스텝 세럼 세트. 촬영 전후 컨디셔닝에 특화된 베이스 케어입니다.',
      supplier: { id: 'sup-glow', brand: '글로우 랩', email: 'glow@luce.app' },
      createdAt: '2025-02-08T09:00:00+09:00',
    }),
    createProduct({
      id: 'beauty-velvet-lip',
      title: '실크 벨벳 립 키트',
      category: 'beauty',
      retailPrice: '43,000원',
      fit: '4.5g x 4 컬러',
      specs: '비건 포뮬라 · 벨벳/글로시 듀얼 텍스처 · 24개월 유통기한',
      description: '방송 컬러감에 맞춘 포 시즌 립 키트. 벨벳과 글로시 텍스처를 레이어링할 수 있습니다.',
      supplier: { id: 'sup-silk', brand: '실크 코스메틱', email: 'silk@luce.app' },
      createdAt: '2025-02-06T09:00:00+09:00',
    }),
    createProduct({
      id: 'beauty-calming-toner',
      title: '카밍 무드 토너',
      category: 'beauty',
      retailPrice: '32,000원',
      fit: '200ml',
      specs: '센텔라 80%, 판테놀 2% · 알코올 프리 · 18개월 유통기한',
      description: '메이크업 전후 진정에 특화된 워터리 토너. 스튜디오 조명 아래에서도 즉각 쿨링감을 줍니다.',
      supplier: { id: 'sup-mood', brand: '무드 케어', email: 'mood@luce.app' },
      createdAt: '2025-02-04T09:00:00+09:00',
    }),
    createProduct({
      id: 'beauty-glow-cushion',
      title: '글로우 핏 쿠션',
      category: 'beauty',
      retailPrice: '39,000원',
      fit: '15g 본품 + 리필',
      specs: 'SPF 50+ PA++++ · 3컬러 구성 · 24개월 유통기한',
      description: '라이브 촬영 각도에서도 무너지지 않는 글로우 쿠션. 얇은 픽싱으로 노필터 광을 연출합니다.',
      supplier: { id: 'sup-glowfit', brand: '글로우핏 컴퍼니', email: 'glowfit@luce.app' },
      createdAt: '2025-02-02T09:00:00+09:00',
    }),
    createProduct({
      id: 'beauty-clean-sun',
      title: '클린 라인 선 에센스',
      category: 'beauty',
      retailPrice: '27,000원',
      fit: '50ml',
      specs: 'EWG 그린 등급 · 워터리 에센스 제형 · 백탁 없음',
      description: '야외 촬영 셀러를 위한 산뜻한 자외선 에센스. 메이크업 전 단계에서도 밀림이 없습니다.',
      supplier: { id: 'sup-clean', brand: '클린 라인 랩', email: 'clean@luce.app' },
      createdAt: '2025-01-30T09:00:00+09:00',
    }),
    createProduct({
      id: 'wellness-morning-pack',
      title: '바이탈 모닝 멀티팩',
      category: 'wellness',
      retailPrice: '59,000원',
      fit: '30팩',
      specs: '비타민 B/C/D, 아연 복합 · 1일 1팩 · 2026-12-31까지',
      description: '셀러 컨디션 유지를 돕는 모닝 멀티팩. 이동이 많은 스케줄에도 간편하게 섭취할 수 있습니다.',
      supplier: { id: 'sup-vital', brand: '바이탈 스튜디오', email: 'vital@luce.app' },
      createdAt: '2025-01-28T09:00:00+09:00',
    }),
    createProduct({
      id: 'wellness-sleep-blend',
      title: '딥 슬립 허브 블렌드',
      category: 'wellness',
      retailPrice: '34,000원',
      fit: '2g x 20티백',
      specs: '카모마일, 라벤더, 패션플라워 · 1일 1~2티백',
      description: '방송 전 긴장을 완화해주는 허브 블렌드. 카페인이 없어 야간 방송에도 적합합니다.',
      supplier: { id: 'sup-rest', brand: '레스티드 라운지', email: 'rest@luce.app' },
      createdAt: '2025-01-26T09:00:00+09:00',
    }),
    createProduct({
      id: 'wellness-probiotics',
      title: '밸런스 프로바이오틱',
      category: 'wellness',
      retailPrice: '44,000원',
      fit: '2g x 30포',
      specs: '프로바이오틱스 10종, 프리바이오틱스 배합 · 냉장보관',
      description: '장 리듬을 맞춰주는 생유산균 포. 장시간 촬영에도 편안함을 제공합니다.',
      supplier: { id: 'sup-balance', brand: '밸런스 랩', email: 'balance@luce.app' },
      createdAt: '2025-01-24T09:00:00+09:00',
    }),
    createProduct({
      id: 'wellness-plant-protein',
      title: '파워 플랜트 프로틴',
      category: 'wellness',
      retailPrice: '52,000원',
      fit: '700g',
      specs: '완두단백 75%, 식물성 BCAA · 1회 30g 섭취',
      description: '셀러 체력 관리를 위한 식물성 단백질 파우더. 물, 두유 모두 잘 섞이는 미세 파우더입니다.',
      supplier: { id: 'sup-power', brand: '파워 플랜트', email: 'power@luce.app' },
      createdAt: '2025-01-22T09:00:00+09:00',
    }),
    createProduct({
      id: 'wellness-daily-green',
      title: '데일리 그린 파우더',
      category: 'wellness',
      retailPrice: '48,000원',
      fit: '4g x 30포',
      specs: '보리새싹, 케일, 스피루리나 · 스틱형 · 2026-06-30까지',
      description: '방송 준비 중 빠르게 채워 넣는 녹색 파우더. 물에도, 요거트에도 가볍게 섞여드립니다.',
      supplier: { id: 'sup-green', brand: '그린 모먼트', email: 'green@luce.app' },
      createdAt: '2025-01-20T09:00:00+09:00',
    }),
    createProduct({
      id: 'goods-module-bag',
      title: '모듈 라운드 백',
      category: 'goods',
      retailPrice: '158,000원',
      fit: 'ONE SIZE',
      specs: '이태리 베지터블 가죽 · 스트랩 2종 포함 · 블랙/토프',
      description: '룩북 촬영용으로 제안하는 라운드 숄더백. 교체형 스트랩으로 다양한 셀렉션과 매칭됩니다.',
      supplier: { id: 'sup-module', brand: '모듈 레더', email: 'module@luce.app' },
      createdAt: '2025-01-18T09:00:00+09:00',
    }),
    createProduct({
      id: 'goods-frame-bag',
      title: '프레임 스퀘어 백',
      category: 'goods',
      retailPrice: '138,000원',
      fit: 'ONE SIZE',
      specs: '사피아노 소가죽 · 골드 프레임 · 베이지/딥블루',
      description: '각 잡힌 실루엣이 돋보이는 스퀘어 백. 온/오프라인 라이브 모두에서 포인트 소품으로 활용됩니다.',
      supplier: { id: 'sup-frame', brand: '프레임 라인', email: 'frame@luce.app' },
      createdAt: '2025-01-16T09:00:00+09:00',
    }),
    createProduct({
      id: 'goods-signal-earring',
      title: '시그널 실버 이어링',
      category: 'goods',
      retailPrice: '46,000원',
      fit: '92.5 실버 · 한 쌍',
      specs: '니켈 프리 · 무게 3.2g · 유광/무광 선택',
      description: '조명 반사를 계산한 시그널 이어링. 얼굴을 밝혀주는 타원형 곡선이 특징입니다.',
      supplier: { id: 'sup-signal', brand: '시그널 스튜디오', email: 'signal@luce.app' },
      createdAt: '2025-01-14T09:00:00+09:00',
    }),
    createProduct({
      id: 'goods-soft-muffler',
      title: '에센스 소프트 머플러',
      category: 'goods',
      retailPrice: '68,000원',
      fit: '200cm x 40cm',
      specs: '캐시미어 10%, 울 90% · 드라이클리닝',
      description: '방송 세트 컬러에 맞춘 미니멀 머플러. 라이트, 다크 두 가지 톤으로 구성되었습니다.',
      supplier: { id: 'sup-essence', brand: '에센스 위빙', email: 'essence@luce.app' },
      createdAt: '2025-01-12T09:00:00+09:00',
    }),
    createProduct({
      id: 'goods-travel-wallet',
      title: '트래블 컴팩트 월렛',
      category: 'goods',
      retailPrice: '54,000원',
      fit: '9.5cm x 11cm',
      specs: '이태리 소가죽 · RFID 차단 · 카드 8장 수납',
      description: '셀러 출장에 꼭 필요한 미니 월렛. 심플한 로고 각인과 3색 옵션으로 완성했습니다.',
      supplier: { id: 'sup-travel', brand: '트래블 메이드', email: 'travel@luce.app' },
      createdAt: '2025-01-10T09:00:00+09:00',
    }),
  ];

  const DEFAULT_DATA = {
    metrics: {
      suppliers: 100,
      sellers: 1000,
      members: 2000,
    },
    accounts: {
      suppliers: [
        {
          id: 'supplier-test',
          brand: 'LUCE 테스트 공급업체',
          phone: '02-1234-5678',
          email: 'test@test.com',
          password: 'test1234',
          category: 'fashion',
          channel: 'https://lookbook.luce.app',
          notes: '데모용 공급업체 계정입니다.',
        },
      ],
      sellers: [],
      members: [],
    },
    lookbook: DEFAULT_LOOKBOOK.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };

  function storageAvailable() {
    try {
      const testKey = '__luce-demo-test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && storageAvailable();

  function readStore(key) {
    if (canUseStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    }

    if (key === STORAGE_KEY) {
      return fallbackStore.data ? JSON.stringify(fallbackStore.data) : null;
    }

    if (key === SESSION_KEY) {
      return fallbackStore.session ? JSON.stringify(fallbackStore.session) : null;
    }

    return null;
  }

  function writeStore(key, value) {
    if (canUseStorage) {
      try {
        if (value === null || typeof value === 'undefined') {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        // ignore storage errors
      }
    }

    if (key === STORAGE_KEY) {
      fallbackStore.data = value ? JSON.parse(value) : null;
    }

    if (key === SESSION_KEY) {
      fallbackStore.session = value ? JSON.parse(value) : null;
    }
  }

  function dispatchChange() {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('luce:data:changed'));
    }
  }

  function persistData(data, options = {}) {
    fallbackStore.data = data;
    writeStore(STORAGE_KEY, JSON.stringify(data));
    if (!options.silent) {
      dispatchChange();
    }
  }

  function ensureData() {
    const raw = readStore(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          fallbackStore.data = parsed;
          return parsed;
        }
      } catch (error) {
        // fall through to reset
      }
    }

    const cloned = JSON.parse(JSON.stringify(DEFAULT_DATA));
    fallbackStore.data = cloned;
    persistData(cloned, { silent: true });
    return cloned;
  }

  function getData() {
    return ensureData();
  }

  function getMetrics() {
    const data = ensureData();
    const latest = data.lookbook.length ? data.lookbook[0].createdAt : null;
    return {
      products: data.lookbook.length,
      suppliers: data.metrics.suppliers,
      sellers: data.metrics.sellers,
      members: data.metrics.members,
      latestProduct: latest,
    };
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function registerAccount(type, payload) {
    const data = ensureData();
    const email = normalizeEmail(payload.email);
    if (!email) {
      throw new Error('이메일을 입력해주세요.');
    }

    const key = type === 'member' ? 'members' : `${type}s`;
    const collection = data.accounts[key];
    if (!Array.isArray(collection)) {
      throw new Error('잘못된 회원 유형입니다.');
    }

    if (collection.some(account => normalizeEmail(account.email) === email)) {
      throw new Error('이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.');
    }

    const id = `${type}-${Date.now()}`;
    const entry = {
      id,
      ...payload,
      email,
      createdAt: new Date().toISOString(),
    };

    collection.push(entry);

    if (type === 'supplier') {
      data.metrics.suppliers += 1;
    } else if (type === 'seller') {
      data.metrics.sellers += 1;
    } else if (type === 'member') {
      data.metrics.members += 1;
    }

    persistData(data);
    return entry;
  }

  function getProducts() {
    const data = ensureData();
    return data.lookbook.slice();
  }

  function getProductsBySupplier(supplierId) {
    const data = ensureData();
    return data.lookbook.filter(item => item.supplier && item.supplier.id === supplierId);
  }

  function formatPrice(value) {
    if (typeof value !== 'string') {
      return '';
    }

    const numeric = value.replace(/[^0-9]/g, '');
    if (!numeric) {
      return value.trim();
    }

    const formatted = Number(numeric).toLocaleString('ko-KR');
    return `${formatted}원`;
  }

  function addProduct(payload) {
    const data = ensureData();
    const supplierId = payload?.supplierId;
    if (!supplierId) {
      throw new Error('공급업체 정보가 필요합니다.');
    }

    const supplier = data.accounts.suppliers.find(account => account.id === supplierId);
    if (!supplier) {
      throw new Error('공급업체를 찾을 수 없습니다. 다시 로그인해주세요.');
    }

    const gallery = Array.isArray(payload.gallery) ? payload.gallery.filter(Boolean) : [];
    const normalizedGallery = gallery.slice(0, 5);
    const detailGallery = normalizedGallery.filter(url => url && url !== payload.thumbnail);
    const fullGallery = [payload.thumbnail, ...detailGallery];
    while (fullGallery.length < 5) {
      fullGallery.push(detailGallery[detailGallery.length - 1] || payload.thumbnail);
    }
    const finalGallery = fullGallery.slice(0, 5);

    const product = {
      id: `product-${Date.now()}`,
      title: payload.title,
      category: payload.category,
      retailPrice: formatPrice(payload.retailPrice || ''),
      fit: payload.fit || '',
      specs: payload.specs || '',
      description: payload.description || '',
      image: payload.thumbnail,
      gallery: finalGallery,
      supplier: {
        id: supplier.id,
        brand: supplier.brand,
        email: supplier.email,
      },
      createdAt: new Date().toISOString(),
    };

    data.lookbook.unshift(product);
    persistData(data);
    return product;
  }

  function authenticateSupplier(email, password) {
    const data = ensureData();
    const normalizedEmail = normalizeEmail(email);
    const supplier = data.accounts.suppliers.find(account => normalizeEmail(account.email) === normalizedEmail);
    if (!supplier) {
      return null;
    }

    if (supplier.password !== password) {
      return null;
    }

    return {
      id: supplier.id,
      brand: supplier.brand,
      email: supplier.email,
      phone: supplier.phone || '',
    };
  }

  function setActiveSupplier(session) {
    if (!session) {
      writeStore(SESSION_KEY, null);
      fallbackStore.session = null;
      return;
    }

    fallbackStore.session = session;
    writeStore(SESSION_KEY, JSON.stringify(session));
  }

  function getActiveSupplier() {
    const raw = readStore(SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        fallbackStore.session = parsed;
        return parsed;
      } catch (error) {
        return null;
      }
    }
    return fallbackStore.session;
  }

  function logoutSupplier() {
    setActiveSupplier(null);
  }

  function ensureDefaults() {
    ensureData();
  }

  window.LUCE_DEMO = {
    ensureDefaults,
    getMetrics,
    getProducts,
    getProductsBySupplier,
    addProduct,
    registerAccount,
    authenticateSupplier,
    setActiveSupplier,
    getActiveSupplier,
    logoutSupplier,
  };

  ensureDefaults();
})();
