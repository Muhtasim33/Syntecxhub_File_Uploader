let isLoginMode = true;

export const initAuth = (onLoginSuccess) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
    onLoginSuccess();
    return;
  }

  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'flex';

  const form = document.getElementById('auth-form');
  const title = document.getElementById('auth-title');
  const nameGroup = document.getElementById('name-group');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleLink = document.getElementById('auth-toggle-link');
  const toggleText = document.getElementById('auth-toggle-text');

  toggleLink.onclick = (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
      title.textContent = 'Login';
      if (nameGroup) nameGroup.style.display = 'none';
      submitBtn.textContent = 'Login';
      toggleText.textContent = "Don't have an account?";
      toggleLink.textContent = 'Sign Up';
    } else {
      title.textContent = 'Sign Up';
      if (nameGroup) nameGroup.style.display = 'block';
      submitBtn.textContent = 'Sign Up';
      toggleText.textContent = 'Already have an account?';
      toggleLink.textContent = 'Login';
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const nameInput = document.getElementById('auth-name');
    const name = nameGroup && nameGroup.style.display !== 'none' && nameInput ? nameInput.value : '';

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const payload = isLoginMode ? { email, password } : { name, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed');
      }

      const tokenValue = result.data?.token || result.token;

      if (!tokenValue) {
        throw new Error('Token not received from server');
      }

      localStorage.setItem('token', tokenValue);

      if (modal) modal.style.display = 'none';
      onLoginSuccess();
    } catch (err) {
      alert(`Authentication Error: ${err.message}`);
    }
  };
};