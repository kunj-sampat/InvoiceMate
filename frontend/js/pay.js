// js/pay.js - Public Client Invoice & Settlement Logic

let currentInvoice = null;
let currentToken = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  currentToken = params.get('token') || params.get('id');

  if (!currentToken) {
    showError();
    return;
  }

  loadPublicInvoice(currentToken);
});

async function loadPublicInvoice(token) {
  const loader = document.getElementById('portal-loader');
  const content = document.getElementById('portal-content');
  const errorEl = document.getElementById('portal-error');

  try {
    const res = await fetch(`/api/public/invoices/${encodeURIComponent(token)}`);
    if (!res.ok) {
      throw new Error(`Failed to load invoice: ${res.status}`);
    }

    const data = await res.json();
    currentInvoice = data;

    // Set page title
    document.title = `Invoice #${data.invoiceNumber} - ${data.businessName || 'InvoiceMate'}`;

    // Update Header Brand
    const bizNameEl = document.getElementById('portal-biz-name');
    if (bizNameEl && data.businessName) {
      bizNameEl.textContent = data.businessName;
    }
    const logoEl = document.getElementById('portal-logo');
    if (logoEl && data.logoUrl) {
      logoEl.src = data.logoUrl;
    }

    // Set PDF download URL
    const pdfBtn = document.getElementById('btn-download-pdf');
    if (pdfBtn) {
      pdfBtn.href = `/api/public/invoices/${encodeURIComponent(token)}/pdf`;
      pdfBtn.setAttribute('download', `invoice_${data.invoiceNumber || 'bill'}.pdf`);
    }

    // Render Paper Invoice Template
    renderInvoicePaper(data);

    // Setup Settlement Sidebar & UPI
    renderSettlementSidebar(data);

    // Show Content
    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'grid';

  } catch (err) {
    console.error('Error fetching public invoice:', err);
    if (loader) loader.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
  }
}

function renderInvoicePaper(data) {
  const preview = document.getElementById('invoice-preview');
  if (!preview) return;

  const subtotal = data.subtotal || 0;
  const discountAmount = data.discountAmount || 0;
  const gstAmount = data.gstAmount || 0;
  const grandTotal = data.grandTotal || 0;
  const amountPaid = data.amountPaid || 0;

  renderInvoiceTemplate(preview, data.template || 'modern', {
    docTitle: data.estimate ? 'ESTIMATE' : 'INVOICE',
    docNumber: data.invoiceNumber || 'INV-0001',
    docDate: formatDate(data.invoiceDate),
    dueDate: formatDate(data.dueDate),
    dueLabel: data.estimate ? 'Valid Until' : 'Due Date',
    businessName: data.businessName || 'Merchant',
    bizName: data.businessName || 'Merchant',
    businessAddress: data.businessAddress || '',
    businessPhone: data.businessPhone || '',
    businessEmail: data.businessEmail || '',
    logoUrl: data.logoUrl || '',
    upiId: data.upiId || '',
    customerName: data.customerName || 'Valued Client',
    customerEmail: data.customerEmail || '',
    customerPhone: data.customerPhone || '',
    customerAddress: data.customerAddress || '',
    notes: data.notes || '',
    items: data.items || [],
    subtotal: subtotal,
    discountAmount: discountAmount,
    gstAmount: gstAmount,
    grandTotal: grandTotal,
    amountPaid: amountPaid,
    advancePaid: amountPaid
  });
}

