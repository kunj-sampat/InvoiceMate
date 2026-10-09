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

  // Interactive Sidebar Global Search
  initSidebarGlobalSearch();

  // Notification Bell Popover Handler
  const bellBtns = document.querySelectorAll('.invoza-circle-btn[title="Notifications"], button[title="Notifications"]');
  bellBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      let popover = document.getElementById('invoza-notif-popover');
      if (!popover) {
        popover = document.createElement('div');
        popover.id = 'invoza-notif-popover';
        popover.className = 'invoza-notifications-popover';
        const container = btn.closest('.invoza-header-tools') || btn.parentElement;
        container.appendChild(popover);
      }

      const isOpen = popover.classList.contains('active');
      if (isOpen) {
        popover.classList.remove('active');
      } else {
        renderNotificationsPopover(popover);
        popover.classList.add('active');
        const dot = btn.querySelector('.invoza-notification-dot');
        if (dot) dot.style.display = 'none';
      }
    });
  });

  // Close notifications on click outside
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('invoza-notif-popover');
    if (popover && popover.classList.contains('active') && !popover.contains(e.target)) {
      popover.classList.remove('active');
    }
  });

  // Go Premium Modal Trigger
  const premiumBtns = document.querySelectorAll('#btn-go-premium, .invoza-btn-premium');
  premiumBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openPremiumModal();
    });
  });
});

function renderNotificationsPopover(popover) {
  popover.innerHTML = `
    <div class="invoza-notif-header">
      <h4>Notifications</h4>
      <button class="invoza-notif-mark-read" id="notif-mark-read-btn">Mark all read</button>
    </div>
    <div class="invoza-notif-list">
      <a href="invoices.html" class="invoza-notif-item">
        <div class="invoza-notif-icon alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div class="invoza-notif-body">
          <div class="invoza-notif-title">Invoice reminders &amp; receivables</div>
          <div class="invoza-notif-time">Follow up with clients via WhatsApp</div>
        </div>
      </a>
      <a href="reports.html" class="invoza-notif-item">
        <div class="invoza-notif-icon success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        </div>
        <div class="invoza-notif-body">
          <div class="invoza-notif-title">Quarterly GSTR-1 ready</div>
          <div class="invoza-notif-time">Ready for Chartered Accountant CSV export</div>
        </div>
      </a>
      <a href="settings.html" class="invoza-notif-item">
        <div class="invoza-notif-icon info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </div>
        <div class="invoza-notif-body">
          <div class="invoza-notif-title">Dynamic UPI QR Code active</div>
          <div class="invoza-notif-time">Scan-to-pay enabled on all invoices</div>
        </div>
      </a>
    </div>
  `;

  const markBtn = popover.querySelector('#notif-mark-read-btn');
  if (markBtn) {
    markBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const list = popover.querySelector('.invoza-notif-list');
      if (list) {
        list.innerHTML = `
          <div style="text-align:center; padding:24px 10px; color:#64748b; font-size:13px;">
            <div style="font-size:22px; color:#10b981; margin-bottom:6px;">&#10003;</div>
            All caught up! No unread notifications.
          </div>
        `;
      }
    });
  }
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function openPremiumModal() {
  let modal = document.getElementById('invoza-premium-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'invoza-premium-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 580px; width: 92%; padding: 0; overflow: hidden; border-radius: 20px; border: 1px solid rgba(245, 158, 11, 0.3); box-shadow: 0 25px 60px -15px rgba(217, 119, 6, 0.25);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 32px 28px; position: relative; color: #ffffff;">
          <div style="position: absolute; top: -20px; right: -20px; width: 140px; height: 140px; background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%); pointer-events: none;"></div>
          
          <button id="close-premium-modal" style="position: absolute; top: 16px; right: 18px; background: transparent; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; line-height: 1;">&times;</button>
          
          <div style="display: inline-flex; align-items: center; gap: 7px; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; padding: 4px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;">
            <span>👑 INVOICEMATE PRO</span>
            <span>✦ UNLIMITED ACCESS</span>
          </div>
          
          <h2 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; color: #ffffff;">Elevate Your Invoicing &amp; Cash Flow</h2>
          <p style="margin: 0; font-size: 13.5px; color: #cbd5e1; line-height: 1.5;">Supercharge client payments, automate tax filing preparation, and scale your business with zero limits.</p>
        </div>

        <!-- Perks List -->
        <div style="padding: 24px 32px; background: var(--color-bg); display: flex; flex-direction: column; gap: 14px;">
          
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">📲</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--color-text);">Automated WhatsApp Payment Follow-ups</div>
              <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 2px;">Dispatch instant payment reminders with pre-filled UPI links straight to client WhatsApp.</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(59, 130, 246, 0.12); color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">⚡</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--color-text);">Dynamic UPI QR Code Auto-Reconciliation</div>
              <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 2px;">GPay, PhonePe, and Paytm scan-to-pay codes with instant settlement marking.</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(124, 58, 237, 0.12); color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">🏢</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--color-text);">White-Label Branding &amp; Custom Domain</div>
              <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 2px;">Remove InvoiceMate watermark, apply custom stamp, and use your bespoke billing domain.</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">📑</div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--color-text);">CA &amp; Accountant GST Compliance Pack</div>
              <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 2px;">1-Click GSTR-1, GSTR-3B B2B/B2C summaries and Excel tax audits.</div>
            </div>
          </div>

        </div>

        <!-- Footer / CTA -->
        <div style="padding: 18px 32px 24px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="font-size: 18px; font-weight: 800; color: var(--color-text);">₹499 <span style="font-size: 12.5px; font-weight: 500; color: var(--color-text-tertiary);">/ month (Billed Annually)</span></div>
            <div style="font-size: 11px; color: #10b981; font-weight: 600;">✨ 14-day risk-free money-back guarantee</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="cancel-premium-modal" class="btn btn-secondary btn-sm" style="padding: 8px 14px;">Maybe Later</button>
            <button id="confirm-premium-upgrade" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; padding: 8px 18px; font-weight: 700; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
              Upgrade Now &rarr;
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#close-premium-modal');
    const cancelBtn = modal.querySelector('#cancel-premium-modal');
    const confirmBtn = modal.querySelector('#confirm-premium-upgrade');

    const closeModal = () => modal.classList.remove('active');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        closeModal();
        if (typeof showToast === 'function') {
          showToast('🎉 InvoiceMate Pro activated for your account trial!', 'success');
        } else {
          alert('🎉 InvoiceMate Pro activated for your account trial!');
        }
      });
    }
  }

  modal.classList.add('active');
}

