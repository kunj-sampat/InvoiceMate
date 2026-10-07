// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        if(typeof showToast === 'function') showToast('Please enter both email and password', 'error');
        return;
      }

      try {
        const data = await apiRequest('POST', '/api/auth/login', { email, password });
        if (data && data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userName', data.name || '');
          localStorage.setItem('userEmail', data.email || email);
          if (data.logoPath) {
            localStorage.setItem('userLogo', data.logoPath);
          } else {
            localStorage.removeItem('userLogo');
          }
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        if(typeof showToast === 'function') showToast(error.message, 'error');
      }
    });
  }

  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm').value;

      if (!fullName || !email || !password || !confirmPassword) {
        if(typeof showToast === 'function') showToast('Please fill all fields', 'error');
        return;
      }

      if (password !== confirmPassword) {
        if(typeof showToast === 'function') showToast('Passwords do not match', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if(typeof showToast === 'function') showToast('Invalid email format', 'error');
        return;
      }

      try {
        const data = await apiRequest('POST', '/api/auth/register', { fullName, email, password, confirmPassword });
        if (data && data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userName', data.name || fullName);
          localStorage.setItem('userEmail', data.email || email);
          if (data.logoPath) {
            localStorage.setItem('userLogo', data.logoPath);
          } else {
            localStorage.removeItem('userLogo');
          }
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        if(typeof showToast === 'function') showToast(error.message, 'error');
      }
    });
  }
});
