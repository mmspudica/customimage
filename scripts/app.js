const LOOKS_PER_BATCH = 9;

const lookbookCatalog = [
  {
    id: 'LB-F001',
    title: '루체 시그니처 린넨 셋업',
    category: 'fashion',
    price: '도매 58,000',
    fit: 'FREE (44-66)',
    specs: '자켓 어깨 40 · 가슴 50 · 총장 70 / 팬츠 허리 33 · 총장 98 · 린넨 55% 코튼 45%',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
    description: '라이브 베스트셀러. 셀러 피드백 평균 재방송율 92%.',
  },
  {
    id: 'LB-F002',
    title: '크리스프 스트라이프 셔츠 드레스',
    category: 'fashion',
    price: '도매 49,000',
    fit: 'FREE (44-77)',
    specs: '어깨 43 · 가슴 58 · 총장 118 · 코튼 100%',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    description: '바이어 수요 많은 데일리룩. 베스트컷 6장 자동 제공.',
  },
  {
    id: 'LB-F003',
    title: '소프트 플레어 가디건 세트',
    category: 'fashion',
    price: '도매 46,000',
    fit: 'FREE (44-66)',
    specs: '어깨 38 · 가슴 48 · 총장 52 · 레이온 70% 나일론 30%',
    image: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=600&q=80',
    description: '룩시트 템플릿에 핏컷 4종 자동 배치. 베스트 컬러 추천 포함.',
  },
  {
    id: 'LB-F004',
    title: '레이스 머메이드 스커트',
    category: 'fashion',
    price: '도매 43,000',
    fit: 'S/M/L',
    specs: '허리 32/34/36 · 총장 83 · 폴리 70% 레이온 30%',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
    description: '사이즈별 실측과 라이브 코디 제안이 자동 기입됩니다.',
  },
  {
    id: 'LB-B101',
    title: '글로우업 세럼 듀오',
    category: 'beauty',
    price: '도매 22,000',
    fit: '30ml × 2',
    specs: '주성분: 비타민C 10% · 히알루론산 · 6개월 유통기한',
    image: 'https://images.unsplash.com/photo-1519666213635-f1aa0b1c43e0?auto=format&fit=crop&w=600&q=80',
    description: '전성분/사용법 카드 자동 생성. 라이브 시연용 샘플 2세트 제공.',
  },
  {
    id: 'LB-B102',
    title: '무드 업 립틴트 5종 키트',
    category: 'beauty',
    price: '도매 18,500',
    fit: '세트 구성',
    specs: '용량 4.5g × 5 · 사용기한 24개월 · 저자극 테스트 완료',
    image: 'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=600&q=80',
    description: '컬러 스와치 이미지 자동 보정. 쇼호스트 스크립트 초안 포함.',
  },
  {
    id: 'LB-B103',
    title: '클리어 모이스처 크림',
    category: 'beauty',
    price: '도매 27,000',
    fit: '50ml',
    specs: '전성분 17종 · 피부 자극 테스트 완료 · 개봉 후 12개월',
    image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80',
    description: '유효성분 강조 컷과 사용 가이드 카드가 자동 첨부됩니다.',
  },
  {
    id: 'LB-W201',
    title: '데일리 밸런스 프로틴 파우더',
    category: 'wellness',
    price: '도매 26,000',
    fit: '30회분',
    specs: '단백질 25g · 지방 2g · 알레르기: 우유, 대두 · 유통기한 10개월',
    image: 'https://images.unsplash.com/photo-1510626176961-4b37d0e12e3f?auto=format&fit=crop&w=600&q=80',
    description: '성분표와 1회 섭취량 인포그래픽 자동 생성.',
  },
  {
    id: 'LB-W202',
    title: '바이탈 멀티비타민 구미',
    category: 'wellness',
    price: '도매 15,800',
    fit: '60구미',
    specs: '주요 성분: 비타민A,C,D,E · 합성착향료 무첨가 · 유통기한 12개월',
    image: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=600&q=80',
    description: '보관/섭취 안내 영상 템플릿 제공. 반품률 2% 이하 기록.',
  },
  {
    id: 'LB-G301',
    title: '모던 트위스트 백',
    category: 'goods',
    price: '도매 32,000',
    fit: 'ONE SIZE',
    specs: '가로 28 · 세로 20 · 폭 8 · 합성가죽 100%',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
    description: '3색 옵션 통일 배경 제공. 쇼룸 피팅컷 포함.',
  },
  {
    id: 'LB-G302',
    title: '소노라 실버 이어커프 세트',
    category: 'goods',
    price: '도매 12,000',
    fit: '3pcs SET',
    specs: '925 실버 도금 · 알레르기 방지 코팅',
    image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80',
    description: '패키징 컷과 라이브 착용컷 자동 정렬. 배송 리드타임 1일.',
  },
  {
    id: 'LB-X401',
    title: '라이브 스튜디오 데코 패키지',
    category: 'etc',
    price: '도매 85,000',
    fit: '세트 구성',
    specs: '백드롭 2종 · 조명 소품 4종 · 설치 가이드 포함',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80',
    description: '촬영 존 세팅 체크리스트와 함께 배송되는 스튜디오 전용 패키지.',
  },
  {
    id: 'LB-X402',
    title: '룩북 촬영 어시스트 키트',
    category: 'etc',
    price: '도매 49,000',
    fit: '하드케이스',
    specs: '클립 6종 · 스티머 · 바디테이프 · 수선 도구 포함',
    image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=600&q=80',
    description: '라이브 직전 수정용 공구와 체크리스트가 패키지로 제공됩니다.',
  },
];

