// js/api.js

// Automatically point to Spring Boot backend if frontend is opened via Live Server (port 5500), file://, or other dev host
const API_BASE_URL = (() => {
  if (typeof window === 'undefined') return '';
  const port = window.location.port;
  if (window.location.protocol === 'file:' || (port && port !== '8080')) {
    return 'http://localhost:8080';
  }
  return '';
})();

// ==========================================================================
// SMART API CACHE — Prevents redundant re-fetches on page navigation
// In-memory (fast) + sessionStorage (survives page reload within session)
// ==========================================================================
const _apiCache = {
  store: new Map(), // { key: { data, expiresAt } }

  // TTL in ms per URL pattern
  getTtl(url) {
    if (url.includes('/api/dashboard')) return 60000;      // 60s
    if (url.includes('/api/settings'))  return 300000;     // 5min
    if (url.includes('/api/invoices')) {
      if (url.includes('search=') || url.includes('status=') || url.includes('from=') || url.includes('to=')) {
        return 0; // Never cache search / filtered queries
      }
      return 60000; // 60s for base listing
    }
    if (url.includes('/api/customers')) return 60000;      // 60s
    if (url.includes('/api/products'))  return 60000;      // 60s
    if (url.includes('/api/expenses'))  return 60000;      // 60s
    if (url.includes('/api/estimates')) return 60000;      // 60s
    if (url.includes('/api/payments'))  return 60000;      // 60s
    if (url.includes('/api/reports'))   return 120000;     // 2min
    return 0; // No cache for everything else
  },

  getKey(url) {
    const token = localStorage.getItem('token') || '';
    return 'apicache_' + token.slice(-8) + '_' + url;
  },

  get(url) {
    const key = this.getKey(url);
    // Check in-memory first (fastest)
    if (this.store.has(key)) {
      const entry = this.store.get(key);
      if (Date.now() < entry.expiresAt) return entry.data;
      this.store.delete(key);
    }
    // Fallback to sessionStorage
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const entry = JSON.parse(raw);
        if (Date.now() < entry.expiresAt) {
          this.store.set(key, entry); // Promote back to memory
          return entry.data;
        }
        sessionStorage.removeItem(key);
      }
    } catch(e) { /* sessionStorage unavailable */ }
    return null;
  },

  set(url, data) {
    const ttl = this.getTtl(url);
    if (ttl <= 0) return;
    const key = this.getKey(url);
    const entry = { data, expiresAt: Date.now() + ttl };
    this.store.set(key, entry);
    try { sessionStorage.setItem(key, JSON.stringify(entry)); } catch(e) { /* quota exceeded */ }
  },

  // Invalidate all cache entries (call on mutations)
  invalidateAll() {
    this.store.clear();
    try {
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith('apicache_'));
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch(e) {}
  },

  // Invalidate cache entries matching a URL pattern
  invalidatePattern(pattern) {
    const token = localStorage.getItem('token') || '';
    const prefix = 'apicache_' + token.slice(-8) + '_';
    for (const [key] of this.store) {
      if (key.includes(pattern)) this.store.delete(key);
    }
    try {
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith(prefix) && k.includes(pattern));
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch(e) {}
  }
};

window._apiCache = _apiCache;
window.apiCacheInvalidate = () => _apiCache.invalidateAll();
window.apiCacheInvalidatePattern = (pattern) => _apiCache.invalidatePattern(pattern);

