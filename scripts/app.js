const LOOKS_PER_BATCH = 8;
const ROTATION_INTERVAL = 1000;

const state = {
  filter: 'all',
  cursor: 0,
  grid: null,
  loader: null,
  sentinel: null,
  observer: null,
  cards: new Map(),
  autoRotateObserver: null,
  selection: new Map(),
  modal: {
    root: null,
    dialog: null,
    media: null,
    body: null,
    activeId: null,
    galleryTimers: new Map(),
  },
};

function getLookData() {
  const base = (window.LUCE_DEMO && Array.isArray(window.LUCE_DEMO.LOOKS)) ? window.LUCE_DEMO.LOOKS : [];
  const stored = window.LUCE_DEMO?.getStoredProducts?.() || [];

  if (!stored.length) {
    return base;
  }

  const normalizedStored = stored
    .filter(item => item && item.title && item.category && Array.isArray(item.gallery) && item.gallery.length)
    .map(item => ({
      ...item,
      price: Number(item.price) || Number(item.retailPrice) || 0,
      supplierName: item.supplierName || item.supplier?.brand || 'Demo Supplier',
      supplierId: item.supplierId || (item.supplier && item.supplier.id) || '',
    }));

  return [...base, ...normalizedStored];
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
    case 'food':
      return '식품';
    case 'etc':
      return '기타';
    default:
      return category;
  }
}

function formatPrice(value) {
  if (typeof value !== 'number') {
    return value;
  }
  return `₩${value.toLocaleString('ko-KR')}`;
}

function setupMetrics() {
  const metrics = window.LUCE_DEMO?.METRICS;
  const totals = metrics || { products: getLookData().length, suppliers: 0, sellers: 0, members: 0 };

  const productEl = document.getElementById('metric-products');
  const supplierEl = document.getElementById('metric-suppliers');
  const sellerEl = document.getElementById('metric-sellers');
  const memberEl = document.getElementById('metric-members');
  const updatedEl = document.getElementById('metric-updated');
  const errorEl = document.getElementById('metric-error');

  if (errorEl) {
    errorEl.hidden = true;
  }

  if (productEl) {
    const productCount = getLookData().length;
    productEl.textContent = productCount.toLocaleString('ko-KR');
  }
  if (supplierEl) {
    supplierEl.textContent = totals.suppliers.toLocaleString('ko-KR');
  }
  if (sellerEl) {
    sellerEl.textContent = totals.sellers.toLocaleString('ko-KR');
  }
  if (memberEl) {
    memberEl.textContent = totals.members.toLocaleString('ko-KR');
  }
  if (updatedEl) {
    const now = new Date();
    updatedEl.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}

function createCard(look) {
  const card = document.createElement('article');
  card.className = 'look-card';
  card.dataset.id = look.id;
  card.innerHTML = `
    <button type="button" class="look-thumb" aria-label="${look.title} 상세 보기">
      <img src="${look.gallery[0]}" alt="${look.title} 썸네일" loading="lazy" />
      <span class="look-chip">${translateCategory(look.category)}</span>
    </button>
    <div class="look-info">
      <h3>${look.title}</h3>
      <p class="look-supplier">${look.supplierName}</p>
      <p class="look-price">${formatPrice(look.price)}</p>
    </div>
    <button type="button" class="look-action" data-add-to-selection>셀렉션 담기</button>
  `;

  const mediaButton = card.querySelector('.look-thumb');
  const image = card.querySelector('img');

  if (mediaButton && image) {
    const startRotation = () => startCardRotation(card, look, image);
    const stopRotation = () => stopCardRotation(card);

    mediaButton.addEventListener('mouseenter', startRotation);
    mediaButton.addEventListener('mouseleave', stopRotation);
    mediaButton.addEventListener('focus', startRotation);
    mediaButton.addEventListener('blur', stopRotation);

    mediaButton.addEventListener('click', event => {
      event.preventDefault();
      openLookModal(look);
    });

    registerAutoRotateTarget(mediaButton, () => startCardRotation(card, look, image), () => stopCardRotation(card));
  }

  const addButton = card.querySelector('[data-add-to-selection]');
  if (addButton) {
    addButton.addEventListener('click', event => {
      event.stopPropagation();
      addToSelection(look);
    });
  }

  return card;
}

function startCardRotation(card, look, imageEl) {
  if (!card || !look || !imageEl) {
    return;
  }

  if (state.cards.has(card)) {
    return;
  }

  let index = 0;
  const intervalId = window.setInterval(() => {
    index = (index + 1) % look.gallery.length;
    imageEl.src = look.gallery[index];
  }, ROTATION_INTERVAL);

  state.cards.set(card, {
    stop() {
      window.clearInterval(intervalId);
      state.cards.delete(card);
      imageEl.src = look.gallery[0];
    },
  });
}

function stopCardRotation(card) {
  const timer = state.cards.get(card);
  if (!timer) {
    return;
  }
  timer.stop();
}

function registerAutoRotateTarget(target, start, stop) {
  if (typeof window === 'undefined') {
    return;
  }

  const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)');
  if (!mediaQuery.matches) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    return;
  }

  if (!state.autoRotateObserver) {
    state.autoRotateObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const callbacks = entry.target.__luceAutoRotate;
        if (!callbacks) {
          return;
        }
        if (entry.isIntersecting) {
          callbacks.start();
        } else {
          callbacks.stop();
        }
      });
    }, { threshold: 0.3 });
  }

  target.__luceAutoRotate = { start, stop };
  state.autoRotateObserver.observe(target);
}