const lookbookState = {
  filter: 'all',
  cursors: new Map(),
  grid: null,
  loader: null,
  sentinel: null,
  observer: null,
  isLoading: false,
};

const selection = new Map();

function translateCategory(category) {
  switch (category) {
    case 'fashion':
      return '패션';
    case 'beauty':
      return '뷰티';
    case 'wellness':
      return '건기식';
    case 'goods':
      return '잡화';
    default:
      return '기타';
  }
}

function getLookbookSource(filter) {
  if (filter === 'all') {
    return lookbookCatalog;
  }

  return lookbookCatalog.filter(item => item.category === filter);
}

function createLookCard(item, sequence = 1) {
  const card = document.createElement('article');
  card.className = 'look-card';

  const sequenceLabel = sequence > 1 ? `${item.id}-${String(sequence).padStart(2, '0')}` : item.id;

  card.innerHTML = `
    <div class="look-card-header">
      <span class="category-pill">${translateCategory(item.category)}</span>
      <span class="look-id">${sequenceLabel}</span>
    </div>
    <img src="${item.image}" alt="${item.title}">
    <div class="look-content">
      <h3>${item.title}</h3>
      <p class="look-description">${item.description}</p>
      <div class="look-meta">
        <span>${item.price}</span>
        <span>${item.fit}</span>
      </div>
      <p class="look-specs">${item.specs}</p>
      <button class="btn secondary" data-add="${item.id}">셀렉션 담기</button>
    </div>`;

  return card;
}

function appendLookbookBatch(filter, count = LOOKS_PER_BATCH) {
  const { grid, loader } = lookbookState;
  if (!grid) return false;

  const source = getLookbookSource(filter);
  if (!source.length || lookbookState.isLoading) {
    return false;
  }

  lookbookState.isLoading = true;
  if (loader) {
    loader.classList.add('active');
  }

  const fragment = document.createDocumentFragment();
  const startIndex = lookbookState.cursors.get(filter) || 0;

  for (let index = 0; index < count; index += 1) {
    const pointer = startIndex + index;
    const baseItem = source[pointer % source.length];
    const sequence = Math.floor(pointer / source.length) + 1;
    fragment.appendChild(createLookCard(baseItem, sequence));
  }

  grid.appendChild(fragment);
  lookbookState.cursors.set(filter, startIndex + count);

  if (loader) {
    loader.classList.remove('active');
  }
  lookbookState.isLoading = false;
  return true;
}

function applyLookbookFilter(filter, setActiveButton) {
  if (setActiveButton) {
    setActiveButton(filter);
  }

  lookbookState.filter = filter;
  lookbookState.isLoading = false;
  lookbookState.cursors.set(filter, 0);

  const { grid, loader, sentinel, observer } = lookbookState;
  if (!grid) return;

  grid.innerHTML = '';
  if (loader) {
    loader.classList.remove('active');
  }

  const dataset = getLookbookSource(filter);
  if (!dataset.length) {
    grid.innerHTML = '<p class="empty">해당 카테고리에 등록된 룩이 없습니다.</p>';
    if (sentinel) {
      sentinel.style.display = 'none';
      if (observer) {
        observer.unobserve(sentinel);
      }
    }
    return;
  }

  if (sentinel) {
    sentinel.style.display = 'block';
    if (observer) {
      observer.unobserve(sentinel);
      observer.observe(sentinel);
    }
  }

  appendLookbookBatch(filter, LOOKS_PER_BATCH * 2);
}

function initFilters(onFilterChange) {
  const buttons = Array.from(document.querySelectorAll('.filter-btn'));
  if (!buttons.length) {
    return null;
  }

  const setActiveButton = filter => {
    buttons.forEach(button => {
      const isActive = button.dataset.filter === filter;
      button.classList.toggle('active', isActive);
    });
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';
      onFilterChange(filter);
    });
  });

  return setActiveButton;
}

function initializeLookbook() {
  const grid = document.getElementById('lookbook-grid');
  const sentinel = document.getElementById('lookbook-sentinel');

  if (!grid || !sentinel) {
    return;
  }

  lookbookState.grid = grid;
  lookbookState.loader = document.getElementById('lookbook-loader');
  lookbookState.sentinel = sentinel;

  lookbookState.observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        appendLookbookBatch(lookbookState.filter);
      }
    });
  }, { rootMargin: '360px 0px 0px 0px' });

  lookbookState.observer.observe(sentinel);

  let setActiveButton = null;
  const handleFilterChange = filter => applyLookbookFilter(filter, setActiveButton);
  setActiveButton = initFilters(handleFilterChange);

  const defaultFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  applyLookbookFilter(defaultFilter, setActiveButton);
}

