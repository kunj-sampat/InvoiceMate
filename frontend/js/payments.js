// js/payments.js

let _allPayments = [];
let _selectedInvoice = null;

document.addEventListener('DOMContentLoaded', () => {
  loadPayments();

  // Set default date to today
  const dateInput = document.getElementById('pm-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Filter bar wiring
  document.getElementById('apply-filters').addEventListener('click', applyFilters);
  document.getElementById('payment-search').addEventListener('input', applyFilters);
});

// ─── Load & Render Payments ───────────────────────────────────────────────────

async function loadPayments() {
  try {
    const data = await apiRequest('GET', '/api/payments');
    _allPayments = data || [];
    renderPayments(_allPayments);
  } catch (error) {
    if (typeof showToast === 'function') showToast('Failed to load payment records.', 'error');
  }
}

function renderPayments(payments) {
  const tbody = document.getElementById('payments-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!payments || payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color:#94a3b8;">No payment records found.</td></tr>';
    return;
  }

  payments.forEach(p => {
    const isFullyPaid = p.invoiceStatus === 'PAID' ||
      (p.grandTotal && p.amountPaid && Number(p.amountPaid) >= Number(p.grandTotal));

    const paidBadge = isFullyPaid
      ? '<span style="display:inline-block; margin-left:8px; background:#dcfce7; color:#166534; border-radius:4px; padding:1px 8px; font-size:11px; font-weight:600; vertical-align:middle;">Paid in Full</span>'
      : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(p.paymentDate)}</td>
      <td>
        <a href="invoice-detail.html?id=${p.invoiceId}">${p.invoiceNumber || p.invoiceId}</a>
        ${paidBadge}
      </td>
      <td>${p.customerName || 'N/A'}</td>
      <td style="text-align:right;">${formatCurrency(p.amount)}</td>
      <td>${formatMethod(p.paymentMethod)}</td>
      <td>${p.notes || '<span style="color:#94a3b8;">—</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function formatMethod(method) {
  const map = {
    BANK_TRANSFER: 'Bank Transfer',
    UPI: 'UPI',
    CASH: 'Cash',
    CARD: 'Card',
    CHEQUE: 'Cheque',
    OTHER: 'Other'
  };
  return map[method] || method || '—';
}

// ─── Filters ─────────────────────────────────────────────────────────────────

function applyFilters() {
  const search = (document.getElementById('payment-search').value || '').toLowerCase().trim();
  const from   = document.getElementById('date-from').value;
  const to     = document.getElementById('date-to').value;

  const filtered = _allPayments.filter(p => {
    const matchSearch = !search ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search)) ||
      (p.customerName  && p.customerName.toLowerCase().includes(search));

    const payDate = p.paymentDate ? p.paymentDate.substring(0, 10) : '';
    const matchFrom = !from || payDate >= from;
    const matchTo   = !to   || payDate <= to;

    return matchSearch && matchFrom && matchTo;
  });

  renderPayments(filtered);
}

// ─── Modal Open / Close ───────────────────────────────────────────────────────

async function openPaymentModal() {
  _selectedInvoice = null;
  resetModal();
  document.getElementById('payment-modal-overlay').classList.add('active');

  // Set default date
  const dateInput = document.getElementById('pm-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  await loadInvoicesForDropdown();
}

function closePaymentModal() {
  document.getElementById('payment-modal-overlay').classList.remove('active');
  _selectedInvoice = null;
}

function resetModal() {
  document.getElementById('pm-invoice').value = '';
  document.getElementById('pm-amount').value = '';
  document.getElementById('pm-amount').disabled = false;
  document.getElementById('pm-notes').value = '';
  document.getElementById('pm-method').value = 'BANK_TRANSFER';
  document.getElementById('pm-invoice-summary').style.display = 'none';
  document.getElementById('fully-paid-banner').style.display = 'none';
  document.getElementById('pm-submit-btn').disabled = false;
}

// ─── Invoice Dropdown ─────────────────────────────────────────────────────────

async function loadInvoicesForDropdown() {
  const select = document.getElementById('pm-invoice');
  select.innerHTML = '<option value="">Loading invoices...</option>';

  try {
    const invoices = await apiRequest('GET', '/api/invoices');
    select.innerHTML = '<option value="">-- Select an invoice --</option>';

    if (!invoices || invoices.length === 0) {
      select.innerHTML = '<option value="">No invoices available</option>';
      return;
    }

    invoices.forEach(inv => {
      const isPaid = inv.status === 'PAID' ||
        (inv.grandTotal && inv.amountPaid && Number(inv.amountPaid) >= Number(inv.grandTotal));
      const label = `${inv.invoiceNumber || inv.id} — ${inv.customerName || 'Unknown'}${isPaid ? ' (Paid in Full)' : ''}`;
      const option = document.createElement('option');
      option.value = inv.id;
      option.textContent = label;
      option.dataset.invoice = JSON.stringify(inv);
      select.appendChild(option);
    });
  } catch (err) {
    select.innerHTML = '<option value="">Failed to load invoices</option>';
  }
}

// ─── Invoice Selected Handler ─────────────────────────────────────────────────

function onInvoiceSelected() {
  const select = document.getElementById('pm-invoice');
  const selectedOption = select.options[select.selectedIndex];

  document.getElementById('pm-invoice-summary').style.display = 'none';
  document.getElementById('fully-paid-banner').style.display = 'none';
  document.getElementById('pm-amount').disabled = false;
  document.getElementById('pm-submit-btn').disabled = false;
  document.getElementById('pm-amount').value = '';
  _selectedInvoice = null;

  if (!selectedOption || !selectedOption.dataset.invoice) return;

  let inv;
  try { inv = JSON.parse(selectedOption.dataset.invoice); } catch (e) { return; }
  _selectedInvoice = inv;

  const grandTotal  = Number(inv.grandTotal  || 0);
  const amountPaid  = Number(inv.amountPaid  || 0);
  const balanceDue  = grandTotal - amountPaid;

  // Show summary panel
  document.getElementById('pm-grand-total').textContent = formatCurrency(grandTotal);
  document.getElementById('pm-amount-paid').textContent = formatCurrency(amountPaid);
  document.getElementById('pm-balance-due').textContent = formatCurrency(Math.max(balanceDue, 0));
  document.getElementById('pm-invoice-summary').style.display = 'block';

  if (amountPaid >= grandTotal && grandTotal > 0) {
    // Invoice fully paid — block further payment
    document.getElementById('fully-paid-banner').style.display = 'block';
    document.getElementById('pm-amount').value = '';
    document.getElementById('pm-amount').disabled = true;
    document.getElementById('pm-submit-btn').disabled = true;
  } else {
    // Pre-fill with remaining balance
    document.getElementById('pm-amount').value = balanceDue > 0 ? balanceDue.toFixed(2) : '';
  }
}

// ─── Submit Payment ───────────────────────────────────────────────────────────

async function submitPayment() {
  const invoiceId = document.getElementById('pm-invoice').value;
  const amount    = Number(document.getElementById('pm-amount').value);
  const method    = document.getElementById('pm-method').value;
  const date      = document.getElementById('pm-date').value;
  const notes     = document.getElementById('pm-notes').value.trim();

  if (!invoiceId) {
    showToast('Please select an invoice.', 'error'); return;
  }
  if (!amount || amount <= 0) {
    showToast('Please enter a valid payment amount.', 'error'); return;
  }
  if (!date) {
    showToast('Please select a payment date.', 'error'); return;
  }

  // Guard: double-check fully paid status
  if (_selectedInvoice) {
    const grandTotal = Number(_selectedInvoice.grandTotal || 0);
    const amountPaid = Number(_selectedInvoice.amountPaid || 0);
    if (amountPaid >= grandTotal && grandTotal > 0) {
      showToast('This invoice has already been settled in full.', 'error');
      return;
    }
  }

  const submitBtn = document.getElementById('pm-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    await apiRequest('POST', `/api/invoices/${invoiceId}/payments`, {
      amount,
      paymentMethod: method,
      paymentDate: date,
      notes: notes || null
    });

    showToast('Payment recorded successfully.', 'success');
    closePaymentModal();
    loadPayments();
  } catch (err) {
    showToast('Failed to record payment. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Record Payment';
  }
}
