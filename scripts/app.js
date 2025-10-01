const LOOKS_PER_BATCH = 9;
const LOOK_ROTATION_INTERVAL = 1000;

let lookbookCatalog = [];
const lookbookIndex = new Map();

const lookbookState = {
  filter: 'all',
  cursors: new Map(),
  grid: null,
  loader: null,
  sentinel: null,
  observer: null,
  isLoading: false,
  isFetching: false,
  hasLoaded: false,
  loadError: null,
};

const selection = new Map();

const lookModalState = {
  root: null,
  dialog: null,
  media: null,
  body: null,
  activeItemId: null,
};

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
      return category;
  }
}

function normalizeProduct(raw) {
  const gallery = Array.isArray(raw.gallery)
    ? raw.gallery.filter(url => typeof url === 'string' && url.trim().length).map(url => url.trim())
    : [];

  const image = raw.image || gallery[0] || '';
  const normalizedGallery = gallery.length ? gallery : image ? [image] : [];

  return {
    id: raw.id,
    title: raw.title,
    category: raw.category,
    price: raw.retailPrice ? `소매가 ${raw.retailPrice}` : '소매가 정보 없음',
    retailPrice: raw.retailPrice || '',
    fit: raw.fit || '',
    specs: raw.specs || '',
    description: raw.description || '',
    image,
    gallery: normalizedGallery,
    supplier: raw.supplier || null,
    createdAt: raw.createdAt || null,
  };
}

async function reloadLookbookCatalog() {
  lookbookState.isFetching = true;
  lookbookState.loadError = null;

  try {
    if (lookbookState.loader) {
      lookbookState.loader.classList.add('active');
    }

    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('상품 정보를 불러오는 중 문제가 발생했습니다.');
    }

    const payload = await response.json();
    lookbookCatalog = Array.isArray(payload) ? payload.map(normalizeProduct) : [];
    lookbookIndex.clear();
    lookbookCatalog.forEach(item => {
      lookbookIndex.set(item.id, item);
    });
    lookbookState.cursors.clear();
    lookbookState.hasLoaded = true;
  } catch (error) {
    lookbookCatalog = [];
    lookbookIndex.clear();
    lookbookState.cursors.clear();
    lookbookState.hasLoaded = true;
    lookbookState.loadError = error.message || '상품 정보를 불러오지 못했습니다.';
  } finally {
    lookbookState.isFetching = false;
    if (lookbookState.loader) {
      lookbookState.loader.classList.remove('active');
    }
  }
}

function getLookbookSource(filter) {
  if (filter === 'all') {
    return lookbookCatalog;
  }

  return lookbookCatalog.filter(item => item.category === filter);
}

function createLookCard(item, sequence = 1) {
  const gallery = item.gallery && item.gallery.length ? item.gallery : [item.image];

  const card = document.createElement('article');
  card.className = 'look-card';
  card.dataset.lookId = item.id;
  card.dataset.sequence = sequence;

  const thumb = document.createElement('div');
  thumb.className = 'look-thumb';
  thumb.tabIndex = 0;

  const img = document.createElement('img');
  img.src = gallery[0];
  img.alt = item.title;

  let rotationInterval = null;
  let rotationIndex = 0;

  const stopRotation = () => {
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
    rotationIndex = 0;
    img.src = gallery[0];
  };

  const startRotation = () => {
    if (gallery.length < 2 || rotationInterval) {
      return;
    }
    rotationIndex = 1;
    rotationInterval = setInterval(() => {
      img.src = gallery[rotationIndex];
      rotationIndex = (rotationIndex + 1) % gallery.length;
    }, LOOK_ROTATION_INTERVAL);
  };

  thumb.addEventListener('mouseenter', startRotation);
  thumb.addEventListener('mouseleave', stopRotation);
  thumb.addEventListener('focus', startRotation);
  thumb.addEventListener('blur', stopRotation);

  thumb.appendChild(img);
  card.appendChild(thumb);

  const info = document.createElement('div');
  info.className = 'look-info';
  info.innerHTML = `
    <h3>${item.title}</h3>
    <p class="look-price">${item.price}</p>
  `;
  card.appendChild(info);

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'look-action';
  action.dataset.add = item.id;
  action.textContent = '셀렉션 담기';
  action.addEventListener('click', event => {
    event.stopPropagation();
  });
  card.appendChild(action);

  return card;
}

