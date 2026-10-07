// customer-statement.js

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  loadCustomers();

  // Check if customerId in URL param
  const params = new URLSearchParams(window.location.search);
  const cid = params.get('customerId');
  if (cid) {
    // Will be selected after customers load
    window._preselectedCustomer = cid;
  }
});

function setDefaultDates() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toISO = d => d.toISOString().split('T')[0];
  document.getElementById('from-date').value = toISO(firstOfMonth);
  document.getElementById('to-date').value   = toISO(today);
}

async function loadCustomers() {
  try {
    const customers = await apiRequest('GET', '/api/customers');
    if (!customers) return;
    const select = document.getElementById('customer-select');
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    // Pre-select if URL param
    if (window._preselectedCustomer) {
      select.value = window._preselectedCustomer;
      loadStatement();
    }
  } catch (e) {
    showToast('Failed to load customers', 'error');
  }
}

async function loadStatement() {
  const customerId = document.getElementById('customer-select').value;
  const from = document.getElementById('from-date').value;
  const to   = document.getElementById('to-date').value;

  if (!customerId) {
    showToast('Please select a customer', 'error');
    return;
  }

  try {
    const stmt = await apiRequest('GET', `/api/customers/${customerId}/statement?from=${from}&to=${to}`);
    if (!stmt) return;
    renderStatement(stmt);
  } catch (e) {
    showToast(e.message || 'Failed to load statement', 'error');
  }
}

let currentStatement = null;

function renderStatement(stmt) {
  currentStatement = stmt;
  document.getElementById('statement-empty').style.display  = 'none';
  document.getElementById('statement-output').style.display = 'block';

  const fmt = n => {
    if (n === null || n === undefined) return '-';
    return '\u20B9' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDate = s => {
    if (!s) return '-';
    return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Header
  document.getElementById('stmt-customer-name').textContent    = stmt.customerName || '';
  document.getElementById('stmt-customer-email').textContent   = stmt.customerEmail || '';
  document.getElementById('stmt-customer-phone').textContent   = stmt.customerPhone || '';
  document.getElementById('stmt-customer-address').textContent = stmt.customerAddress || '';
  document.getElementById('stmt-period').textContent = `Period: ${fmtDate(stmt.fromDate)} to ${fmtDate(stmt.toDate)}`;
  document.getElementById('stmt-generated').textContent = `Generated: ${new Date().toLocaleString('en-IN')}`;

  // Summary
  document.getElementById('stmt-total-invoiced').textContent = fmt(stmt.totalInvoiced);
  document.getElementById('stmt-total-paid').textContent     = fmt(stmt.totalPaid);
  document.getElementById('stmt-balance-due').textContent    = fmt(stmt.balanceDue);

  const entries = stmt.entries || [];
  document.getElementById('stmt-entry-count').textContent = `${entries.length} transaction${entries.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('statement-body');
  tbody.innerHTML = '';

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--color-text-tertiary);">No transactions found for this period.</td></tr>';
    return;
  }

  entries.forEach(e => {
    const tr = document.createElement('tr');
    tr.className = e.type === 'INVOICE' ? 'entry-invoice' : 'entry-payment';

    const balClass = e.balance > 0 ? 'balance-positive' : e.balance < 0 ? 'balance-negative' : 'balance-zero';

    tr.innerHTML = `
      <td>${fmtDate(e.date)}</td>
      <td>
        <span class="entry-type-badge ${e.type === 'INVOICE' ? 'invoice' : 'payment'}">
          ${e.type === 'INVOICE' ? 'Invoice' : 'Payment'}
        </span>
      </td>
      <td style="font-weight:600;">${e.reference || '-'}</td>
      <td style="color:var(--color-text-secondary);">${e.description || '-'}</td>
      <td style="text-align:right;color:var(--color-danger);font-weight:500;">${e.debit !== null ? fmt(e.debit) : '-'}</td>
      <td style="text-align:right;color:var(--color-success);font-weight:500;">${e.credit !== null ? fmt(e.credit) : '-'}</td>
      <td style="text-align:right;" class="${balClass}">${fmt(e.balance)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function shareStatementWhatsApp() {
  if (!currentStatement) {
    if (typeof showToast === 'function') showToast('Please generate a statement first', 'warning');
    return;
  }
  if (typeof shareOnWhatsApp === 'function') {
    shareOnWhatsApp({
      customerName: currentStatement.customerName,
      customerPhone: currentStatement.customerPhone,
      totalInvoiced: currentStatement.totalInvoiced,
      totalPaid: currentStatement.totalPaid,
      balanceDue: currentStatement.balanceDue
    }, 'statement');
  }
}

window.loadStatement = loadStatement;
window.shareStatementWhatsApp = shareStatementWhatsApp;