function resetGrid() {
  state.cursor = 0;
  if (state.grid) {
    state.grid.innerHTML = '';
  }
  loadNextBatch();
}

function loadNextBatch() {
  if (!state.grid || state.cursor === null) {
    return;
  }

  const data = getLookData();
  const filtered = state.filter === 'all' ? data : data.filter(item => item.category === state.filter);

  if (state.cursor >= filtered.length) {
    if (state.loader) {
      state.loader.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  const nextSlice = filtered.slice(state.cursor, state.cursor + LOOKS_PER_BATCH);
  nextSlice.forEach(item => {
    const card = createCard(item);
    state.grid.appendChild(card);
  });

  syncSelectionButtons();

  state.cursor += nextSlice.length;

  if (state.loader) {
    const hidden = state.cursor >= filtered.length;
    state.loader.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    state.loader.textContent = hidden ? '모든 룩을 확인했습니다.' : '다음 룩을 불러오는 중...';
  }
}

function setupSentinel() {
  if (!state.sentinel || !('IntersectionObserver' in window)) {
    return;
  }

  if (state.observer) {
    state.observer.disconnect();
  }

  state.observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadNextBatch();
      }
    });
  }, { rootMargin: '0px 0px 320px' });

  state.observer.observe(state.sentinel);
}

function setupFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';
      if (state.filter === filter) {
        return;
      }
      state.filter = filter;
      buttons.forEach(btn => btn.classList.toggle('active', btn === button));
      resetGrid();
    });
  });
}

function openLookModal(look) {
  if (!state.modal.root || !state.modal.dialog || !state.modal.media || !state.modal.body) {
    return;
  }

  state.modal.activeId = look.id;
  state.modal.media.innerHTML = '';
  state.modal.body.innerHTML = '';

  const galleryList = document.createElement('div');
  galleryList.className = 'look-modal__gallery';

  look.gallery.forEach((url, index) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `${look.title} 상세 이미지 ${index + 1}`;
    img.loading = 'lazy';
    galleryList.appendChild(img);
  });

  state.modal.media.appendChild(galleryList);

  const bodyFragment = document.createDocumentFragment();
  const heading = document.createElement('h3');
  heading.id = 'look-modal-title';
  heading.textContent = look.title;
  bodyFragment.appendChild(heading);

  const supplier = document.createElement('p');
  supplier.className = 'look-modal__supplier';
  supplier.textContent = `${look.supplierName} · ${translateCategory(look.category)}`;
  bodyFragment.appendChild(supplier);

  const price = document.createElement('p');
  price.className = 'look-modal__price';
  price.textContent = formatPrice(look.price);
  bodyFragment.appendChild(price);

  if (look.description) {
    const desc = document.createElement('p');
    desc.className = 'look-modal__description';
    desc.textContent = look.description;
    bodyFragment.appendChild(desc);
  }

  if (look.specs) {
    const specs = document.createElement('p');
    specs.className = 'look-modal__specs';
    specs.textContent = look.specs;
    bodyFragment.appendChild(specs);
  }

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'btn secondary';
  addButton.textContent = '셀렉션에 담기';
  addButton.addEventListener('click', () => {
    addToSelection(look);
    closeLookModal();
  });
  bodyFragment.appendChild(addButton);

  state.modal.body.appendChild(bodyFragment);

  state.modal.root.removeAttribute('aria-hidden');
  state.modal.root.classList.add('is-open');
  state.modal.dialog.focus();
}

function closeLookModal() {
  if (!state.modal.root || !state.modal.dialog) {
    return;
  }
  state.modal.root.setAttribute('aria-hidden', 'true');
  state.modal.root.classList.remove('is-open');
  state.modal.activeId = null;
}