function appendLookbookBatch(filter, count = LOOKS_PER_BATCH) {
  const { grid, loader, sentinel } = lookbookState;
  if (!grid || lookbookState.isLoading) return false;

  const source = getLookbookSource(filter);
  const startIndex = lookbookState.cursors.get(filter) || 0;

  if (!source.length || startIndex >= source.length) {
    if (sentinel) {
      sentinel.style.display = 'none';
    }
    return false;
  }

  lookbookState.isLoading = true;
  if (loader) {
    loader.classList.add('active');
  }

  const fragment = document.createDocumentFragment();
  const slice = source.slice(startIndex, startIndex + count);
  slice.forEach((item, index) => {
    fragment.appendChild(createLookCard(item, startIndex + index + 1));
  });

  grid.appendChild(fragment);
  const nextIndex = startIndex + slice.length;
  lookbookState.cursors.set(filter, nextIndex);

  if (loader) {
    loader.classList.remove('active');
  }
  lookbookState.isLoading = false;

  if (nextIndex >= source.length && sentinel) {
    sentinel.style.display = 'none';
    if (lookbookState.observer) {
      lookbookState.observer.unobserve(sentinel);
    }
  }

  return slice.length > 0;
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

  if (!lookbookState.hasLoaded) {
    grid.innerHTML = '<p class="empty">룩북 데이터를 불러오는 중입니다...</p>';
    if (sentinel && observer) {
      observer.unobserve(sentinel);
    }
    return;
  }

  if (lookbookState.loadError) {
    grid.innerHTML = `<p class="empty">${lookbookState.loadError}</p>`;
    if (sentinel && observer) {
      observer.unobserve(sentinel);
    }
    return;
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

  appendLookbookBatch(filter, LOOKS_PER_BATCH);

  if (sentinel) {
    const cursor = lookbookState.cursors.get(filter) || 0;
    if (cursor >= dataset.length) {
      sentinel.style.display = 'none';
    }
  }
}

function closeLookModal() {
  if (!lookModalState.root) {
    return;
  }

  lookModalState.root.classList.remove('is-open');
  lookModalState.root.setAttribute('aria-hidden', 'true');
  lookModalState.activeItemId = null;

  if (lookModalState.dialog) {
    lookModalState.dialog.blur();
  }
}

function openLookModal(item) {
  if (!lookModalState.root || !lookModalState.media || !lookModalState.body) {
    return;
  }

  const gallery = item.gallery && item.gallery.length ? item.gallery : [item.image];
  lookModalState.media.innerHTML = gallery
    .map((src, index) => `<img src="${src}" alt="${item.title} 상세 이미지 ${index + 1}">`)
    .join('');

  lookModalState.body.innerHTML = `
    <header class="modal-header">
      <p class="modal-category">${translateCategory(item.category)}</p>
      <h2 id="look-modal-title">${item.title}</h2>
    </header>
    <p class="modal-price">${item.price}</p>
    <p class="modal-fit">${item.fit}</p>
    <p class="modal-description">${item.description}</p>
    <div class="modal-specs">
      <h3>상세 스펙</h3>
      <p>${item.specs}</p>
    </div>
    <button type="button" class="btn primary modal-add" data-modal-add="${item.id}">셀렉션 담기</button>
  `;

  lookModalState.activeItemId = item.id;
  lookModalState.root.classList.add('is-open');
  lookModalState.root.setAttribute('aria-hidden', 'false');

  if (lookModalState.dialog) {
    lookModalState.dialog.focus();
  }
}

function initializeLookModal() {
  const root = document.getElementById('look-modal');
  const media = document.getElementById('look-modal-media');
  const body = document.getElementById('look-modal-body');
  const dialog = root?.querySelector('.look-modal__dialog');

  if (!root || !media || !body || !dialog) {
    return;
  }

  lookModalState.root = root;
  lookModalState.media = media;
  lookModalState.body = body;
  lookModalState.dialog = dialog;

  root.addEventListener('click', event => {
    const closeTrigger = event.target.closest('[data-modal-close]');
    if (closeTrigger) {
      event.preventDefault();
      closeLookModal();
      return;
    }

    const addTrigger = event.target.closest('[data-modal-add]');
    if (addTrigger) {
      const id = addTrigger.getAttribute('data-modal-add');
      addToSelection(id, addTrigger);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && root.classList.contains('is-open')) {
      closeLookModal();
    }
  });
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

  grid.innerHTML = '<p class="empty">룩북 데이터를 불러오는 중입니다...</p>';
  sentinel.style.display = 'none';

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

  reloadLookbookCatalog()
    .catch(() => {
      /* 에러 상태는 reloadLookbookCatalog 내부에서 관리 */
    })
    .finally(() => {
      applyLookbookFilter(defaultFilter, setActiveButton);
    });
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

function addToSelection(id, feedbackTarget) {
  const item = lookbookIndex.get(id);
  if (!item) {
    return;
  }

  selection.set(id, item);
  renderSelectionList();

  if (feedbackTarget) {
    feedbackTarget.classList.add('added');
    feedbackTarget.textContent = '셀렉션 담김';
    setTimeout(() => {
      feedbackTarget.classList.remove('added');
      feedbackTarget.textContent = '셀렉션 담기';
    }, 1500);
  }
}

function handleLookbookClick(event) {
  const target = event.target;
  if (target.matches('[data-add]')) {
    event.stopPropagation();
    const id = target.getAttribute('data-add');
    addToSelection(id, target);
    return;
  }

  const card = target.closest('.look-card');
  if (!card) {
    return;
  }

  const id = card.dataset.lookId;
  const item = lookbookIndex.get(id);
  if (!item) {
    return;
  }

  openLookModal(item);
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
    const priceText = item.retailPrice ? `소매가: ${item.retailPrice}` : item.price;
    lines.push(`${priceText} / 구성: ${item.fit}`);
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
  initializeLookModal();
  initializeSelection();
  setupStudioAndSignup();
});
