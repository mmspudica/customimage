const adminState = {
  suppliers: [],
  products: [],
  supplierSelect: null,
  tableBody: null,
  feedback: null,
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

function renderSuppliers() {
  const { supplierSelect, suppliers } = adminState;
  if (!supplierSelect) {
    return;
  }

  supplierSelect.innerHTML = '<option value="">공급업체를 선택하세요</option>';
  suppliers.forEach(supplier => {
    const option = document.createElement('option');
    option.value = supplier.id;
    option.textContent = `${supplier.brand} · ${supplier.phone}`;
    supplierSelect.appendChild(option);
  });
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
      <td>${product.retailPrice}</td>
      <td>${product.supplier?.brand || '-'}</td>
      <td>${formatDate(product.createdAt)}</td>
    `;
    tableBody.appendChild(row);
  });
}

async function fetchSuppliers() {
  try {
    const response = await fetch('/api/suppliers');
    if (!response.ok) {
      throw new Error('failed to load suppliers');
    }

    adminState.suppliers = await response.json();
    renderSuppliers();

    if (adminState.feedback) {
      if (!adminState.suppliers.length) {
        adminState.feedback.textContent = '공급업체 가입 후 어드민에서 상품을 등록할 수 있습니다.';
        adminState.feedback.classList.add('error');
      } else if (adminState.feedback.classList.contains('error')) {
        adminState.feedback.textContent = '';
        adminState.feedback.classList.remove('error');
      }
    }
  } catch (error) {
    console.error(error);
    adminState.suppliers = [];
    renderSuppliers();

    if (adminState.feedback) {
      adminState.feedback.textContent = '공급업체 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.';
      adminState.feedback.classList.add('error');
    }
  }
}

async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('failed to load products');
    }

    if (adminState.feedback && adminState.feedback.classList.contains('error')) {
      adminState.feedback.textContent = '';
      adminState.feedback.classList.remove('error');
    }

    adminState.products = await response.json();
    renderProducts();
  } catch (error) {
    console.error(error);
    adminState.products = [];
    renderProducts();

    if (adminState.feedback) {
      adminState.feedback.textContent = '상품 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      adminState.feedback.classList.add('error');
    }
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) {
    return;
  }

  adminState.feedback.textContent = '';
  adminState.feedback.classList.remove('error');

  submitButton.disabled = true;
  const originalLabel = submitButton.textContent;
  submitButton.textContent = '등록 중...';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const images = (payload.images || '')
    .split(/\r?\n/)
    .map(url => url.trim())
    .filter(url => url.length);

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: payload.supplierId,
        title: payload.title,
        category: payload.category,
        retailPrice: payload.retailPrice,
        fit: payload.fit,
        specs: payload.specs,
        description: payload.description,
        images,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.error || '상품 등록에 실패했습니다. 입력값을 확인해주세요.';
      throw new Error(message);
    }

    form.reset();
    adminState.feedback.textContent = '상품이 등록되었습니다. 룩북에서 바로 확인할 수 있습니다.';
    adminState.feedback.classList.remove('error');

    await fetchProducts();
  } catch (error) {
    adminState.feedback.textContent = error.message || '상품 등록에 실패했습니다. 잠시 후 다시 시도해주세요.';
    adminState.feedback.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

function initAdminPage() {
  adminState.supplierSelect = document.getElementById('supplier-id');
  adminState.tableBody = document.getElementById('product-table-body');
  adminState.feedback = document.getElementById('product-feedback');

  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', handleProductSubmit);
  }

  fetchSuppliers();
  fetchProducts();
}

document.addEventListener('DOMContentLoaded', initAdminPage);