function setupModal() {
  const modal = document.getElementById('look-modal');
  if (!modal) {
    return;
  }

  state.modal.root = modal;
  state.modal.dialog = modal.querySelector('.look-modal__dialog');
  state.modal.media = document.getElementById('look-modal-media');
  state.modal.body = document.getElementById('look-modal-body');

  modal.addEventListener('click', event => {
    if (event.target.matches('[data-modal-close]')) {
      closeLookModal();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hasAttribute('aria-hidden')) {
      closeLookModal();
    }
  });
}

function addToSelection(look) {
  if (!look) {
    return;
  }

  if (!state.selection.has(look.id)) {
    state.selection.set(look.id, { look, quantity: 1 });
  } else {
    const entry = state.selection.get(look.id);
    entry.quantity += 1;
  }

  renderSelection();
}

function removeFromSelection(id) {
  if (!state.selection.has(id)) {
    return;
  }
  state.selection.delete(id);
  renderSelection();
}

function renderSelection() {
  const list = document.getElementById('selection-list');
  const summary = document.getElementById('selection-summary');

  if (!list || !summary) {
    return;
  }

  list.innerHTML = '';

  if (!state.selection.size) {
    summary.innerHTML = '<h3>요약</h3><p>현재 담은 룩이 없습니다.</p>';
    syncSelectionButtons();
    return;
  }

  const summaryData = {
    total: 0,
    price: 0,
    categories: new Map(),
  };

  state.selection.forEach(({ look, quantity }) => {
    const item = document.createElement('li');
    item.className = 'selection-item';
    item.innerHTML = `
      <div class="selection-item__meta">
        <p class="selection-item__title">${look.title}</p>
        <p class="selection-item__supplier">${look.supplierName} · ${translateCategory(look.category)}</p>
      </div>
      <div class="selection-item__actions">
        <span>${quantity}개</span>
        <button type="button" class="btn ghost" data-remove="${look.id}">제거</button>
      </div>
    `;

    item.querySelector('[data-remove]')?.addEventListener('click', () => removeFromSelection(look.id));
    list.appendChild(item);

    summaryData.total += quantity;
    summaryData.price += look.price * quantity;
    summaryData.categories.set(look.category, (summaryData.categories.get(look.category) || 0) + quantity);
  });

  const categorySummary = Array.from(summaryData.categories.entries())
    .map(([cat, qty]) => `${translateCategory(cat)} ${qty}개`)
    .join(' · ');

  summary.innerHTML = `
    <h3>요약</h3>
    <p>총 ${summaryData.total}개의 룩을 담았습니다.</p>
    <p>${categorySummary}</p>
    <p>예상 소매가 합계 ${formatPrice(summaryData.price)}</p>
  `;

  syncSelectionButtons();
}

function setupSelectionExport() {
  const exportBtn = document.getElementById('export-looksheet');
  if (!exportBtn) {
    return;
  }

  exportBtn.addEventListener('click', () => {
    if (!state.selection.size) {
      window.alert('셀렉션에 담긴 룩이 없습니다.');
      return;
    }

    const lines = [];
    state.selection.forEach(({ look, quantity }) => {
      lines.push(`${look.title} · ${translateCategory(look.category)} · ${formatPrice(look.price)} · ${quantity}개`);
    });

    const summary = lines.join('\n');
    try {
      navigator.clipboard.writeText(summary);
      window.alert('룩시트 요약을 클립보드에 복사했습니다.');
    } catch (error) {
      window.prompt('다음 내용을 복사하세요:', summary);
    }
  });
}

function setupStudioForm() {
  const form = document.getElementById('studio-request');
  if (!form) {
    return;
  }

  const feedback = document.getElementById('studio-feedback');

  form.addEventListener('submit', event => {
    event.preventDefault();

    if (!state.selection.size) {
      if (feedback) {
        feedback.textContent = '셀렉션에 룩을 담아야 스튜디오 요청이 가능합니다.';
        feedback.classList.add('error');
      }
      return;
    }

    const formData = new FormData(form);
    const seller = String(formData.get('studio-seller') || '').trim();
    const date = formData.get('studio-date');
    const channel = formData.get('studio-channel');

    if (!seller || !date || !channel) {
      if (feedback) {
        feedback.textContent = '필수 정보를 모두 입력해주세요.';
        feedback.classList.add('error');
      }
      return;
    }

    form.reset();
    if (feedback) {
      feedback.textContent = `${seller}님의 요청이 접수되었습니다. 운영팀에서 24시간 내 확인 후 연락드립니다.`;
      feedback.classList.remove('error');
    }
  });
}

function syncSelectionButtons() {
  const buttons = document.querySelectorAll('[data-add-to-selection]');
  if (!buttons.length) {
    return;
  }

  const selectedIds = new Set(state.selection.keys());

  buttons.forEach(button => {
    const card = button.closest('.look-card');
    const id = card?.dataset.id;
    if (id && selectedIds.has(id)) {
      button.classList.add('added');
      button.textContent = '셀렉션 담김';
    } else {
      button.classList.remove('added');
      button.textContent = '셀렉션 담기';
    }
  });
}