async function apiRequest(method, url, body = null) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ---- CACHE: Return cached data immediately for GET requests ----
  const isGet = method === 'GET' || method === 'get';
  if (isGet && !body) {
    const cached = _apiCache.get(url);
    if (cached !== null) return cached;
  }

  const options = {
    method: method,
    headers: headers
  };

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(API_BASE_URL + url, options);

    // For auth endpoints (login, register, social), don't treat 401/403 as token expiration
    if (url.includes('/api/auth/')) {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let msg = errorData.message || errorData.error;
        if (!msg || msg === 'Invalid credentials') {
          msg = 'Invalid email or password. If you deleted your account, please click "Create one" below.';
        }
        throw new Error(msg);
      }
    } else if (response.status === 401 || response.status === 403) {
      // If unauthorized or forbidden on protected APIs (token missing, invalid, or expired)
      _apiCache.invalidateAll();
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      const isPublicPage = ['login.html', 'register.html', 'index.html', 'terms.html', 'privacy.html']
        .some(p => window.location.pathname.endsWith(p));
      if (!isPublicPage) {
        window.location.href = 'login.html';
      }
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    let result;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    // Cache successful GET responses
    if (isGet && result !== null && result !== undefined) {
      _apiCache.set(url, result);
    }

    // Invalidate relevant cache entries on mutations
    if (!isGet) {
      // Determine which cache keys to invalidate based on endpoint
      const mutatedBase = url.split('?')[0].split('/').slice(0, 4).join('/');
      _apiCache.invalidatePattern(mutatedBase);
      // Always clear dashboard cache on any mutation
      _apiCache.invalidatePattern('/api/dashboard');
      _apiCache.invalidatePattern('/api/invoices');
    }

    return result;
  } catch (error) {
    console.error('API Request Error:', error);
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Backend server is unreachable. Please ensure the Spring Boot server is running on port 8080.');
    }
    throw error;
  }
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    const isPublicPage = ['login.html', 'register.html', 'index.html', 'terms.html', 'privacy.html']
      .some(p => window.location.pathname.endsWith(p));
    if (!isPublicPage) {
      window.location.href = 'login.html';
    }
    return null;
  }
  return token;
}

function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'login.html';
}

/**
 * On-Site Modal Confirmation Dialog (Replaces native browser confirm/alert popups)
 */
/**
 * On-Site Modal Confirmation Dialog (Replaces native browser confirm/alert popups)
 * Supports both:
 * 1) await showConfirmDialog({ title, message, confirmText, cancelText, isDanger })
 * 2) showConfirmDialog('Title', 'Message', onConfirmCallback, onCancelCallback)
 */
function showConfirmDialog(arg1 = {}, arg2 = null, arg3 = null, arg4 = null) {
  let opts = {};
  let callback = null;
  let cancelCallback = null;

  if (typeof arg1 === 'string') {
    opts.title = arg1;
    opts.message = typeof arg2 === 'string' ? arg2 : 'Are you sure you want to proceed?';
    if (typeof arg3 === 'function') {
      callback = arg3;
      if (typeof arg4 === 'function') cancelCallback = arg4;
    }
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    opts = { ...arg1 };
    if (typeof opts.onConfirm === 'function') callback = opts.onConfirm;
    if (typeof opts.onCancel === 'function') cancelCallback = opts.onCancel;
  }

  const {
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = true
  } = opts;

  return new Promise((resolve) => {
    let modal = document.getElementById('invoza-confirm-dialog');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'invoza-confirm-dialog';
      modal.className = 'invoza-confirm-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="invoza-confirm-box">
        <div class="invoza-confirm-icon-wrap ${isDanger ? 'danger' : 'info'}">
          ${isDanger 
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
            : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
          }
        </div>
        <h3 class="invoza-confirm-title">${title}</h3>
        <p class="invoza-confirm-msg">${message}</p>
        <div class="invoza-confirm-actions">
          <button type="button" class="invoza-btn-cancel">${cancelText}</button>
          <button type="button" class="invoza-btn-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const handleAction = async (val) => {
      modal.classList.remove('active');
      if (val) {
        if (typeof callback === 'function') {
          try { await callback(); } catch (e) { console.error('Confirm callback error', e); }
        }
      } else {
        if (typeof cancelCallback === 'function') {
          try { await cancelCallback(); } catch (e) { console.error('Cancel callback error', e); }
        }
      }
      resolve(val);
    };

    modal.querySelector('.invoza-btn-cancel').onclick = () => handleAction(false);
    modal.querySelector('.invoza-btn-confirm').onclick = () => handleAction(true);
    modal.onclick = (e) => {
      if (e.target === modal) handleAction(false);
    };
  });
}
window.showConfirmDialog = showConfirmDialog;

function getUserId() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    return parsed.userId || parsed.sub;
  } catch (e) {
    return null;
  }
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '';
  return '₹' + Number(amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

function getStatusBadgeClass(status) {
  if (!status) return 'badge-secondary';
  const s = status.toUpperCase();
  if (s === 'PAID') return 'badge-success';
  if (s === 'PENDING' || s === 'PARTIALLY_PAID') return 'badge-warning';
  if (s === 'OVERDUE') return 'badge-danger';
  return 'badge-secondary'; // DRAFT or other
}

// Check auth on load unless on login/register page
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (!path.includes('login.html') && !path.includes('register.html') && !path.includes('index.html')) {
    checkAuth();
  }
});

