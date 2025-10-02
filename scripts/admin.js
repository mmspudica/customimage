const adminState = {
  supplier: null,
  tableBody: null,
  feedback: null,
  supplierSummary: null,
  supplierNameLabel: null,
  supplierHiddenInput: null,
  logoutButton: null,
};

function redirectToLogin() {
  const params = new URLSearchParams({ redirect: 'admin.html' });
  window.location.replace(`login.html?${params.toString()}`);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

function updateSupplierUI() {
  const { supplier, supplierSummary, supplierNameLabel, supplierHiddenInput, logoutButton } = adminState;

  if (supplierNameLabel) {
    supplierNameLabel.textContent = supplier ? supplier.brand : '-';
  }

  if (supplierSummary) {
    supplierSummary.textContent = supplier ? `${supplier.brand} · ${supplier.email}` : '로그인이 필요합니다';
  }

  if (supplierHiddenInput) {
    supplierHiddenInput.value = supplier ? supplier.id : '';
  }

  if (logoutButton) {
    logoutButton.disabled = !supplier;
  }
}

function getSupplierProducts() {
  if (!adminState.supplier) {
    return [];
  }

  const base = (window.LUCE_DEMO?.LOOKS || []).filter(item => item.supplierId === adminState.supplier.id);
  const stored = (window.LUCE_DEMO?.getStoredProducts?.() || []).filter(item => item.supplierId === adminState.supplier.id);

  return [...base, ...stored].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

function renderProducts() {
  if (!adminState.tableBody) {
    return;
  }

  const products = getSupplierProducts();
  adminState.tableBody.innerHTML = '';

  if (!products.length) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    row.innerHTML = '<td colspan="5">등록된 상품이 없습니다. 상단 폼에서 첫 상품을 등록하세요.</td>';
    adminState.tableBody.appendChild(row);
    return;
  }

  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="product-name">${product.title}</div>
      </td>
      <td>${translateCategory(product.category)}</td>
      <td>${product.retailPrice || product.price || '-'}</td>
      <td>${adminState.supplier?.brand || '-'}</td>
      <td>${formatDate(product.createdAt)}</td>
    `;
    adminState.tableBody.appendChild(row);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

async function handleProductSubmit(event) {
  event.preventDefault();

  if (!adminState.supplier) {
    if (adminState.feedback) {
      adminState.feedback.textContent = '공급업체 로그인 후 상품을 등록할 수 있습니다.';
      adminState.feedback.classList.add('error');
    }
    return;
  }

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');

  if (adminState.feedback) {
    adminState.feedback.textContent = '';
    adminState.feedback.classList.remove('error');
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
  }

  try {
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const retailPrice = String(formData.get('retailPrice') || '').trim();
    const fit = String(formData.get('fit') || '').trim();
    const specs = String(formData.get('specs') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const thumbnail = formData.get('thumbnail');
    const galleryFiles = formData.getAll('gallery').filter(file => file instanceof File && file.size);

    if (!title || !category || !retailPrice || !fit || !specs) {
      throw new Error('필수 항목을 모두 입력해주세요.');
    }

    if (!(thumbnail instanceof File) || !thumbnail.size) {
      throw new Error('썸네일 이미지를 업로드해주세요.');
    }

    if (!galleryFiles.length) {
      throw new Error('상세 이미지를 최소 1장 이상 업로드해주세요.');
    }

    const images = [thumbnail, ...galleryFiles.slice(0, 5)];
    const dataUrls = await Promise.all(images.map(file => readFileAsDataURL(file)));

    const product = {
      title,
      category,
      retailPrice,
      price: Number(String(retailPrice).replace(/[^0-9]/g, '')),
      fit,
      specs,
      description,
      supplierId: adminState.supplier.id,
      supplierName: adminState.supplier.brand,
      supplier: adminState.supplier,
      gallery: dataUrls,
    };

    window.LUCE_DEMO?.addProduct?.(product);

    form.reset();
    renderProducts();

    if (adminState.feedback) {
      adminState.feedback.textContent = '상품이 등록되었습니다. 메인 룩북에서 새 상품을 확인해보세요.';
      adminState.feedback.classList.remove('error');
    }
  } catch (error) {
    if (adminState.feedback) {
      adminState.feedback.textContent = error.message || '상품 등록에 실패했습니다. 입력값을 확인해주세요.';
      adminState.feedback.classList.add('error');
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = '상품 등록';
    }
  }
}

function handleLogout() {
  window.LUCE_DEMO?.setSession?.(null);
  adminState.supplier = null;
  updateSupplierUI();
  redirectToLogin();
}

function requireSession() {
  const session = window.LUCE_DEMO?.getSession?.();
  if (!session?.supplier) {
    throw new Error('unauthorized');
  }
  adminState.supplier = session.supplier;
}

function initializeAdmin() {
  adminState.tableBody = document.getElementById('product-table-body');
  adminState.feedback = document.getElementById('product-feedback');
  adminState.supplierSummary = document.getElementById('supplier-summary');
  adminState.supplierNameLabel = document.getElementById('admin-supplier-name');
  adminState.supplierHiddenInput = document.getElementById('supplier-id');
  adminState.logoutButton = document.getElementById('logout-button');

  try {
    requireSession();
  } catch (error) {
    redirectToLogin();
    return;
  }

  updateSupplierUI();
  renderProducts();

  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', handleProductSubmit);
  }

  if (adminState.logoutButton) {
    adminState.logoutButton.addEventListener('click', handleLogout);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.LUCE_DEMO?.seedDemoAccounts?.();
  initializeAdmin();
});