function renderSettlementSidebar(data) {
  const grandTotal = data.grandTotal || 0;
  const amountPaid = data.amountPaid || 0;
  const balanceDue = Math.max(0, grandTotal - amountPaid);
  const status = (data.status || 'PENDING').toUpperCase();

  // Status Badge
  const badge = document.getElementById('settlement-badge');
  if (badge) {
    badge.textContent = status;
    badge.className = status === 'PAID' ? 'badge-paid' : (status === 'OVERDUE' ? 'badge-overdue' : 'badge-pending');
  }

  // Amount Payable Display
  const amountEl = document.getElementById('settlement-amount');
  const amountLabel = document.getElementById('settlement-amount-label');
  const dueDateEl = document.getElementById('settlement-due-date');

  if (status === 'PAID') {
    if (amountLabel) amountLabel.textContent = 'Total Settled';
    if (amountEl) {
      amountEl.textContent = formatCurrency(grandTotal);
      amountEl.style.color = '#10b981';
    }
    const upiBlock = document.getElementById('settlement-upi-block');
    if (upiBlock) upiBlock.style.display = 'none';
    const paidBlock = document.getElementById('settlement-paid-block');
    if (paidBlock) paidBlock.style.display = 'block';
    const notifyBtn = document.getElementById('btn-paid-confirm');
    if (notifyBtn) notifyBtn.style.display = 'none';
  } else {
    if (amountLabel) amountLabel.textContent = amountPaid > 0 ? 'Remaining Balance' : 'Amount Payable';
    if (amountEl) amountEl.textContent = formatCurrency(balanceDue);
    if (dueDateEl) dueDateEl.textContent = `Due Date: ${formatDate(data.dueDate)}`;

    // Generate Dynamic Scan-to-Pay UPI QR Code
    setupUpiQr(data, balanceDue);
  }
}

function setupUpiQr(data, payableAmount) {
  const upiId = data.upiId || '';
  const upiPill = document.getElementById('upi-display-id');
  if (upiPill) {
    upiPill.textContent = upiId ? upiId : 'Contact merchant for UPI';
  }

  const qrContainer = document.getElementById('upi-qr-box');
  if (!qrContainer) return;
  qrContainer.innerHTML = '';

  if (!upiId) {
    qrContainer.innerHTML = '<p style="color:#64748b;font-size:0.8rem;padding:20px;">UPI ID not set by merchant.</p>';
    return;
  }

  const payeeName = encodeURIComponent(data.businessName || 'InvoiceMate Merchant');
  const note = encodeURIComponent(`Invoice ${data.invoiceNumber}`);
  const formattedAmount = Number(payableAmount).toFixed(2);

  // Dynamic NPCI UPI QR Scheme
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&am=${formattedAmount}&cu=INR&tn=${note}`;

  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: upiUri,
        width: 170,
        height: 170,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.M : 0
      });
    }
  } catch (err) {
    console.warn('QR code generation error:', err);
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(upiUri)}" alt="UPI QR" style="width:170px;height:170px;">`;
  }

  // Set Mobile Intent Link
  const intentBtn = document.getElementById('btn-upi-intent');
  if (intentBtn) {
    intentBtn.href = upiUri;
  }
}

function copyUpiId() {
  if (!currentInvoice || !currentInvoice.upiId) {
    if (typeof showToast === 'function') showToast('No UPI ID configured', 'info');
    return;
  }
  navigator.clipboard.writeText(currentInvoice.upiId).then(() => {
    if (typeof showToast === 'function') {
      showToast('UPI ID copied to clipboard!', 'success');
    } else {
      alert('UPI ID copied: ' + currentInvoice.upiId);
    }
  }).catch(() => {
    alert('UPI ID: ' + currentInvoice.upiId);
  });
}

function confirmPaymentSent() {
  const btn = document.getElementById('btn-paid-confirm');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-check-double" style="color:#10b981;"></i> Payment notification recorded!';
    btn.style.borderColor = '#10b981';
    btn.style.color = '#10b981';
    btn.disabled = true;
  }
  if (typeof showToast === 'function') {
    showToast('Payment notice received! The merchant will verify and mark invoice as settled.', 'success');
  }
}

function showError() {
  const loader = document.getElementById('portal-loader');
  const errorEl = document.getElementById('portal-error');
  if (loader) loader.style.display = 'none';
  if (errorEl) errorEl.style.display = 'block';
}
