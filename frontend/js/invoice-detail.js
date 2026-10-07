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
  if (recordBtn && paymentModal) {
    recordBtn.addEventListener('click', () => {
      paymentModal.style.display = 'flex'; // simplistic modal show
    });
  }

  const savePaymentBtn = document.getElementById('save-payment-btn');
  if (savePaymentBtn) {
    savePaymentBtn.addEventListener('click', async () => {
      const amount = Number(document.getElementById('pay-amount')?.value);
      const date = document.getElementById('pay-date')?.value;
      const method = document.getElementById('pay-method')?.value;
      const notes = document.getElementById('pay-notes')?.value;

      if (!amount || amount <= 0) {
        if(typeof showToast === 'function') showToast('Invalid amount', 'error');
        return;
      }

      try {
        await apiRequest('POST', '/api/payments', { invoiceId: id, amount, paymentDate: date, paymentMethod: method, notes });
        if(paymentModal) paymentModal.style.display = 'none';
        if(typeof showToast === 'function') showToast('Payment recorded', 'success');
        loadInvoice(id);
      } catch (error) {
        if(typeof showToast === 'function') showToast(error.message, 'error');
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

  const downloadBtn = document.getElementById('download-pdf-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch(`/api/invoices/${id}/pdf`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Download failed');
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${currentInvoice?.invoiceNumber || id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (error) {
        if(typeof showToast === 'function') showToast('Failed to download PDF', 'error');
      }
    });
  }

  const dupBtn = document.getElementById('duplicate-btn');
  if (dupBtn) {
    dupBtn.addEventListener('click', async () => {
      try {
        const resp = await apiRequest('POST', `/api/invoices/${id}/duplicate`);
        if (resp && resp.id) {
          window.location.href = `invoice-detail.html?id=${resp.id}`;
        }
      } catch (error) {
        if(typeof showToast === 'function') showToast(error.message, 'error');
      }
    });
  }

  const delBtn = document.getElementById('delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this invoice?')) return;
      try {
        await apiRequest('DELETE', `/api/invoices/${id}`);
        window.location.href = 'invoices.html';
      } catch (error) {
        if(typeof showToast === 'function') showToast(error.message, 'error');
      }
    });
  }

  const genReminderBtn = document.getElementById('generate-reminder-btn');
  if (genReminderBtn) {
    genReminderBtn.addEventListener('click', () => {
      if (!currentInvoice) return;
      const text = `Dear ${currentInvoice.customerName || 'Customer'},\n\nYour invoice ${currentInvoice.invoiceNumber} for ${formatCurrency(currentInvoice.grandTotal)} is ${currentInvoice.status}.\nDue date: ${formatDate(currentInvoice.dueDate)}.\n\nPlease make the payment at your earliest convenience.`;
      const ta = document.getElementById('reminder-text');
      if (ta) ta.value = text;
    });
  }

  const copyBtn = document.getElementById('copy-reminder-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const ta = document.getElementById('reminder-text');
      if (ta) {
        navigator.clipboard.writeText(ta.value);
        if(typeof showToast === 'function') showToast('Copied to clipboard', 'success');
      }
    });
  }
}
