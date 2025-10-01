function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (redirect && redirect.endsWith('.html')) {
    return redirect;
  }
  return 'admin.html';
}

async function checkExistingSession() {
  try {
    const response = await fetch('/api/session');
    if (!response.ok) {
      return;
    }

    const payload = await response.json().catch(() => null);
    if (payload?.supplier) {
      window.location.replace(getRedirectTarget());
    }
  } catch (error) {
    // ignore and allow login
  }
}

function setupLoginForm() {
  const form = document.getElementById('supplier-login-form');
  const feedback = document.getElementById('login-feedback');

  if (!form || !feedback) {
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!email || !password) {
      feedback.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
      feedback.classList.add('error');
      return;
    }

    if (password.length < 8) {
      feedback.textContent = '비밀번호는 8자 이상 입력해주세요.';
      feedback.classList.add('error');
      return;
    }

    feedback.textContent = '';
    feedback.classList.remove('error');

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton ? submitButton.textContent : '';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '확인 중...';
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error || '로그인에 실패했습니다. 입력 정보를 확인해주세요.';
        throw new Error(message);
      }

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
