// js/api.js

const API_BASE_URL = '';

async function apiRequest(method, url, body = null) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method: method,
    headers: headers
  };

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
      // Let browser set Content-Type for FormData
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(API_BASE_URL + url, options);

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      window.location.href = 'login.html';
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
  }
  return token;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  window.location.href = 'login.html';
}

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

  const subtotalText = doc.subtotalText || formatCurrency(doc.subtotal || 0);
  const discountText = doc.discountText || formatCurrency(doc.discountAmount || 0);
  const gstText = doc.gstText || formatCurrency(doc.gstAmount || 0);
  const grandText = doc.grandText || formatCurrency(doc.grandTotal || 0);

  const logoUrl = doc.logoUrl || localStorage.getItem('userLogo') || '';

  // 1. BUSINESS TEMPLATE
  if (tpl === 'business') {
    const rowsHtml = items.map((it, idx) => {
      const lineTotal = it.total !== undefined ? it.total : (it.quantity * it.price);
      const hsn = it.hsnSacCode || it.hsnCode || '-';
      return `
        <tr>
          <td class="col-center" style="font-weight:700;">${String(idx + 1).padStart(2, '0')}</td>
          <td>
            <strong>${it.name || 'Item'}</strong>
            ${it.description ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${it.description}</div>` : ''}
          </td>
          <td class="hsn-code">${hsn}</td>
          <td class="col-right">${formatCurrency(it.price || 0)}</td>
          <td class="col-center" style="font-weight:600;">${it.quantity || 1}</td>
          <td class="col-right" style="font-weight:700;">${formatCurrency(lineTotal || 0)}</td>
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
                <th>Product / Service Description</th>
                <th class="col-hsn">HSN / SAC</th>
                <th class="col-rate">Price</th>
                <th class="col-qty" style="text-align:center;">Qty</th>
                <th class="col-amt">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="biz-summary-split">
          <div class="biz-terms-card">
            <h4>Terms &amp; Instructions:</h4>
            <p>${notes}</p>
          </div>
          <div class="biz-totals-card">
            <div class="biz-tot-row"><span>Subtotal:</span><strong>${subtotalText}</strong></div>
            <div class="biz-tot-row"><span>Discount:</span><strong>${discountText}</strong></div>
            <div class="biz-tot-row"><span>GST / Tax:</span><strong>${gstText}</strong></div>
            <div class="biz-tot-row grand"><span>Total Due:</span><span>${grandText}</span></div>
          </div>
        </div>
      </div>

      <div class="biz-footer">
        <div><span>${bizPhone}</span> &bull; <span>${bizEmail}</span> &bull; <span>${bizAddress}</span></div>
        <strong>Thank You For Your Business</strong>
      </div>
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
          <td class="col-center">${String(idx + 1).padStart(2, '0')}</td>
          <td>
            <strong>${it.name || 'Item'}</strong>
            ${it.description ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${it.description}</div>` : ''}
          </td>
          <td class="hsn-code">${hsn}</td>
          <td class="col-right">${formatCurrency(it.price || 0)}</td>
          <td class="col-center" style="font-weight:600;">${it.quantity || 1}</td>
          <td class="col-right" style="font-weight:700;">${formatCurrency(lineTotal || 0)}</td>
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
          <p>Total Balance: <strong style="color:#2563eb;font-size:15px;">${grandText}</strong></p>
        </div>
      </div>

      <table class="mod-table">
        <thead>
          <tr>
            <th class="col-num">No.</th>
            <th>Item &amp; Description</th>
            <th class="col-hsn">HSN / SAC</th>
            <th class="col-right">Rate</th>
            <th class="col-right" style="text-align:center;">Qty</th>
            <th class="col-right">Total</th>
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
        </div>
        <div class="mod-totals-wrap">
          <div class="mod-tot-line"><span>Subtotal:</span><strong>${subtotalText}</strong></div>
          <div class="mod-tot-line"><span>Discount:</span><strong>${discountText}</strong></div>
          <div class="mod-tot-line"><span>GST Amount:</span><strong>${gstText}</strong></div>
          <div class="mod-tot-line grand"><span>Total Due:</span><span>${grandText}</span></div>
        </div>
      </div>

      <div class="mod-footer">
        Thank you for your business! Please remit payment by the due date.
      </div>
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
          <td style="color:#9ca3af;width:40px;">${String(idx + 1).padStart(2, '0')}</td>
          <td><strong>${it.name || 'Item'}</strong></td>
          <td class="hsn-code">${hsn}</td>
          <td style="text-align:right;">${formatCurrency(it.price || 0)}</td>
          <td style="text-align:center;">${it.quantity || 1}</td>
          <td style="text-align:right;font-weight:700;">${formatCurrency(lineTotal || 0)}</td>
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
            <th>#</th>
            <th>Description</th>
            <th style="text-align:center;">HSN / SAC</th>
            <th style="text-align:right;">Rate</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="min-totals-split">
        <div class="min-notes">
          <strong style="display:block;color:#111;text-transform:uppercase;letter-spacing:1px;font-size:11px;margin-bottom:6px;">Notes</strong>
          ${notes}
        </div>
        <div class="min-totals-table">
          <div class="min-tot-row"><span>Subtotal:</span><span>${subtotalText}</span></div>
          <div class="min-tot-row"><span>Discount:</span><span>${discountText}</span></div>
          <div class="min-tot-row"><span>GST:</span><span>${gstText}</span></div>
          <div class="min-tot-row grand"><span>Total:</span><span>${grandText}</span></div>
        </div>
      </div>
    `;
    return;
  }

  // 4. CLASSIC TEMPLATE
  const rowsHtml = items.map((it, idx) => {
    const lineTotal = it.total !== undefined ? it.total : (it.quantity * it.price);
    const hsn = it.hsnSacCode || it.hsnCode || '-';
    return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${it.name || 'Item'}</strong></td>
        <td class="hsn-code">${hsn}</td>
        <td style="text-align:right;">${formatCurrency(it.price || 0)}</td>
        <td style="text-align:center;">${it.quantity || 1}</td>
        <td style="text-align:right;font-weight:700;">${formatCurrency(lineTotal || 0)}</td>
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
          <th style="width:45px;text-align:center;">S.No</th>
          <th>Particulars / Description</th>
          <th style="width:110px;text-align:center;">HSN / SAC</th>
          <th style="width:110px;text-align:right;">Rate</th>
          <th style="width:70px;text-align:center;">Qty</th>
          <th style="width:120px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="cls-bottom-split">
      <div class="cls-notes-box">
        <strong>Notes:</strong> ${notes}
      </div>
      <div class="cls-totals-box">
        <div class="cls-tot-line"><span>Subtotal:</span><span>${subtotalText}</span></div>
        <div class="cls-tot-line"><span>Discount:</span><span>${discountText}</span></div>
        <div class="cls-tot-line"><span>GST:</span><span>${gstText}</span></div>
        <div class="cls-tot-line grand"><span>Grand Total:</span><span>${grandText}</span></div>
      </div>
    </div>
  `;
}
window.renderInvoiceTemplate = renderInvoiceTemplate;

/**
 * 1-Click WhatsApp Invoice & Reminders
 * @param {Object} doc - invoice/estimate object
 * @param {string} type - 'invoice' | 'reminder' | 'estimate' | 'statement'
 */
function shareOnWhatsApp(doc, type = 'invoice') {
  if (!doc) return;
  
  const bizName = doc.businessName || doc.bizName || localStorage.getItem('businessName') || 'My Business';
  const custName = doc.customerName || 'Valued Client';
  const num = doc.invoiceNumber || doc.reference || 'INV';
  const date = formatDate(doc.invoiceDate || doc.date || new Date().toISOString().split('T')[0]);
  const dueDate = formatDate(doc.dueDate || doc.validUntil || '');
  const amount = formatCurrency(doc.grandTotal !== undefined ? doc.grandTotal : (doc.balanceDue || doc.total || 0));
  const rawPhone = (doc.customerPhone || doc.phone || '').trim();

  let msg = '';
  if (type === 'reminder') {
    msg = `*🔔 PAYMENT REMINDER*\n\n` +
      `Hello *${custName}*,\n\n` +
      `This is a gentle reminder that invoice *#${num}* from *${bizName}* was due on *${dueDate}*.\n\n` +
      `📄 *Invoice No:* #${num}\n` +
      `💰 *Pending Amount:* ${amount}\n` +
      `📅 *Due Date:* ${dueDate}\n\n` +
      `Please clear the balance at your earliest convenience or let us know if you need another copy of the invoice.\n\n` +
      `Thank you!\n*${bizName}*`;
  } else if (type === 'estimate') {
    msg = `*📑 NEW ESTIMATE / QUOTATION*\n\n` +
      `Hello *${custName}*,\n\n` +
      `Please find attached quotation *#${num}* from *${bizName}*.\n\n` +
      `📄 *Estimate No:* #${num}\n` +
      `📅 *Date:* ${date}\n` +
      `💰 *Total Estimated:* ${amount}\n` +
      (dueDate ? `⏳ *Valid Until:* ${dueDate}\n\n` : '\n') +
      `Please review and let us know if you approve this quote to proceed.\n\n` +
      `Best regards,\n*${bizName}*`;
  } else if (type === 'statement') {
    msg = `*📊 ACCOUNT STATEMENT*\n\n` +
      `Hello *${custName}*,\n\n` +
      `Here is your account statement summary from *${bizName}*:\n\n` +
      `💰 *Total Invoiced:* ${formatCurrency(doc.totalInvoiced || 0)}\n` +
      `✅ *Total Paid:* ${formatCurrency(doc.totalPaid || 0)}\n` +
      `⚠️ *Current Balance Due:* ${amount}\n\n` +
      `Thank you for your business!\n*${bizName}*`;
  } else {
    // Standard invoice
    msg = `*📄 TAX INVOICE*\n\n` +
      `Hello *${custName}*,\n\n` +
      `Thank you for your business! Here are the details of invoice *#${num}* from *${bizName}*:\n\n` +
      `📄 *Invoice No:* #${num}\n` +
      `📅 *Invoice Date:* ${date}\n` +
      `⏳ *Due Date:* ${dueDate}\n` +
      `💰 *Total Amount:* ${amount}\n\n` +
      `Please let us know once the payment is initiated.\n\n` +
      `Best regards,\n*${bizName}*`;
  }

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
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h3 style="display:flex;align-items:center;gap:8px;">
            <span style="color:#25d366;font-size:20px;">&#128172;</span> Send via WhatsApp
          </h3>
          <button class="modal-close" onclick="document.getElementById('whatsapp-prompt-modal').classList.remove('active')">&times;</button>
        </div>
        <div class="form-group">
          <label>Recipient WhatsApp Number (with country code):</label>
          <input type="text" id="wa-modal-phone" placeholder="e.g. 919876543210 or 9876543210">
        </div>
        <div class="form-group">
          <label>Message Preview:</label>
          <textarea id="wa-modal-msg" rows="5" style="font-size:12px;font-family:monospace;white-space:pre-wrap;" readonly></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('wa-modal-msg').value); if(typeof showToast==='function') showToast('Message copied to clipboard!','success');">Copy Text</button>
          <button type="button" class="btn btn-primary" style="background:#25d366;border-color:#25d366;" id="wa-modal-send-btn">Open WhatsApp</button>
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

window.shareOnWhatsApp = shareOnWhatsApp;

