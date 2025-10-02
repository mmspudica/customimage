const adminState = {
  supplier: null,
  products: [],
  tableBody: null,
  feedback: null,
  supplierSummary: null,
  supplierNameLabel: null,
  supplierHiddenInput: null,
  logoutButton: null,
};

function formatDate(value) {
  if (!value) {
    return '-';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } catch (error) {
    return value;
  }
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
      return category;
  }
}

function redirectToLogin() {
  const params = new URLSearchParams({ redirect: 'admin.html' });
  window.location.replace(`login.html?${params.toString()}`);
}

function updateSupplierUI() {
  const { supplier, supplierSummary, supplierNameLabel, supplierHiddenInput, logoutButton } = adminState;

  if (supplierNameLabel) {
    supplierNameLabel.textContent = supplier ? supplier.brand : '-';
  }

  if (supplierSummary) {
    supplierSummary.textContent = supplier
      ? `${supplier.brand} · ${supplier.email}`
      : '로그인이 필요합니다';
  }

  if (supplierHiddenInput) {
    supplierHiddenInput.value = supplier ? supplier.id : '';
  }

  if (logoutButton) {
    logoutButton.disabled = !supplier;
  }
}

function renderProducts() {
  const { tableBody, products } = adminState;
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '';

  if (!products.length) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    row.innerHTML = '<td colspan="5">등록된 상품이 없습니다. 상단 폼에서 첫 상품을 등록하세요.</td>';
    tableBody.appendChild(row);
    return;
  }

  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="product-name">${product.title}</div>
      </td>
      <td>${translateCategory(product.category)}</td>
      <td>${product.retailPrice || '-'}</td>
      <td>${product.supplier?.brand || '-'}</td>
      <td>${formatDate(product.createdAt)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function loadProducts() {
  if (!adminState.supplier) {
    return;
  }

  const products = window.LUCE_DEMO?.getProductsBySupplier
    ? window.LUCE_DEMO.getProductsBySupplier(adminState.supplier.id)
    : [];

  adminState.products = Array.isArray(products)
    ? products.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  renderProducts();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('이미지를 불러오지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) {
    return;
  }

  if (!adminState.supplier) {
    if (adminState.feedback) {
      adminState.feedback.textContent = '공급업체 로그인 후 상품을 등록할 수 있습니다.';
      adminState.feedback.classList.add('error');
    }
    return;
  }

  if (adminState.feedback) {
    adminState.feedback.textContent = '';
    adminState.feedback.classList.remove('error');
  }

  submitButton.disabled = true;
  const originalLabel = submitButton.textContent;
  submitButton.textContent = '등록 중...';

  const formData = new FormData(form);
  formData.set('supplierId', adminState.supplier.id);

  const textFields = ['title', 'category', 'retailPrice', 'fit', 'specs', 'description'];
  textFields.forEach(field => {
    const value = formData.get(field);
    if (typeof value === 'string') {
      formData.set(field, value.trim());
    }
  });

  const thumbnail = formData.get('thumbnail');
  const galleryFiles = formData
    .getAll('gallery')
    .filter(file => file instanceof File && file.name)
    .slice(0, 5);

  if (!(thumbnail instanceof File) || !thumbnail.size) {
    if (adminState.feedback) {
      adminState.feedback.textContent = '썸네일 이미지를 업로드해주세요.';
      adminState.feedback.classList.add('error');
    }
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
    return;
  }

  if (!galleryFiles.length) {
    if (adminState.feedback) {
      adminState.feedback.textContent = '상세 이미지를 최소 1장 이상 업로드해주세요.';
      adminState.feedback.classList.add('error');
    }
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
    return;
  }

  try {
    if (!window.LUCE_DEMO || typeof window.LUCE_DEMO.addProduct !== 'function') {
      throw new Error('데모 데이터 모듈을 찾을 수 없습니다.');
    }

    const thumbnailUrl = await readFileAsDataURL(thumbnail);
    const galleryUrls = await Promise.all(galleryFiles.map(readFileAsDataURL));

    const payload = {
      supplierId: adminState.supplier.id,
      title: formData.get('title'),
      category: formData.get('category'),
      retailPrice: formData.get('retailPrice'),
      fit: formData.get('fit'),
      specs: formData.get('specs'),
      description: formData.get('description'),
      thumbnail: thumbnailUrl,
      gallery: galleryUrls,
    };

    const product = window.LUCE_DEMO.addProduct(payload);

    if (adminState.feedback) {
      adminState.feedback.textContent = `'${product.title}' 상품이 룩북에 등록되었습니다.`;
      adminState.feedback.classList.remove('error');
    }

    form.reset();
    loadProducts();
  } catch (error) {
    if (adminState.feedback) {
      adminState.feedback.textContent = error.message || '상품 등록에 실패했습니다. 잠시 후 다시 시도해주세요.';
      adminState.feedback.classList.add('error');
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

function initializeForm() {
  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', handleProductSubmit);
  }
}

function initializeLogout() {
  const button = document.getElementById('logout-button');
  if (!button) {
    return;
  }

  adminState.logoutButton = button;
  button.addEventListener('click', () => {
    if (window.LUCE_DEMO && typeof window.LUCE_DEMO.logoutSupplier === 'function') {
      window.LUCE_DEMO.logoutSupplier();
    }
    redirectToLogin();
  });
}

function initializeAdmin() {
  adminState.tableBody = document.getElementById('product-table-body');
  adminState.feedback = document.getElementById('product-feedback');
  adminState.supplierSummary = document.getElementById('supplier-summary');
  adminState.supplierNameLabel = document.getElementById('admin-supplier-name');
  adminState.supplierHiddenInput = document.getElementById('supplier-id');

  const supplier = window.LUCE_DEMO?.getActiveSupplier ? window.LUCE_DEMO.getActiveSupplier() : null;
  if (!supplier) {
    redirectToLogin();
    return;
  }

  adminState.supplier = supplier;
  updateSupplierUI();
  initializeForm();
  initializeLogout();
  loadProducts();

  if (typeof window !== 'undefined') {
    window.addEventListener('luce:data:changed', () => {
      loadProducts();
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeAdmin);
