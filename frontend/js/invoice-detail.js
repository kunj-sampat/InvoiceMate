// js/invoice-detail.js

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (id) {
    loadInvoice(id);
    setupEventListeners(id);
  } else {
    if(typeof showToast === 'function') showToast('No invoice ID provided', 'error');
  }
});

let currentInvoice = null;

async function loadInvoice(id) {
  try {
    const data = await apiRequest('GET', `/api/invoices/${id}`);
    if (!data) return;
    currentInvoice = data;

    document.title = `Invoice #${data.invoiceNumber}`;
    renderInvoice(data);
    
    // Update summary panel
    const totalEl = document.getElementById('summary-total');
    if (totalEl) totalEl.textContent = formatCurrency(data.grandTotal);
    
    const paidAmount = data.amountPaid || 0;
    const paidEl = document.getElementById('summary-paid');
    if (paidEl) paidEl.textContent = formatCurrency(paidAmount);
    
    const remaining = data.grandTotal - paidAmount;
    const remainingEl = document.getElementById('summary-remaining');
    if (remainingEl) remainingEl.textContent = formatCurrency(remaining);
    
    const statusBadge = document.getElementById('summary-status');
    if (statusBadge) {
      statusBadge.textContent = data.status;
      statusBadge.className = `badge ${getStatusBadgeClass(data.status)}`;
    }

    // Show reminder button if pending or overdue
    const remindBtn = document.getElementById('whatsapp-remind-btn');
    if (remindBtn) {
      const s = (data.status || '').toUpperCase();
      if (s === 'PENDING' || s === 'OVERDUE' || s === 'PARTIALLY_PAID') {
        remindBtn.style.display = 'inline-flex';
      } else {
        remindBtn.style.display = 'none';
      }
    }

    loadPayments(id);
    loadActivities(id);

  } catch (error) {
    if(typeof showToast === 'function') showToast('Failed to load invoice details', 'error');
  }
}

function renderInvoice(data) {
  const preview = document.getElementById('invoice-preview');
  if (!preview) return;

  let bizSettings = {};
  try {
    bizSettings = JSON.parse(localStorage.getItem('bizSettings') || '{}');
  } catch(e){}

  const subtotal = data.subtotal || 0;
  const discountPercent = data.discountPercent || 0;
  const discountAmount = data.discountAmount || (subtotal * discountPercent / 100);
  const gstPercent = data.gstPercent || 0;
  const gstAmount = data.gstAmount || ((subtotal - discountAmount) * gstPercent / 100);
  const grandTotal = data.grandTotal || 0;

  renderInvoiceTemplate(preview, data.template || 'modern', {
    docTitle: data.estimate ? 'ESTIMATE' : 'INVOICE',
    docNumber: data.invoiceNumber || 'INV-0001',
    docDate: formatDate(data.invoiceDate),
    dueDate: formatDate(data.dueDate),
    dueLabel: data.estimate ? 'Valid Until' : 'Due Date',
    businessName: data.businessName || bizSettings.businessName || localStorage.getItem('businessName') || 'My Business',
    bizName: data.businessName || bizSettings.businessName || localStorage.getItem('businessName') || 'My Business',
    businessAddress: data.businessAddress || bizSettings.businessAddress || 'India',
    businessPhone: data.businessPhone || bizSettings.businessPhone || '',
    businessEmail: data.businessEmail || bizSettings.businessEmail || localStorage.getItem('userEmail') || '',
    logoUrl: data.logoUrl || bizSettings.logoPath || localStorage.getItem('userLogo') || '',
    upiId: data.upiId || bizSettings.upiId || localStorage.getItem('userUpiId') || '',
    customerName: data.customerName || 'Client',
    customerEmail: data.customerEmail || '',
    customerPhone: data.customerPhone || '',
    customerAddress: data.customerAddress || '',
    notes: data.notes || '',
    items: data.items || [],
    subtotal: subtotal,
    discountAmount: discountAmount,
    gstAmount: gstAmount,
    grandTotal: grandTotal
  });
}

async function loadPayments(invoiceId) {
  try {
    const data = await apiRequest('GET', `/api/payments?invoiceId=${invoiceId}`);
    const list = document.getElementById('payments-list');
    if (!list) return;
    
    list.innerHTML = '';
    if (!data || data.length === 0) {
      list.innerHTML = '<p>No payments recorded.</p>';
      return;
    }
    
    data.forEach(p => {
      const div = document.createElement('div');
      div.className = 'payment-item';
      div.innerHTML = `<strong>${formatCurrency(p.amount)}</strong> on ${formatDate(p.paymentDate)} via ${p.paymentMethod}`;
      list.appendChild(div);
    });
  } catch(e) {}
}

