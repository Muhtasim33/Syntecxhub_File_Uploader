let isLoginMode = true;

export const initAuth = (onLoginSuccess) => {
  const modal = document.getElementById('auth-modal');
  const form = document.getElementById('auth-form');
  const title = document.getElementById('auth-title');
  const nameGroup = document.getElementById('name-group');
  const nameInput = document.getElementById('auth-name');
  const passwordInput = document.getElementById('auth-password');
  const confirmPasswordGroup = document.getElementById('confirm-password-group');
  const confirmPasswordInput = document.getElementById('auth-confirm-password');
  const passwordHint = document.getElementById('password-hint');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleLink = document.getElementById('auth-toggle-link');
  const toggleText = document.getElementById('auth-toggle-text');
  const message = document.getElementById('auth-message');

  if (!modal || !form || !title || !submitBtn || !toggleLink || !toggleText || !message) {
    throw new Error('Authentication form is missing required elements');
  }

  const token = localStorage.getItem('token');
  if (token) {
    modal.style.display = 'none';
    onLoginSuccess();
    return;
  }

  modal.style.display = 'flex';

  const setMode = (loginMode) => {
    isLoginMode = loginMode;
    title.textContent = isLoginMode ? 'Sign in' : 'Create your account';
    nameGroup.hidden = isLoginMode;
    nameInput.required = !isLoginMode;
    confirmPasswordGroup.hidden = isLoginMode;
    confirmPasswordInput.required = !isLoginMode;
    confirmPasswordInput.value = '';
    passwordInput.minLength = isLoginMode ? 1 : 8;
    passwordInput.autocomplete = isLoginMode ? 'current-password' : 'new-password';
    passwordHint.hidden = isLoginMode;
    submitBtn.textContent = isLoginMode ? 'Sign in' : 'Create account';
    toggleText.textContent = isLoginMode ? 'New to DropLab?' : 'Already have an account?';
    toggleLink.textContent = isLoginMode ? 'Create an account' : 'Sign in';
    message.textContent = '';
  };

  toggleLink.onclick = () => {
    setMode(!isLoginMode);
  };

  document.querySelectorAll('.password-visibility').forEach((button) => {
    button.onclick = () => {
      const input = document.getElementById(button.dataset.passwordTarget);
      if (!input) return;

      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      button.textContent = showPassword ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${showPassword ? 'Hide' : 'Show'} ${input.labels?.[0]?.textContent.toLowerCase() || 'password'}`);
      button.setAttribute('aria-pressed', String(showPassword));
    };
  });

  form.onsubmit = async (event) => {
    event.preventDefault();
    message.textContent = '';

    if (!form.reportValidity()) return;
    if (!isLoginMode && passwordInput.value !== confirmPasswordInput.value) {
      message.textContent = 'Passwords do not match.';
      confirmPasswordInput.focus();
      return;
    }

    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = passwordInput.value;
    const payload = isLoginMode
      ? { email, password }
      : { name: nameInput.value.trim(), email, password };

    submitBtn.disabled = true;
    submitBtn.textContent = isLoginMode ? 'Signing in…' : 'Creating account…';

    try {
      const response = await fetch(isLoginMode ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed. Please try again.');
      }

      const tokenValue = result.data?.token;
      if (!tokenValue) {
        throw new Error('The server did not return an authentication token.');
      }

      localStorage.setItem('token', tokenValue);
      modal.style.display = 'none';
      await onLoginSuccess();
    } catch (error) {
      message.textContent = error.message || 'Unable to connect. Please try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isLoginMode ? 'Sign in' : 'Create account';
    }
  };
};
