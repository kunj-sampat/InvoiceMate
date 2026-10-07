// js/toast.js

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('Toast container not found');
    alert(message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Fade in (assuming css handles opacity transition on addition or we just add it)
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    });
    // Fallback in case transitionend doesn't fire
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 500);
  }, 4000);
}
