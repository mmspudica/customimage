function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (redirect && redirect.endsWith('.html')) {
    return redirect;
  }
  return 'admin.html';
}

function checkExistingSession() {
  const supplier = window.LUCE_DEMO?.getActiveSupplier ? window.LUCE_DEMO.getActiveSupplier() : null;
  if (supplier) {
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

    if (!window.LUCE_DEMO || typeof window.LUCE_DEMO.authenticateSupplier !== 'function') {
      feedback.textContent = '로그인 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.';
      feedback.classList.add('error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton ? submitButton.textContent : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '확인 중...';
    }

    try {
      const supplier = window.LUCE_DEMO.authenticateSupplier(email, password);
      if (!supplier) {
        throw new Error('로그인 정보를 확인해주세요. 등록된 공급업체가 아니거나 비밀번호가 일치하지 않습니다.');
      }

      window.LUCE_DEMO.setActiveSupplier?.(supplier);
      window.location.replace(getRedirectTarget());
    } catch (error) {
      feedback.textContent = error.message || '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
      feedback.classList.add('error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
  setupLoginForm();
});