function setupNavigation() {
  const sections = document.querySelectorAll('[data-view-section]');
  const navLinks = document.querySelectorAll('[data-view-target]');

  if (!sections.length || !navLinks.length) {
    return;
  }

  const activate = id => {
    sections.forEach(section => {
      const match = section.dataset.viewSection === id;
      section.setAttribute('aria-hidden', match ? 'false' : 'true');
      section.classList.toggle('is-active', match);
    });

    navLinks.forEach(link => {
      const match = link.dataset.viewTarget === id;
      link.classList.toggle('active', match);
    });
  };

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const id = link.dataset.viewTarget;
      activate(id);
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  activate('lookbook');
}

function setupSignupForms() {
  const forms = document.querySelectorAll('form[data-signup-type]');
  if (!forms.length) {
    return;
  }

  const updateCounters = form => {
    const countedFields = form.querySelectorAll('[data-count-max]');
    countedFields.forEach(field => {
      const event = new Event('input');
      field.dispatchEvent(event);
    });
  };

  forms.forEach(form => {
    const feedbackId = form.dataset.feedbackTarget;
    const feedback = feedbackId ? document.getElementById(feedbackId) : null;
    const type = form.dataset.signupType;

    form.addEventListener('submit', event => {
      event.preventDefault();

      const data = new FormData(form);
      const payload = {};
      const attachments = [];

      data.forEach((value, rawKey) => {
        const key = rawKey.endsWith('[]') ? rawKey.slice(0, -2) : rawKey;

        if (value instanceof File) {
          if (value.name) {
            attachments.push({
              name: value.name,
              size: value.size,
              type: value.type,
            });
          }
          return;
        }

        const normalized = typeof value === 'string' ? value.trim() : value;
        if (!key) {
          return;
        }

        if (Object.prototype.hasOwnProperty.call(payload, key)) {
          if (!Array.isArray(payload[key])) {
            payload[key] = [payload[key]];
          }
          payload[key].push(normalized);
        } else {
          payload[key] = normalized;
        }
      });

      if (attachments.length) {
        payload.attachments = attachments;
      }

      if (!payload.email || !payload.password) {
        if (feedback) {
          feedback.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
          feedback.classList.add('error');
        }
        return;
      }

      window.LUCE_DEMO?.addSignup(type, payload);

      form.reset();
      updateCounters(form);

      if (feedback) {
        feedback.textContent = '신청이 접수되었습니다. 운영팀이 곧 연락드릴게요.';
        feedback.classList.remove('error');
      }
    });
  });
}

function setupCharacterCounters() {
  const fields = document.querySelectorAll('[data-count-max]');
  if (!fields.length) {
    return;
  }

  fields.forEach(field => {
    const max = parseInt(field.dataset.countMax, 10);
    if (!max) {
      return;
    }

    const group = field.closest('.form-group');
    const counter = group ? group.querySelector('[data-count-output]') : null;
    if (!counter) {
      return;
    }

    const update = () => {
      const length = field.value.length;
      counter.textContent = String(length);
      counter.dataset.state = length > max ? 'over' : 'ok';
    };

    field.addEventListener('input', update);
    update();
  });
}

function setupTestAccountBadge() {
  const metrics = document.getElementById('lookbook-metrics');
  if (!metrics || !window.LUCE_DEMO?.SUPPLIERS?.length) {
    return;
  }

  const badge = document.createElement('div');
  badge.className = 'metric-card metric-card--notice';
  const supplier = window.LUCE_DEMO.SUPPLIERS[0];
  badge.innerHTML = `
    <p class="metric-label">테스트 계정</p>
    <p class="metric-value small">${supplier.email}</p>
    <p class="metric-caption">비밀번호 ${supplier.password}</p>
  `;

  metrics.appendChild(badge);
}

function initializeLookbook() {
  state.grid = document.getElementById('lookbook-grid');
  state.loader = document.getElementById('lookbook-loader');
  state.sentinel = document.getElementById('lookbook-sentinel');

  if (!state.grid || !state.loader || !state.sentinel) {
    return;
  }

  state.cards.forEach(timer => timer.stop?.());
  state.cards.clear();

  setupMetrics();
  setupTestAccountBadge();
  setupFilters();
  setupModal();
  renderSelection();
  setupSelectionExport();
  setupStudioForm();
  setupNavigation();
  resetGrid();
  setupSentinel();
}

function initializeSignup() {
  setupSignupForms();
  setupCharacterCounters();
}

function boot() {
  window.LUCE_DEMO?.seedDemoAccounts?.();
  initializeLookbook();
  initializeSignup();
}

document.addEventListener('DOMContentLoaded', boot);
