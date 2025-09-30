const lookbookData = [
  {
    id: 'LB-001',
    title: '샤이닝 레이스 드레스',
    category: 'dress',
    price: '도매 49,000',
    fit: 'FREE (44-66)',
    specs: '어깨 37 · 가슴 47 · 총장 118 · 폴리 92% 스판 8%',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-002',
    title: '엘리 캐시미어 가디건',
    category: 'top',
    price: '도매 39,000',
    fit: 'FREE (44-66)',
    specs: '어깨 40 · 가슴 52 · 총장 58 · 울 10% 나일론 50% 폴리 40%',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-003',
    title: '미드나잇 트위드 자켓',
    category: 'outer',
    price: '도매 62,000',
    fit: 'S / M',
    specs: '어깨 38 · 가슴 49 · 총장 70 · 폴리 80% 울 20%',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-004',
    title: '시그니처 라인 스커트',
    category: 'bottom',
    price: '도매 29,000',
    fit: 'S / M / L',
    specs: '허리 33 · 엉덩이 46 · 총장 78 · 폴리 70% 레이온 30%',
    image: 'https://images.unsplash.com/photo-1542293787938-4d2226c55b05?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-005',
    title: '페어리 오간자 블라우스',
    category: 'top',
    price: '도매 32,000',
    fit: 'FREE (44-66)',
    specs: '어깨 36 · 가슴 50 · 총장 64 · 폴리 100%',
    image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-006',
    title: '하이라이트 플레어 드레스',
    category: 'dress',
    price: '도매 55,000',
    fit: 'S / M',
    specs: '어깨 36 · 가슴 45 · 총장 112 · 폴리 95% 스판 5%',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-007',
    title: '베이직 린넨 셔츠',
    category: 'top',
    price: '도매 27,000',
    fit: 'FREE (44-77)',
    specs: '어깨 44 · 가슴 56 · 총장 70 · 린넨 55% 코튼 45%',
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-008',
    title: '클라우드 퀼팅 패딩',
    category: 'outer',
    price: '도매 79,000',
    fit: 'FREE (66-88)',
    specs: '어깨 45 · 가슴 58 · 총장 78 · 폴리 100% (충전재: 웰론)',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'LB-009',
    title: '모던 트위스트 백',
    category: 'accessory',
    price: '도매 19,000',
    fit: 'ONE SIZE',
    specs: '가로 27 · 세로 18 · 폭 8 · 합성가죽 100%',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
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
      <img src="${item.image}" alt="${item.title}">
      <div class="look-content">
        <div>
          <p class="tag">${item.id}</p>
          <h3>${item.title}</h3>
          <div class="look-meta">
            <span>${item.price}</span>
            <span>${item.fit}</span>
          </div>
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
    case 'top':
      return '상의';
    case 'bottom':
      return '하의';
    case 'dress':
      return '원피스';
    case 'outer':
      return '아우터';
    case 'accessory':
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
    lines.push(`도매가: ${item.price} / 핏: ${item.fit}`);
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

function handleFormSubmission(formId, feedbackId) {
  const form = document.getElementById(formId);
  const feedback = document.getElementById(feedbackId);

  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    console.table(payload);
    feedback.textContent = '신청이 접수되었습니다. 담당자가 24시간 내 연락드립니다.';
    form.reset();
  });
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

document.addEventListener('DOMContentLoaded', () => {
  renderLookbook();
  renderSelectionList();
  document.getElementById('lookbook-grid').addEventListener('click', handleLookbookClick);
  document.getElementById('selection-list').addEventListener('click', handleSelectionClick);
  document.getElementById('export-looksheet').addEventListener('click', exportLooksheet);
  handleFormSubmission('wholesale-form', 'wholesale-feedback');
  handleFormSubmission('seller-form', 'seller-feedback');
  handleFormSubmission('studio-request', 'studio-feedback');
  initFilters();
});