/**
 * Shared renderer for the 4 distinct invoice/estimate templates:
 * 'business' (Navy + Lime Green Ribbon — Ref 1)
 * 'modern'   (Royal Blue Curved Waves + Full-Bleed Bar — Ref 2)
 * 'minimal'  (Swiss Architectural Grid)
 * 'classic'  (Warm Parchment & Gold Executive Ledger)
 */
function renderInvoiceTemplate(previewEl, templateName, doc) {
  if (!previewEl) return;
  const tpl = (templateName || 'modern').toLowerCase();
  previewEl.className = `invoice-preview template-${tpl}`;

  const docTitle = doc.docTitle || 'INVOICE';
  const docNum = doc.docNumber || 'INV-0001';
  const docDate = doc.docDate || '-';
  const dueDate = doc.dueDate || '-';
  const dueLabel = doc.dueLabel || 'Due Date';
  
  // Prioritize Company / Business Name over user personal name
  const bizName = doc.businessName || doc.bizName || localStorage.getItem('businessName') || 'My Business';
  const bizAddress = doc.businessAddress || doc.bizAddress || 'Mumbai, Maharashtra, India';
  const bizPhone = doc.businessPhone || doc.bizPhone || '+91 98765 43210';
  const bizEmail = doc.businessEmail || doc.bizEmail || localStorage.getItem('userEmail') || 'billing@invoicemate.in';
  
  const custName = doc.customerName || 'Client Name';
  const custEmail = doc.customerEmail || '';
  const custPhone = doc.customerPhone || '';
  const custAddress = doc.customerAddress || '';
  const notes = doc.notes || 'Thank you for your business. Please remit payment by the due date.';
  
  const items = Array.isArray(doc.items) && doc.items.length > 0
    ? doc.items
    : [{ name: 'Sample Service / Product', hsnSacCode: '9983', quantity: 1, price: 0, total: 0 }];

  const subtotal = Number(doc.subtotal || 0);
  const discountAmount = Number(doc.discountAmount || 0);
  const gstAmount = Number(doc.gstAmount || 0);
  const grandTotal = Number(doc.grandTotal || 0);
  const amountPaid = Number(doc.amountPaid !== undefined ? doc.amountPaid : (doc.advancePaid || 0));
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const subtotalText = doc.subtotalText || formatCurrency(subtotal);
  const discountText = doc.discountText || formatCurrency(discountAmount);
  const gstText = doc.gstText || formatCurrency(gstAmount);
  const grandText = doc.grandText || formatCurrency(grandTotal);
  const advanceText = formatCurrency(amountPaid);
  const balanceText = formatCurrency(balanceDue);
  const logoUrl = doc.logoUrl || localStorage.getItem('userLogo') || '';

  // White-label watermark removal check
  const isPro = localStorage.getItem('invoza_user_tier') === 'PRO';
  const watermarkHtml = !isPro
    ? `
      <div class="inv-watermark-badge">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary, #2563eb);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <span>Powered by <strong>InvoiceMate</strong> &bull; Simple Invoicing &amp; GST &bull; invoicemate.in</span>
      </div>
    `
    : '';

  // Dynamic UPI QR Code Scan-to-Pay (automatically requests balanceDue when advance paid)
  let upiWidgetHtml = '';
  const upiId = doc.upiId || localStorage.getItem('userUpiId') || '';
  if (upiId && typeof InvoiceMateUPI !== 'undefined') {
    const payableAmount = amountPaid > 0 ? balanceDue : grandTotal;
    upiWidgetHtml = InvoiceMateUPI.renderWidgetHTML({
      upiId: upiId,
      payeeName: bizName,
      amount: payableAmount,
      invoiceNumber: docNum
    });
  }

  // 1. BUSINESS TEMPLATE
  if (tpl === 'business') {
    const rowsHtml = items.map((it, idx) => {
      const lineTotal = it.total !== undefined ? it.total : (it.quantity * it.price);
      const hsn = it.hsnSacCode || it.hsnCode || '-';
      return `
        <tr>
          <td class="col-num">${String(idx + 1).padStart(2, '0')}</td>
          <td class="col-desc">
            <strong>${it.name || 'Item'}</strong>
            ${it.description ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${it.description}</div>` : ''}
          </td>
          <td class="col-hsn">${hsn}</td>
          <td class="col-rate">${formatCurrency(it.price || 0)}</td>
          <td class="col-qty">${it.quantity || 1}</td>
          <td class="col-total">${formatCurrency(lineTotal || 0)}</td>
        </tr>
      `;
    }).join('');

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${bizName}" class="inv-brand-logo" style="max-height:50px;max-width:160px;background:#fff;border-radius:6px;padding:3px;">`
      : `<div class="biz-logo-box">${bizName.charAt(0).toUpperCase()}</div>`;

    previewEl.innerHTML = `
      <div class="biz-top-accent"></div>
      <div class="biz-header-card">
        <div class="biz-brand-col">
          ${logoHtml}
          <div class="biz-company-title">
            <h2>${bizName}</h2>
            <p>Corporate Business &bull; GST Ready</p>
          </div>
        </div>
        <div class="biz-doc-col">
          <h1>${docTitle}</h1>
          <div class="biz-meta-pill"><span>${docTitle} No:</span> <strong>#${docNum}</strong></div>
          <div class="biz-meta-pill"><span>Date:</span> <strong>${docDate}</strong></div>
          <div class="biz-meta-pill"><span>${dueLabel}:</span> <strong>${dueDate}</strong></div>
        </div>
      </div>

      <div class="biz-body">
        <div class="biz-parties-grid">
          <div class="biz-party-box">
            <h4>${docTitle} To:</h4>
            <h3>${custName}</h3>
            ${custAddress ? `<p>${custAddress}</p>` : ''}
            ${custPhone ? `<p>Phone: ${custPhone}</p>` : ''}
            ${custEmail ? `<p>Email: ${custEmail}</p>` : ''}
          </div>
          <div class="biz-party-box" style="text-align:right;">
            <h4>${docTitle} From:</h4>
            <h3>${bizName}</h3>
            <p>${bizAddress}</p>
            <p>Phone: ${bizPhone}</p>
            <p>Email: ${bizEmail}</p>
          </div>
        </div>

        <div class="biz-table-wrap">
          <table class="biz-table">
            <thead>
              <tr>
                <th class="col-num">No.</th>
                <th class="col-desc">Product / Service Description</th>
                <th class="col-hsn">HSN / SAC</th>
                <th class="col-rate">Price</th>
                <th class="col-qty">Qty</th>
                <th class="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="biz-summary-split">
          <div class="biz-terms-card">
            <h4>Payment Instructions &amp; Notes:</h4>
            <p>${notes}</p>
            ${upiWidgetHtml}
          </div>
          <div class="biz-totals-card">
            <div class="biz-tot-row"><span>Subtotal:</span><strong>${subtotalText}</strong></div>
            ${discountAmount > 0 ? `<div class="biz-tot-row"><span>Discount:</span><strong>${discountText}</strong></div>` : ''}
            ${gstAmount > 0 ? `<div class="biz-tot-row"><span>GST / Tax:</span><strong>${gstText}</strong></div>` : ''}
            <div class="biz-tot-row" style="font-weight:700;"><span>Grand Total:</span><strong>${grandText}</strong></div>
            ${amountPaid > 0 ? `
              <div class="biz-tot-row" style="color:#059669;background:rgba(16,185,129,0.08);font-weight:700;">
                <span>Less: Advance Paid:</span>
                <span>-${advanceText}</span>
              </div>
              <div class="biz-tot-row grand">
                <span>Balance Due:</span>
                <span>${balanceText}</span>
              </div>
            ` : `
              <div class="biz-tot-row grand">
                <span>Total Due:</span>
                <span>${grandText}</span>
              </div>
            `}
          </div>
        </div>
      </div>

      <div class="biz-footer">
        <div><span>${bizPhone}</span> &bull; <span>${bizEmail}</span> &bull; <span>${bizAddress}</span></div>
        <strong>Thank You For Your Business</strong>
      </div>
      ${watermarkHtml}
    `;
    return;
  }

  // 2. MODERN TEMPLATE
  if (tpl === 'modern') {
    const rowsHtml = items.map((it, idx) => {
      const lineTotal = it.total !== undefined ? it.total : (it.quantity * it.price);
      const hsn = it.hsnSacCode || it.hsnCode || '-';
      return `
        <tr>
          <td class="col-num">${String(idx + 1).padStart(2, '0')}</td>
          <td class="col-desc">
            <strong>${it.name || 'Item'}</strong>
            ${it.description ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${it.description}</div>` : ''}
          </td>
          <td class="col-hsn">${hsn}</td>
          <td class="col-rate">${formatCurrency(it.price || 0)}</td>
          <td class="col-qty">${it.quantity || 1}</td>
          <td class="col-total">${formatCurrency(lineTotal || 0)}</td>
        </tr>
      `;
    }).join('');

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${bizName}" class="inv-brand-logo" style="max-height:48px;margin-bottom:8px;">`
      : '';

    previewEl.innerHTML = `
      <div class="mod-header">
        <div class="mod-brand">
          ${logoHtml}
          <h2>${bizName}</h2>
          <p>${bizAddress} &bull; ${bizPhone} &bull; ${bizEmail}</p>
        </div>
        <div class="mod-title-col">
          <h1>${docTitle}</h1>
          <p><strong>#${docNum}</strong></p>
          <p>Issued: ${docDate}</p>
          <p>${dueLabel}: ${dueDate}</p>
        </div>
      </div>

      <div class="mod-meta-banner">
        <div class="mod-meta-cell">
          <h4>Billed To:</h4>
          <h3>${custName}</h3>
          ${custAddress ? `<p>${custAddress}</p>` : ''}
          ${custPhone ? `<p>Phone: ${custPhone}</p>` : ''}
          ${custEmail ? `<p>Email: ${custEmail}</p>` : ''}
        </div>
        <div class="mod-meta-cell" style="text-align:right;">
          <h4>Invoice Summary:</h4>
          <p>Payment Terms: Standard</p>
          <p>Currency: INR (&#8377;)</p>
          <p>Total Balance: <strong style="color:#2563eb;font-size:15px;">${amountPaid > 0 ? balanceText : grandText}</strong></p>
        </div>
      </div>

      <table class="mod-table">
        <thead>
          <tr>
            <th class="col-num">No.</th>
            <th class="col-desc">Item &amp; Description</th>
            <th class="col-hsn">HSN / SAC</th>
            <th class="col-rate">Rate</th>
            <th class="col-qty">Qty</th>
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="mod-bottom-grid">
        <div class="mod-notes-card">
          <h4>Payment Instructions &amp; Notes:</h4>
          <p>${notes}</p>
          ${upiWidgetHtml}
        </div>
        <div class="mod-totals-wrap">
          <div class="mod-tot-line"><span>Subtotal:</span><strong>${subtotalText}</strong></div>
          ${discountAmount > 0 ? `<div class="mod-tot-line"><span>Discount:</span><strong>${discountText}</strong></div>` : ''}
          ${gstAmount > 0 ? `<div class="mod-tot-line"><span>GST Amount:</span><strong>${gstText}</strong></div>` : ''}
          <div class="mod-tot-line" style="font-weight:700;"><span>Grand Total:</span><strong>${grandText}</strong></div>
          ${amountPaid > 0 ? `
            <div class="mod-tot-line" style="color:#059669;background:rgba(16,185,129,0.08);font-weight:700;">
              <span>Less: Advance Paid:</span>
              <span>-${advanceText}</span>
            </div>
            <div class="mod-tot-line grand">
              <span>Balance Due:</span>
              <span>${balanceText}</span>
            </div>
          ` : `
            <div class="mod-tot-line grand">
              <span>Total Due:</span>
              <span>${grandText}</span>
            </div>
          `}
        </div>
      </div>

      <div class="mod-footer">
        Thank you for your business! Please remit payment by the due date.
      </div>
      ${watermarkHtml}
    `;
    return;
  }

  // 3. MINIMAL TEMPLATE
  if (tpl === 'minimal') {
    const rowsHtml = items.map((it, idx) => {
      const lineTotal = it.total !== undefined ? it.total : (it.quantity * it.price);
      const hsn = it.hsnSacCode || it.hsnCode || '-';
      return `
        <tr>
          <td class="col-num">${String(idx + 1).padStart(2, '0')}</td>
          <td class="col-desc"><strong>${it.name || 'Item'}</strong></td>
          <td class="col-hsn">${hsn}</td>
          <td class="col-rate">${formatCurrency(it.price || 0)}</td>
          <td class="col-qty">${it.quantity || 1}</td>
          <td class="col-total">${formatCurrency(lineTotal || 0)}</td>
        </tr>
      `;
    }).join('');

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${bizName}" class="inv-brand-logo" style="margin-left:auto;margin-bottom:8px;max-height:44px;">`
      : '';

    previewEl.innerHTML = `
      <div class="min-header">
        <h1 class="min-doc-title">${docTitle}</h1>
        <div class="min-biz" style="text-align:right;">
          ${logoHtml}
          <h2>${bizName}</h2>
          <p>${bizEmail}</p>
          <p>${bizPhone}</p>
        </div>
      </div>

      <div class="min-meta-grid">
        <div class="min-meta-item">
          <label>Invoice Number</label>
          <div>#${docNum}</div>
        </div>
        <div class="min-meta-item">
          <label>Date Issued</label>
          <div>${docDate}</div>
        </div>
        <div class="min-meta-item">
          <label>${dueLabel}</label>
          <div>${dueDate}</div>
        </div>
        <div class="min-meta-item">
          <label>Billed To</label>
          <div>${custName}</div>
        </div>
      </div>

      <table class="min-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-desc">Description</th>
            <th class="col-hsn">HSN / SAC</th>
            <th class="col-rate">Rate</th>
            <th class="col-qty">Qty</th>
            <th class="col-total">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="min-totals-split">
        <div class="min-notes">
          <strong style="display:block;color:#111;text-transform:uppercase;letter-spacing:1px;font-size:11px;margin-bottom:6px;">Payment Instructions &amp; Notes</strong>
          ${notes}
          ${upiWidgetHtml}
        </div>
        <div class="min-totals-table">
          <div class="min-tot-row"><span>Subtotal:</span><span>${subtotalText}</span></div>
          ${discountAmount > 0 ? `<div class="min-tot-row"><span>Discount:</span><span>${discountText}</span></div>` : ''}
          ${gstAmount > 0 ? `<div class="min-tot-row"><span>GST:</span><span>${gstText}</span></div>` : ''}
          <div class="min-tot-row" style="font-weight:600;"><span>Grand Total:</span><span>${grandText}</span></div>
          ${amountPaid > 0 ? `
            <div class="min-tot-row" style="color:#059669;font-weight:700;">
              <span>Less: Advance Paid:</span>
              <span>-${advanceText}</span>
            </div>
            <div class="min-tot-row grand">
              <span>Balance Due:</span>
              <span>${balanceText}</span>
            </div>
          ` : `
            <div class="min-tot-row grand">
              <span>Total:</span>
              <span>${grandText}</span>
            </div>
          `}
        </div>
      </div>
      ${watermarkHtml}
    `;
    return;
  }

  // 4. CLASSIC TEMPLATE
  const rowsHtml = items.map((it, idx) => {
    const lineTotal = it.total !== undefined ? it.total : (it.quantity * it.price);
    const hsn = it.hsnSacCode || it.hsnCode || '-';
    return `
      <tr>
        <td class="col-num">${idx + 1}</td>
        <td class="col-desc"><strong>${it.name || 'Item'}</strong></td>
        <td class="col-hsn">${hsn}</td>
        <td class="col-rate">${formatCurrency(it.price || 0)}</td>
        <td class="col-qty">${it.quantity || 1}</td>
        <td class="col-total">${formatCurrency(lineTotal || 0)}</td>
      </tr>
    `;
  }).join('');

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${bizName}" class="inv-brand-logo" style="margin-bottom:8px;max-height:46px;">`
    : '';

  previewEl.innerHTML = `
    <div class="cls-header">
      <div>
        ${logoHtml}
        <h2>${bizName}</h2>
        <p>${bizAddress} &bull; ${bizPhone}</p>
      </div>
      <div class="cls-stamp">${docTitle}</div>
    </div>

    <div class="cls-meta-grid">
      <div class="cls-meta-box">
        <h4>Billed To:</h4>
        <div style="font-size:15px;font-weight:700;">${custName}</div>
        ${custAddress ? `<div>${custAddress}</div>` : ''}
        ${custPhone ? `<div>${custPhone}</div>` : ''}
      </div>
      <div class="cls-meta-box" style="text-align:right;">
        <h4>Details:</h4>
        <div><strong>Number:</strong> #${docNum}</div>
        <div><strong>Date:</strong> ${docDate}</div>
        <div><strong>${dueLabel}:</strong> ${dueDate}</div>
      </div>
    </div>

    <table class="cls-table">
      <thead>
        <tr>
          <th class="col-num">S.No</th>
          <th class="col-desc">Particulars / Description</th>
          <th class="col-hsn">HSN / SAC</th>
          <th class="col-rate">Rate</th>
          <th class="col-qty">Qty</th>
          <th class="col-total">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="cls-bottom-split">
      <div class="cls-notes-box">
        <strong>Payment Instructions &amp; Notes:</strong> ${notes}
        ${upiWidgetHtml}
      </div>
      <div class="cls-totals-box">
        <div class="cls-tot-line"><span>Subtotal:</span><span>${subtotalText}</span></div>
        ${discountAmount > 0 ? `<div class="cls-tot-line"><span>Discount:</span><span>${discountText}</span></div>` : ''}
        ${gstAmount > 0 ? `<div class="cls-tot-line"><span>GST:</span><span>${gstText}</span></div>` : ''}
        <div class="cls-tot-line" style="font-weight:700;"><span>Grand Total:</span><span>${grandText}</span></div>
        ${amountPaid > 0 ? `
          <div class="cls-tot-line" style="color:#059669;background:rgba(16,185,129,0.08);font-weight:700;">
            <span>Less: Advance Paid:</span>
            <span>-${advanceText}</span>
          </div>
          <div class="cls-tot-line grand">
            <span>Balance Due:</span>
            <span>${balanceText}</span>
          </div>
        ` : `
          <div class="cls-tot-line grand">
            <span>Grand Total:</span>
            <span>${grandText}</span>
          </div>
        `}
      </div>
    </div>
    ${watermarkHtml}
  `;
}
window.renderInvoiceTemplate = renderInvoiceTemplate;

/**
 * Generates formatted professional message text for WhatsApp, SMS, or copying
 * @param {Object} doc - invoice/estimate/statement object
 * @param {string} type - 'invoice' | 'reminder' | 'estimate' | 'statement'
 * @returns {string} Clean, professional formatted message
 */
function buildShareMessage(doc, type = 'invoice') {
  if (!doc) return '';

  const bizName = doc.businessName || doc.bizName || localStorage.getItem('businessName') || 'My Business';
  const custName = doc.customerName || 'Valued Client';
  const num = doc.invoiceNumber || doc.reference || 'INV';
  const date = formatDate(doc.invoiceDate || doc.date || new Date().toISOString().split('T')[0]);
  const dueDate = formatDate(doc.dueDate || doc.validUntil || '');
  const amount = formatCurrency(doc.grandTotal !== undefined ? doc.grandTotal : (doc.balanceDue !== undefined ? doc.balanceDue : (doc.total || 0)));

  const publicLink = (doc.shareToken || doc.id) ? `${window.location.origin}/pay.html?token=${doc.shareToken || doc.id}` : '';

  if (type === 'reminder') {
    return `*PAYMENT REMINDER*\n\n` +
      `Dear *${custName}*,\n\n` +
      `This is a courteous reminder that Invoice *#${num}* from *${bizName}*` + (dueDate ? ` was due on *${dueDate}*` : '') + `.\n\n` +
      `- *Invoice Number:* #${num}\n` +
      (date ? `- *Invoice Date:* ${date}\n` : '') +
      (dueDate ? `- *Due Date:* ${dueDate}\n` : '') +
      `- *Outstanding Balance:* ${amount}\n\n` +
      (publicLink ? `View or Pay Invoice Online:\n${publicLink}\n\n` : '') +
      `Kindly arrange for payment at your earliest convenience. If this payment has already been settled, please disregard this notice.\n\n` +
      `Thank you for your prompt attention.\n\n` +
      `Sincerely,\n*${bizName}*`;
  } else if (type === 'estimate') {
    return `*QUOTATION / ESTIMATE*\n\n` +
      `Dear *${custName}*,\n\n` +
      `Please find below the quotation details (*#${num}*) from *${bizName}*:\n\n` +
      `- *Estimate Number:* #${num}\n` +
      `- *Date:* ${date}\n` +
      (dueDate ? `- *Valid Until:* ${dueDate}\n` : '') +
      `- *Estimated Amount:* ${amount}\n\n` +
      (publicLink ? `Review Proposal Online:\n${publicLink}\n\n` : '') +
      `Please review the proposal and let us know if you approve to proceed or have any questions.\n\n` +
      `Sincerely,\n*${bizName}*`;
  } else if (type === 'statement') {
    const periodText = (doc.fromDate && doc.toDate)
      ? `- *Statement Period:* ${formatDate(doc.fromDate)} to ${formatDate(doc.toDate)}\n`
      : '';
    return `*ACCOUNT STATEMENT*\n\n` +
      `Dear *${custName}*,\n\n` +
      `Please find below the account statement summary for your records from *${bizName}*:\n\n` +
      periodText +
      `- *Total Invoiced:* ${formatCurrency(doc.totalInvoiced || 0)}\n` +
      `- *Total Paid:* ${formatCurrency(doc.totalPaid || 0)}\n` +
      `- *Current Balance Due:* ${amount}\n\n` +
      `If you have any questions or require a detailed statement of accounts, please feel free to reach out.\n\n` +
      `Thank you for your business.\n\n` +
      `Sincerely,\n*${bizName}*`;
  } else {
    // Standard Tax Invoice
    return `*TAX INVOICE*\n\n` +
      `Dear *${custName}*,\n\n` +
      `Thank you for your business. Please find below the invoice details from *${bizName}*:\n\n` +
      `- *Invoice Number:* #${num}\n` +
      `- *Invoice Date:* ${date}\n` +
      (dueDate ? `- *Due Date:* ${dueDate}\n` : '') +
      `- *Total Amount Due:* ${amount}\n\n` +
      (publicLink ? `View or Pay Invoice Online:\n${publicLink}\n\n` : '') +
      `Please let us know once payment has been initiated. If you have any questions or require an additional copy, please feel free to contact us.\n\n` +
      `Sincerely,\n*${bizName}*`;
  }
}

/**
 * 1-Click WhatsApp Invoice & Reminders
 * @param {Object} doc - invoice/estimate/statement object
 * @param {string} type - 'invoice' | 'reminder' | 'estimate' | 'statement'
 */
function shareOnWhatsApp(doc, type = 'invoice') {
  if (!doc) return;

  const msg = buildShareMessage(doc, type);
  const rawPhone = (doc.customerPhone || doc.phone || '').trim();

  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  if (!cleanPhone) {
    promptWhatsAppPhone(msg);
    return;
  }

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function promptWhatsAppPhone(messageText) {
  let modal = document.getElementById('whatsapp-prompt-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'whatsapp-prompt-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-header">
          <h3 style="margin:0;font-size:16px;font-weight:600;">Share via WhatsApp</h3>
          <button class="modal-close" onclick="document.getElementById('whatsapp-prompt-modal').classList.remove('active')">&times;</button>
        </div>
        <div class="form-group" style="margin-top:16px;">
          <label style="font-size:13px;font-weight:500;color:#334155;">Recipient WhatsApp Number (with country code):</label>
          <input type="text" id="wa-modal-phone" placeholder="e.g. 919876543210 or 9876543210" style="margin-top:6px;">
        </div>
        <div class="form-group" style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label style="font-size:13px;font-weight:500;color:#334155;margin:0;">Message Preview:</label>
            <span style="font-size:11px;color:#64748b;">Ready to copy &amp; paste</span>
          </div>
          <textarea id="wa-modal-msg" rows="9" style="font-size:12px;font-family:inherit;line-height:1.5;white-space:pre-wrap;resize:vertical;" readonly></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
          <button type="button" class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('wa-modal-msg').value); if(typeof showToast==='function') showToast('Message copied to clipboard!','success');">Copy Message</button>
          <button type="button" class="btn btn-primary" style="background:#25d366;border-color:#25d366;color:#ffffff;" id="wa-modal-send-btn">Open in WhatsApp</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('wa-modal-msg').value = messageText;
  document.getElementById('wa-modal-phone').value = '';
  modal.classList.add('active');

  const sendBtn = document.getElementById('wa-modal-send-btn');
  sendBtn.onclick = () => {
    let p = document.getElementById('wa-modal-phone').value.replace(/\D/g, '');
    if (p.length === 10) p = '91' + p;
    if (!p) {
      if (typeof showToast === 'function') showToast('Please enter a valid phone number', 'warning');
      return;
    }
    modal.classList.remove('active');
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(messageText)}`, '_blank');
  };
}

window.buildShareMessage = buildShareMessage;
window.shareOnWhatsApp = shareOnWhatsApp;
