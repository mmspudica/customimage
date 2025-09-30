const lookbookData = [
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
    id: 'LB-W201',
    title: '데일리 밸런스 프로틴 파우더',
    category: 'wellness',
    price: '도매 26,000',
    fit: '30회분',
    specs: '단백질 25g · 지방 2g · 알레르기: 우유, 대두 · 유통기한 10개월',
    image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=600&q=80',
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
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
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
];

const selection = new Map();

function renderLookbook(filter = 'all') {
  const grid = document.getElementById('lookbook-grid');
  grid.innerHTML = '';

  const filtered = filter === 'all' ? lookbookData : lookbookData.filter(item => item.category === filter);

  if (!filtered.length) {
    grid.innerHTML = '<p class="empty">해당 카테고리에 등록된 룩이 없습니다.</p>';
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('article');
    card.className = 'look-card';
    card.innerHTML = `
      <div class="look-card-header">
        <span class="category-pill">${translateCategory(item.category)}</span>
        <span class="look-id">${item.id}</span>
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
    grid.appendChild(card);
  });
}

function updateSelectionSummary() {
  const summary = document.getElementById('selection-summary');
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

  summary.querySelector('#selection-request').addEventListener('click', () => {
    document.getElementById('studio-request').scrollIntoView({ behavior: 'smooth' });
  });
}

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

function renderSelectionList() {
  const list = document.getElementById('selection-list');
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
  if (target.matches('[data-add]')) {
    const id = target.getAttribute('data-add');
    const item = lookbookData.find(product => product.id === id);
    if (!item) return;
    selection.set(id, item);
    renderSelectionList();
    target.classList.add('added');
    target.textContent = '셀렉션 담김';
    setTimeout(() => {
      target.classList.remove('added');
      target.textContent = '셀렉션 담기';
    }, 1500);
  }
}

function handleSelectionClick(event) {
  const target = event.target;
  if (target.matches('[data-remove]')) {
    const id = target.getAttribute('data-remove');
    selection.delete(id);
    renderSelectionList();
  }
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

function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const filter = button.getAttribute('data-filter');
      renderLookbook(filter);
    });
  });
}

function setupSignupModal() {
  const modal = document.getElementById('signup-modal');
  const trigger = document.getElementById('signup-trigger');

  if (!modal || !trigger) return;

  const dismissElements = modal.querySelectorAll('[data-dismiss="modal"]');
  const tabs = modal.querySelectorAll('.modal-tab');
  const forms = modal.querySelectorAll('.signup-form');

  const openModal = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };

  const activateTab = target => {
    tabs.forEach(tab => {
      const isActive = tab === target;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    forms.forEach(form => {
      const isActive = form.dataset.type === target.dataset.tab;
      form.classList.toggle('active', isActive);
      form.setAttribute('aria-hidden', String(!isActive));
    });
  };

  trigger.addEventListener('click', openModal);
  dismissElements.forEach(element => {
    element.addEventListener('click', closeModal);
  });

  modal.addEventListener('click', event => {
    if (event.target.matches('.modal-backdrop')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab));
  });
}

function setupSignupForm(formId, feedbackId, type) {
  const form = document.getElementById(formId);
  const feedback = document.getElementById(feedbackId);

  if (!form || !feedback) return;

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

function setupStudioForm() {
  const form = document.getElementById('studio-request');
  const feedback = document.getElementById('studio-feedback');

  if (!form || !feedback) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    feedback.textContent = '스튜디오 요청이 접수되었습니다. 운영팀이 승인 후 안내드립니다.';
    form.reset();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderLookbook();
  renderSelectionList();
  document.getElementById('lookbook-grid').addEventListener('click', handleLookbookClick);
  document.getElementById('selection-list').addEventListener('click', handleSelectionClick);
  document.getElementById('export-looksheet').addEventListener('click', exportLooksheet);
  initFilters();
  setupSignupModal();
  setupSignupForm('wholesale-form', 'wholesale-feedback', 'wholesale');
  setupSignupForm('seller-form', 'seller-feedback', 'seller');
  setupStudioForm();
});
