function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (redirect && redirect.endsWith('.html')) {
    return redirect;
  }
  return 'admin.html';
}

function getSupplierAccounts() {
  const base = Array.isArray(window.LUCE_DEMO?.SUPPLIERS) ? window.LUCE_DEMO.SUPPLIERS : [];
  const stored = window.LUCE_DEMO?.getSignups?.('suppliers') || [];

  const combined = [...base];
  stored.forEach(entry => {
    if (!entry.email || !entry.password) {
      return;
    }
    combined.push({
      id: entry.id || `sup-${entry.email}`,
      brand: entry.brand || entry.company || entry.email.split('@')[0],
      email: entry.email,
      password: entry.password,
      phone: entry.phone || '',
      category: entry.category || '',
    });
  });

  return combined.filter(account => account.email && account.password);
}

function checkExistingSession() {
  const session = window.LUCE_DEMO?.getSession?.();
  if (session?.supplier) {
    window.location.replace(getRedirectTarget());
  }
}

function setupLoginForm() {
  const form = document.getElementById('supplier-login-form');
  const feedback = document.getElementById('login-feedback');

  if (!form || !feedback) {
    return;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!email || !password) {
      feedback.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
      feedback.classList.add('error');
      return;
    }

    const accounts = getSupplierAccounts();
    const match = accounts.find(account => account.email.toLowerCase() === email.toLowerCase());

    if (!match || match.password !== password) {
      feedback.textContent = '등록되지 않은 계정이거나 비밀번호가 일치하지 않습니다.';
      feedback.classList.add('error');
      return;
    }

    window.LUCE_DEMO?.setSession?.({
      supplier: {
        id: match.id,
        brand: match.brand,
        email: match.email,
        phone: match.phone || '',
      },
    });

    feedback.textContent = '';
    feedback.classList.remove('error');
    window.location.replace(getRedirectTarget());
  });
}

document.addEventListener('DOMContentLoaded', () => {
  window.LUCE_DEMO?.seedDemoAccounts?.();
  checkExistingSession();
  setupLoginForm();
});