async function loadActivities(invoiceId) {
  try {
    const data = await apiRequest('GET', `/api/invoices/${invoiceId}/activities`);
    const list = document.getElementById('activity-list');
    if (!list) return;
    
    list.innerHTML = '';
    if (!data || data.length === 0) {
      list.innerHTML = '<p>No activity recorded.</p>';
      return;
    }
    
    data.forEach(a => {
      const div = document.createElement('div');
      div.className = 'activity-item';
      div.innerHTML = `<em>${formatDate(a.createdAt)}</em> - ${a.description}`;
      list.appendChild(div);
    });
  } catch(e) {}
}

function setupEventListeners(id) {
  const recordBtn = document.getElementById('record-payment-btn');
  const paymentModal = document.getElementById('payment-modal');
  const closePaymentModalBtn = document.getElementById('close-payment-modal');
  const cancelPaymentBtn = document.getElementById('cancel-payment-btn');

  function openPaymentModal() {
    if (!paymentModal) return;
    paymentModal.style.display = 'flex';
    paymentModal.classList.add('active');

    // Pre-fill remaining amount and today's date
    if (currentInvoice) {
      const remaining = Math.max(0, (currentInvoice.grandTotal || 0) - (currentInvoice.paidAmount || 0));
      const amtInput = document.getElementById('payment-amount');
      if (amtInput) amtInput.value = remaining > 0 ? remaining : (currentInvoice.grandTotal || 0);

      const dateInput = document.getElementById('payment-date');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  function closePaymentModal() {
    if (!paymentModal) return;
    paymentModal.style.display = 'none';
    paymentModal.classList.remove('active');
  }

  if (recordBtn) recordBtn.addEventListener('click', openPaymentModal);
  if (closePaymentModalBtn) closePaymentModalBtn.addEventListener('click', closePaymentModal);
  if (cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', closePaymentModal);
  if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
      if (e.target === paymentModal) closePaymentModal();
    });
  }

  const savePaymentBtn = document.getElementById('save-payment-btn');
  if (savePaymentBtn) {
    savePaymentBtn.addEventListener('click', async () => {
      const amountInput = document.getElementById('payment-amount') || document.getElementById('pay-amount');
      const dateInput = document.getElementById('payment-date') || document.getElementById('pay-date');
      const methodInput = document.getElementById('payment-method') || document.getElementById('pay-method');
      const notesInput = document.getElementById('payment-notes') || document.getElementById('pay-notes');

      const amount = Number(amountInput?.value);
      const date = dateInput?.value || new Date().toISOString().split('T')[0];
      const method = methodInput?.value || 'Bank Transfer';
      const notes = notesInput?.value || '';

      if (isNaN(amount) || amount <= 0) {
        if (typeof showToast === 'function') showToast('Please enter a valid payment amount', 'error');
        return;
      }

      try {
        savePaymentBtn.disabled = true;
        savePaymentBtn.textContent = 'Saving...';
        await apiRequest('POST', '/api/payments', { invoiceId: id, amount, paymentDate: date, paymentMethod: method, notes });
        closePaymentModal();
        if (typeof showToast === 'function') showToast('Payment recorded successfully', 'success');
        await loadInvoice(id);
      } catch (error) {
        if (typeof showToast === 'function') showToast(error.message || 'Failed to record payment', 'error');
      } finally {
        savePaymentBtn.disabled = false;
        savePaymentBtn.textContent = 'Save Payment';
      }
    });
  }

  const waShareBtn = document.getElementById('whatsapp-share-btn');
  if (waShareBtn) {
    waShareBtn.addEventListener('click', () => {
      if (currentInvoice && typeof shareOnWhatsApp === 'function') {
        shareOnWhatsApp(currentInvoice, currentInvoice.estimate ? 'estimate' : 'invoice');
      }
    });
  }

  const waRemindBtn = document.getElementById('whatsapp-remind-btn');
  if (waRemindBtn) {
    waRemindBtn.addEventListener('click', () => {
      if (currentInvoice && typeof shareOnWhatsApp === 'function') {
        shareOnWhatsApp(currentInvoice, 'reminder');
      }
    });
  }

  const printBtn = document.getElementById('print-btn') || document.getElementById('print-invoice-btn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  // Styled PDF download: uses html2pdf to preserve 100% same-to-same template styling
  const downloadBtn = document.getElementById('download-pdf-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      const previewEl = document.getElementById('invoice-preview');
      if (!previewEl) return;

      const invNum = currentInvoice?.invoiceNumber || id;
      const origHtml = downloadBtn.innerHTML;
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = `
        <div class="invoza-bar-loader" style="height:14px; margin-right:4px;">
          <span style="height:14px; width:3px;"></span>
          <span style="height:11px; width:3px;"></span>
          <span style="height:8px; width:3px;"></span>
          <span style="height:5px; width:3px;"></span>
        </div>
        <span>Generating PDF...</span>
      `;

      try {
        if (window.html2pdf) {
          const opt = {
            margin: [8, 8, 8, 8],
            filename: `Invoice_${invNum}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          await window.html2pdf().set(opt).from(previewEl).save();
          if (typeof showToast === 'function') showToast('PDF downloaded successfully!', 'success');
        } else {
          // Fallback to API download if html2pdf isn't loaded
          const token = localStorage.getItem('token');
          const resp = await fetch(`/api/invoices/${id}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!resp.ok) throw new Error('Download failed');
          const blob = await resp.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice_${invNum}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch (error) {
        console.error('PDF error:', error);
        window.print();
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = origHtml;
      }
    });
  }

  const dupBtn = document.getElementById('duplicate-btn') || document.getElementById('duplicate-invoice-btn');
  if (dupBtn) {
    dupBtn.addEventListener('click', async () => {
      try {
        const resp = await apiRequest('POST', `/api/invoices/${id}/duplicate`);
        if (resp && resp.id) {
          window.location.href = `invoice-detail.html?id=${resp.id}`;
        }
      } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
      }
    });
  }

  const delBtn = document.getElementById('delete-btn') || document.getElementById('delete-invoice-btn');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      const ok = await showConfirmDialog({
        title: 'Delete Invoice?',
        message: 'Are you sure you want to permanently delete this invoice? This action cannot be undone.',
        confirmText: 'Delete Invoice',
        isDanger: true
      });
      if (!ok) return;
      try {
        await apiRequest('DELETE', `/api/invoices/${id}`);
        window.location.href = 'invoices.html';
      } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
      }
    });
  }

  // Generate Reminder in WhatsApp reminder box
  const genReminderBtn = document.getElementById('reminder-btn') || document.getElementById('generate-reminder-btn');
  function generateReminderText() {
    if (!currentInvoice) return '';
    const remaining = Math.max(0, (currentInvoice.grandTotal || 0) - (currentInvoice.paidAmount || 0));
    const bizName = currentInvoice.businessName || localStorage.getItem('businessName') || 'InvoiceMate';
    const text = `Dear ${currentInvoice.customerName || 'Client'},\n\nThis is a friendly reminder that invoice #${currentInvoice.invoiceNumber} for ${formatCurrency(remaining)} was due on ${formatDate(currentInvoice.dueDate)}.\n\nPlease let us know once the payment is initiated. You can also scan the UPI QR code on the invoice to pay directly.\n\nThank you!\n${bizName}`;
    const ta = document.getElementById('reminder-text');
    if (ta) ta.value = text;
    return text;
  }

  if (genReminderBtn) {
    genReminderBtn.addEventListener('click', () => {
      generateReminderText();
      if (typeof showToast === 'function') showToast('Friendly reminder generated', 'info');
    });
  }

  const copyBtn = document.getElementById('copy-reminder-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const ta = document.getElementById('reminder-text');
      if (ta && ta.value) {
        navigator.clipboard.writeText(ta.value);
        if (typeof showToast === 'function') showToast('Copied to clipboard', 'success');
      } else {
        generateReminderText();
        navigator.clipboard.writeText(document.getElementById('reminder-text')?.value || '');
        if (typeof showToast === 'function') showToast('Generated & copied to clipboard', 'success');
      }
    });
  }

  const copyWaBtn = document.getElementById('copy-whatsapp-btn');
  if (copyWaBtn) {
    copyWaBtn.addEventListener('click', () => {
      let ta = document.getElementById('reminder-text');
      let text = ta?.value;
      if (!text) {
        text = generateReminderText();
      }
      if (!text) return;

      const rawPhone = currentInvoice?.customerPhone || '';
      let cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

      if (cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
      } else if (typeof promptWhatsAppPhone === 'function') {
        promptWhatsAppPhone(text);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    });
  }
}