function updateSelectionSummary() {
  const summary = document.getElementById('selection-summary');
  if (!summary) {
    return;
  }

  if (!selection.size) {
    summary.innerHTML = '<h3>요약</h3><p>현재 담은 룩이 없습니다.</p>';
    return;
  }

  const total = selection.size;
  const categoryBreakdown = {};
  selection.forEach(item => {
    categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1;
  });

  const categoryList = Object.entries(categoryBreakdown)
    .map(([key, value]) => `${translateCategory(key)} ${value}개`)
    .join(' · ');

  summary.innerHTML = `
    <h3>요약</h3>
    <p><strong>${total}</strong>개의 룩을 담았습니다.</p>
    <p>${categoryList}</p>
    <p class="hint">스튜디오 요청으로 연결하려면 아래 버튼을 눌러 룩시트를 공유하세요.</p>
    <button class="btn primary" id="selection-request">스튜디오 요청 작성</button>
  `;

  const requestButton = summary.querySelector('#selection-request');
  if (requestButton) {
    requestButton.addEventListener('click', () => {
      const form = document.getElementById('studio-request');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

function renderSelectionList() {
  const list = document.getElementById('selection-list');
  if (!list) {
    return;
  }

  list.innerHTML = '';

  selection.forEach(item => {
    const li = document.createElement('li');
    li.className = 'selection-item';
    li.innerHTML = `
      <img src="${item.image}" alt="${item.title}">
      <div>
        <h4>${item.title}</h4>
        <p>${item.price} · ${item.fit}</p>
        <button class="remove-btn" data-remove="${item.id}">제거</button>
      </div>
    `;
    list.appendChild(li);
  });

  if (!selection.size) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>셀렉션이 비어 있습니다. 마음에 드는 룩을 담아보세요.</p>';
    list.appendChild(empty);
  }

  updateSelectionSummary();
}

function handleLookbookClick(event) {
  const target = event.target;
  if (!target.matches('[data-add]')) {
    return;
  }

  const id = target.getAttribute('data-add');
  const item = lookbookCatalog.find(product => product.id === id);
  if (!item) {
    return;
  }

  selection.set(id, item);
  renderSelectionList();

  target.classList.add('added');
  target.textContent = '셀렉션 담김';
  setTimeout(() => {
    target.classList.remove('added');
    target.textContent = '셀렉션 담기';
  }, 1500);
}

function handleSelectionClick(event) {
  const target = event.target;
  if (!target.matches('[data-remove]')) {
    return;
  }

  const id = target.getAttribute('data-remove');
  selection.delete(id);
  renderSelectionList();
}

function exportLooksheet() {
  if (!selection.size) {
    alert('룩을 하나 이상 담아주세요.');
    return;
  }

  const timestamp = new Date().toLocaleString('ko-KR');
  const lines = ['LUCE LOOKBOOK — 룩시트 자동생성', `생성 시각: ${timestamp}`, ''];

  selection.forEach(item => {
    lines.push(`[${item.id}] ${item.title}`);
    lines.push(`카테고리: ${translateCategory(item.category)}`);
    lines.push(`도매가: ${item.price} / 구성: ${item.fit}`);
    lines.push(`스펙: ${item.specs}`);
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `luce-looksheet-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initializeSelection() {
  const lookbookGrid = document.getElementById('lookbook-grid');
  if (lookbookGrid) {
    lookbookGrid.addEventListener('click', handleLookbookClick);
  }

  const selectionList = document.getElementById('selection-list');
  if (selectionList) {
    selectionList.addEventListener('click', handleSelectionClick);
    renderSelectionList();
  }

  const exportButton = document.getElementById('export-looksheet');
  if (exportButton) {
    exportButton.addEventListener('click', exportLooksheet);
  }
}

function setupStudioForm() {
  const form = document.getElementById('studio-request');
  const feedback = document.getElementById('studio-feedback');

  if (!form || !feedback) {
    return;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    feedback.textContent = '스튜디오 요청이 접수되었습니다. 운영팀이 승인 후 안내드립니다.';
    form.reset();
  });
}

function setupSignupForm(formId, feedbackId, type) {
  const form = document.getElementById(formId);
  const feedback = document.getElementById(feedbackId);

  if (!form || !feedback) {
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    feedback.textContent = '';
    feedback.classList.remove('error');

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '전송 중...';

    const data = new FormData(form);
    const payload = { type, ...Object.fromEntries(data.entries()) };

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('응답 오류');
      }

      feedback.textContent = '신청이 접수되었습니다. 담당자가 24시간 내 연락드립니다.';
      feedback.classList.remove('error');
      form.reset();
    } catch (error) {
      feedback.textContent = '전송에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.';
      feedback.classList.add('error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
}

function setupStudioAndSignup() {
  setupStudioForm();
  setupSignupForm('wholesale-form', 'wholesale-feedback', 'wholesale');
  setupSignupForm('seller-form', 'seller-feedback', 'seller');
}

document.addEventListener('DOMContentLoaded', () => {
  initializeLookbook();
  initializeSelection();
  setupStudioAndSignup();
});
