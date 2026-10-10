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
      <div class="modal" style="max-width: 600px; width: 92%; padding: 0; overflow: hidden; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); background: var(--color-bg);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%); padding: 30px 32px 26px; position: relative; color: #ffffff;">
          <div style="position: absolute; top: -30px; right: -30px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%); pointer-events: none;"></div>
          
          <button id="close-premium-modal" style="position: absolute; top: 18px; right: 20px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #94a3b8; cursor: pointer; transition: all 0.2s; line-height: 1;" onhover="this.style.color='#fff'">&times;</button>
          
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 5px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 14px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
            <span>INVOICEMATE PRO ✦ UNLIMITED</span>
          </div>
          
          <h2 style="margin: 0 0 8px 0; font-size: 23px; font-weight: 800; letter-spacing: -0.4px; color: #ffffff;">Elevate Your Invoicing & Cash Flow</h2>
          <p style="margin: 0; font-size: 13.5px; color: #cbd5e1; line-height: 1.5; font-weight: 400;">Automate follow-ups, export CA compliance packs, and remove all platform watermarks.</p>
        </div>

        <!-- Perks List -->
        <div style="padding: 24px 32px; background: var(--color-bg); display: flex; flex-direction: column; gap: 14px;">
          
          <div style="display: flex; align-items: flex-start; gap: 14px; padding: 10px; border-radius: 12px; transition: background 0.2s;" onmouseover="this.style.background='var(--color-bg-secondary)'" onmouseout="this.style.background='transparent'">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M14 2a6 6 0 0 1 6 6"/><path d="M14 6a2 2 0 0 1 2 2"/></svg>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: var(--color-text);">Automated WhatsApp & Email Follow-ups</div>
              <div style="font-size: 12.5px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.45;">Dispatch instant 1-click payment reminders with custom links directly to clients.</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px; padding: 10px; border-radius: 12px; transition: background 0.2s;" onmouseover="this.style.background='var(--color-bg-secondary)'" onmouseout="this.style.background='transparent'">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); color: #8b5cf6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: var(--color-text);">White-Label Branding & Watermark Removal</div>
              <div style="font-size: 12.5px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.45;">Remove "Powered by InvoiceMate" badge, apply custom stamps, signature seals, & custom themes.</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px; padding: 10px; border-radius: 12px; transition: background 0.2s;" onmouseover="this.style.background='var(--color-bg-secondary)'" onmouseout="this.style.background='transparent'">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: #f59e0b; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: var(--color-text);">CA & Accountant GST Compliance Export</div>
              <div style="font-size: 12.5px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.45;">1-Click export of GSTR-1, GSTR-3B audit sheets formatted directly for tax filing.</div>
            </div>
          </div>

        </div>

        <!-- Footer / Pricing CTA -->
        <div style="padding: 20px 32px 24px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <span style="font-size: 22px; font-weight: 800; color: var(--color-text);">₹499</span>
              <span style="font-size: 12.5px; font-weight: 600; color: var(--color-text-tertiary);">/ month</span>
              <span style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 99px;">Billed Annually (Save 35%)</span>
            </div>
            <div style="font-size: 11.5px; color: var(--color-text-secondary); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>14-day risk-free money-back guarantee. Cancel anytime.</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button id="cancel-premium-modal" class="btn btn-secondary" style="padding: 9px 16px; font-weight: 600; font-size: 13px; border-radius: 10px;">Maybe Later</button>
            <button id="confirm-premium-upgrade" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border: none; padding: 10px 22px; font-weight: 700; font-size: 13.5px; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); cursor: pointer; transition: all 0.2s;">
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


