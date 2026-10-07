// js/layout.js
// Global Invoza layout script: User state, avatar initials, navigation, and shortcuts

document.addEventListener('DOMContentLoaded', () => {
  const userName = localStorage.getItem('userName') || 'User';

  // Set sidebar username
  const sidebarUserName = document.getElementById('sidebar-user-name');
  if (sidebarUserName) sidebarUserName.textContent = userName;

  // Set user avatar initials
  const initials = getInitials(userName);
  const sidebarAvatar = document.getElementById('sidebar-user-avatar');
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  const headerAvatar = document.getElementById('header-user-avatar');
  if (headerAvatar) headerAvatar.textContent = initials;

  // Active navigation link highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.invoza-nav-item a, .sidebar-nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const parentLi = link.closest('.invoza-nav-item');
    if (href && (href === currentPath || window.location.pathname.endsWith(href))) {
      if (parentLi) parentLi.classList.add('active');
      link.classList.add('active');
    } else {
      if (parentLi) parentLi.classList.remove('active');
      link.classList.remove('active');
    }
  });

  // Logout button handler
  const logoutBtn = document.getElementById('logout-link');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof logout === 'function') {
        logout();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        window.location.href = 'login.html';
      }
    });
  }

  // Keyboard shortcut: '/' focuses the search box
  const searchInput = document.getElementById('sidebar-search-input') || document.getElementById('dash-search-input');
  if (searchInput) {
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && 
          document.activeElement.tagName !== 'INPUT' && 
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }
});

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