// --- Interactive Sidebar Global Search ---
function initSidebarGlobalSearch() {
  const searchInput = document.getElementById('sidebar-search-input');
  if (!searchInput) return;

  const searchBox = searchInput.closest('.invoza-search-box') || searchInput.parentElement;
  if (!searchBox) return;

  let popover = document.getElementById('invoza-search-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'invoza-search-popover';
    popover.className = 'invoza-search-popover';
    searchBox.appendChild(popover);
  }

  const appNavItems = [
    { title: 'Dashboard', sub: 'Overview, analytics & metrics', url: 'dashboard.html', icon: '📊', type: 'page', tags: 'home stats overview metrics' },
    { title: 'Invoices', sub: 'Manage, dispatch & track bills', url: 'invoices.html', icon: '🧾', type: 'page', tags: 'bills receivables collections' },
    { title: 'Estimates & Quotes', sub: 'Create proposals & quotations', url: 'estimates.html', icon: '📄', type: 'page', tags: 'proposals quotes' },
    { title: 'Expenses & Profit Tracker', sub: 'Operational spends & net profit', url: 'expenses.html', icon: '🏷️', type: 'page', tags: 'costs spends outflows profit tracker' },
    { title: 'Payments & Collections', sub: 'Payment records & settlement history', url: 'payments.html', icon: '💳', type: 'page', tags: 'cash collections upi bank' },
    { title: 'Customer Statements', sub: 'Generate customer ledgers', url: 'customer-statement.html', icon: '📋', type: 'page', tags: 'ledger statement party account' },
    { title: 'Product Catalog', sub: 'Inventory items, rates & GST', url: 'products.html', icon: '📦', type: 'page', tags: 'services goods pricing items' },
    { title: 'Recurring Invoices', sub: 'Automated billing profiles', url: 'recurring.html', icon: '🔄', type: 'page', tags: 'subscriptions auto bill recurring' },
    { title: 'Clients Directory', sub: 'Customer profiles & balances', url: 'customers.html', icon: '👥', type: 'page', tags: 'buyers customers contacts clients' },
    { title: 'GST Reports & Filing', sub: 'GSTR-1 tax preparation & CA CSV', url: 'reports.html', icon: '📈', type: 'page', tags: 'gst tax filing accountant gstr-1' },
    { title: 'Settings & Branding', sub: 'Business details & UPI QR config', url: 'settings.html', icon: '⚙️', type: 'page', tags: 'profile company bank vpa upi qr logo' },
    { title: 'Create Invoice', sub: 'New bill with UPI QR', url: 'create-invoice.html', icon: '➕', type: 'action', tags: 'add new invoice bill' },
    { title: 'Add Expense', sub: 'Record new business expenditure', url: 'expenses.html', icon: '➕', type: 'action', tags: 'new expense spend' },
    { title: 'New Client', sub: 'Add buyer / party details', url: 'customers.html', icon: '➕', type: 'action', tags: 'add client new customer' },
    { title: 'New Estimate', sub: 'Draft price quote for client', url: 'create-estimate.html', icon: '➕', type: 'action', tags: 'new estimate quote proposal' }
  ];

  let selectedIndex = -1;
  let debounceTimer = null;

  function renderResults(query) {
    const q = (query || '').trim().toLowerCase();
    selectedIndex = -1;

    let filteredNav = appNavItems;
    if (q) {
      filteredNav = appNavItems.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.sub.toLowerCase().includes(q) ||
        item.tags.toLowerCase().includes(q)
      );
    }

    let html = `
      <div class="invoza-search-pop-header">
        <span>${q ? 'Quick Results' : 'Navigation & Shortcuts'}</span>
        <span>${q ? `${filteredNav.length} found` : 'ESC to close'}</span>
      </div>
      <div class="invoza-search-pop-list" id="invoza-search-items-list">
    `;

    if (filteredNav.length === 0 && q) {
      html += `
        <div class="invoza-search-empty">
          <div>🔍 No direct pages found for "${escapeHtml(q)}"</div>
          <a href="invoices.html?search=${encodeURIComponent(q)}" style="display:inline-block; margin-top:8px; color:#205646; font-weight:700; font-size:12px; text-decoration:underline;">
            Search invoices for "${escapeHtml(q)}" &rarr;
          </a>
        </div>
      `;
    } else {
      filteredNav.slice(0, 8).forEach((item, idx) => {
        html += `
          <a href="${item.url}" class="invoza-search-item" data-index="${idx}" data-url="${item.url}">
            <div class="invoza-search-item-icon">${item.icon}</div>
            <div class="invoza-search-item-meta">
              <div class="invoza-search-item-title">${escapeHtml(item.title)}</div>
              <div class="invoza-search-item-sub">${escapeHtml(item.sub)}</div>
            </div>
            <span class="invoza-search-item-badge">${item.type === 'action' ? 'Action' : 'Jump'}</span>
          </a>
        `;
      });
    }

    html += `</div>`;
    popover.innerHTML = html;
    popover.classList.add('active');

    // Also sync in-page table filters if on invoices or expenses page
    const inPageInvoiceSearch = document.getElementById('invoice-search');
    if (inPageInvoiceSearch && window.location.pathname.includes('invoices.html')) {
      inPageInvoiceSearch.value = searchInput.value;
      if (typeof loadInvoices === 'function') loadInvoices();
    }

    const inPageExpenseSearch = document.getElementById('expense-search');
    if (inPageExpenseSearch && window.location.pathname.includes('expenses.html')) {
      inPageExpenseSearch.value = searchInput.value;
      if (typeof loadExpenses === 'function') loadExpenses();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Input event
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderResults(searchInput.value);
    }, 120);
  });

  // Focus event
  searchInput.addEventListener('focus', () => {
    renderResults(searchInput.value);
  });

  // Key navigation
  searchInput.addEventListener('keydown', (e) => {
    if (!popover.classList.contains('active')) return;

    const items = popover.querySelectorAll('.invoza-search-item');
    if (!items || items.length === 0) {
      if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        if (val) {
          window.location.href = `invoices.html?search=${encodeURIComponent(val)}`;
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].click();
      } else {
        const val = searchInput.value.trim();
        if (val) {
          window.location.href = `invoices.html?search=${encodeURIComponent(val)}`;
        }
      }
    } else if (e.key === 'Escape') {
      popover.classList.remove('active');
      searchInput.blur();
    }
  });

  function updateHighlight(items) {
    items.forEach((it, idx) => {
      if (idx === selectedIndex) {
        it.classList.add('highlighted');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('highlighted');
      }
    });
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!searchBox.contains(e.target)) {
      popover.classList.remove('active');
    }
  });
}


