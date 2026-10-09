// js/recurring.js — Recurring Invoices & Retainers

let recurringList = [];
let customersList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadCustomers();
  await loadRecurring();

  document.getElementById('add-recurring-btn')?.addEventListener('click', openRecurringModal);
  document.getElementById('cancel-recurring-btn')?.addEventListener('click', closeRecurringModal);
  document.getElementById('close-recurring-modal')?.addEventListener('click', closeRecurringModal);
  document.getElementById('save-recurring-btn')?.addEventListener('click', saveRecurringSchedule);
  document.getElementById('rec-add-item-btn')?.addEventListener('click', () => addRecurringItemRow());

  document.getElementById('rec-gst-rate')?.addEventListener('change', recalculateCycleTotals);
  document.getElementById('rec-discount')?.addEventListener('input', recalculateCycleTotals);

  // Default start date to today
  const startInput = document.getElementById('rec-start-date');
  if (startInput) startInput.value = new Date().toISOString().split('T')[0];
});

async function loadCustomers() {
  try {
    const data = await apiRequest('GET', '/api/customers');
    customersList = Array.isArray(data) ? data : [];
    const select = document.getElementById('rec-cust-select');
    if (select) {
      customersList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    }
  } catch (e) {}
}

async function loadRecurring() {
  try {
    const data = await apiRequest('GET', '/api/recurring');
    recurringList = Array.isArray(data) ? data : [];
    renderRecurringTable();
    updateRecurringSummary();
  } catch (error) {
    if (typeof showToast === 'function') showToast('Failed to load recurring invoices', 'error');
  }
}

function updateRecurringSummary() {
  const total = recurringList.length;
  const active = recurringList.filter(r => (r.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;

  let mrr = 0.0;
  recurringList.forEach(r => {
    if ((r.status || 'ACTIVE').toUpperCase() === 'ACTIVE') {
      const g = Number(r.grandTotal || 0);
      const freq = (r.frequency || 'MONTHLY').toUpperCase();
      if (freq === 'DAILY') mrr += g * 30.0;
      else if (freq === 'WEEKLY') mrr += g * 4.33;
      else if (freq === 'QUARTERLY') mrr += g / 3.0;
      else if (freq === 'YEARLY') mrr += g / 12.0;
      else mrr += g; // Monthly default
    }
  });

  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dueThisMonth = recurringList.filter(r => (r.nextIssueDate || '').startsWith(thisMonthStr)).length;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('rec-active-count', active);
  setEl('rec-mrr-val', formatCurrency(mrr));
  setEl('rec-due-month', dueThisMonth);
  setEl('rec-total-count', total);
}

function renderRecurringTable() {
  const tbody = document.getElementById('recurring-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (recurringList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 48px; color: var(--color-text-tertiary);">
          No recurring invoices set up yet. Click <strong>+ New Recurring Schedule</strong> to create your first retainer.
        </td>
      </tr>
    `;
    return;
  }

  recurringList.forEach(r => {
    const isActive = (r.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: var(--color-text); font-size: 14px;">${r.profileName}</div>
        <div style="font-size: 12.5px; color: var(--color-text-secondary); margin-top: 2px;">${r.customerName}</div>
      </td>
      <td>
        <span class="badge badge-secondary" style="font-weight:700;">${r.frequency || 'MONTHLY'}</span>
      </td>
      <td>
        <div style="font-weight: 600;">${formatDate(r.nextIssueDate)}</div>
      </td>
      <td>
        <div style="color: var(--color-text-secondary);">${r.lastIssuedDate ? formatDate(r.lastIssuedDate) : '&mdash; Never'}</div>
      </td>
      <td style="font-weight: 800; color: var(--color-text); text-align: right;">
        ${formatCurrency(r.grandTotal)}
      </td>
      <td style="text-align: center;">
        <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">
          ${isActive ? 'Active' : 'Paused'}
        </span>
      </td>
      <td style="text-align: center;">
        <div style="display:flex; gap:6px; align-items:center; justify-content: center;">
          <button class="btn btn-sm btn-primary" onclick="generateNow(${r.id})" title="Generate real invoice now">&#9889; Issue Now</button>
          <button class="btn btn-sm btn-secondary" onclick="toggleStatus(${r.id})">
            ${isActive ? 'Pause' : 'Resume'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteRecurring(${r.id})">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function addRecurringItemRow(name = '', qty = 1, price = '') {
  const container = document.getElementById('rec-items-list');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'rec-item-row';
  row.style.cssText = 'display: flex; gap: 8px; align-items: center;';

  row.innerHTML = `
    <input type="text" class="rec-item-desc" placeholder="Service description / product..." value="${escapeHtml(name)}" style="flex: 3; padding: 7px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 8px;" required>
    <input type="number" class="rec-item-qty" min="1" step="1" value="${qty}" placeholder="Qty" style="width: 65px; padding: 7px 8px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;" required>
    <input type="number" class="rec-item-rate" min="0" step="0.01" value="${price}" placeholder="Rate (₹)" style="width: 110px; padding: 7px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: right;" required>
    <span class="rec-item-row-total" style="width: 85px; text-align: right; font-weight: 700; color: #1e293b; font-size: 13px;">&#8377;0.00</span>
    <button type="button" class="rec-remove-item" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; font-size: 16px; line-height: 1; border-radius: 6px;" title="Remove Item">&times;</button>
  `;

  const descInput = row.querySelector('.rec-item-desc');
  const qtyInput = row.querySelector('.rec-item-qty');
  const rateInput = row.querySelector('.rec-item-rate');
  const totalSpan = row.querySelector('.rec-item-row-total');
  const removeBtn = row.querySelector('.rec-remove-item');

  function updateRowTotal() {
    const q = Math.max(1, Number(qtyInput.value) || 1);
    const p = Math.max(0, Number(rateInput.value) || 0);
    const lineTotal = q * p;
    totalSpan.textContent = formatCurrency(lineTotal);
    recalculateCycleTotals();
  }

  qtyInput.addEventListener('input', updateRowTotal);
  rateInput.addEventListener('input', updateRowTotal);

  removeBtn.addEventListener('click', () => {
    const allRows = container.querySelectorAll('.rec-item-row');
    if (allRows.length <= 1) {
      if (typeof showToast === 'function') showToast('At least one item is required', 'warning');
      return;
    }
    row.remove();
    recalculateCycleTotals();
  });

  container.appendChild(row);
  updateRowTotal();
}

function recalculateCycleTotals() {
  const container = document.getElementById('rec-items-list');
  if (!container) return;

  const rows = container.querySelectorAll('.rec-item-row');
  let subtotal = 0.0;

  rows.forEach(row => {
    const q = Math.max(1, Number(row.querySelector('.rec-item-qty')?.value) || 1);
    const p = Math.max(0, Number(row.querySelector('.rec-item-rate')?.value) || 0);
    subtotal += q * p;
  });

  const discountPercent = Math.max(0, Math.min(100, Number(document.getElementById('rec-discount')?.value) || 0));
  const gstPercent = Number(document.getElementById('rec-gst-rate')?.value) || 0;

  const discountAmt = subtotal * (discountPercent / 100.0);
  const taxable = Math.max(0, subtotal - discountAmt);
  const gstAmt = taxable * (gstPercent / 100.0);
  const grandTotal = taxable + gstAmt;

  const subtotalDisp = document.getElementById('rec-subtotal-disp');
  const discountDisp = document.getElementById('rec-discount-disp');
  const grandTotalDisp = document.getElementById('rec-cycle-total-display');

  if (subtotalDisp) subtotalDisp.textContent = `Subtotal: ${formatCurrency(subtotal)}`;
  if (discountDisp) {
    discountDisp.textContent = discountPercent > 0 ? `(-${discountPercent}% : -${formatCurrency(discountAmt)})` : '';
  }
  if (grandTotalDisp) {
    grandTotalDisp.textContent = `Cycle Total: ${formatCurrency(grandTotal)}`;
  }
}

function openRecurringModal() {
  document.getElementById('rec-profile-name').value = '';
  document.getElementById('rec-notes').value = '';
  document.getElementById('rec-discount').value = '0';
  document.getElementById('rec-gst-rate').value = '18';
  document.getElementById('rec-frequency').value = 'MONTHLY';

  const container = document.getElementById('rec-items-list');
  if (container) {
    container.innerHTML = '';
    // Start with 1 default item row
    addRecurringItemRow('', 1, '');
  }

  const modal = document.getElementById('recurring-modal');
  if (modal) modal.style.display = 'flex';
}

function closeRecurringModal() {
  const modal = document.getElementById('recurring-modal');
  if (modal) modal.style.display = 'none';
}

async function saveRecurringSchedule() {
  const customerId = document.getElementById('rec-cust-select')?.value;
  const profileName = document.getElementById('rec-profile-name')?.value.trim();
  const frequency = document.getElementById('rec-frequency')?.value || 'MONTHLY';
  const startDate = document.getElementById('rec-start-date')?.value;
  const discountPercent = Number(document.getElementById('rec-discount')?.value) || 0;
  const gstPercent = Number(document.getElementById('rec-gst-rate')?.value) || 0;
  const template = document.getElementById('rec-template')?.value || 'modern';
  const notes = document.getElementById('rec-notes')?.value.trim();

  if (!customerId) {
    if (typeof showToast === 'function') showToast('Please choose a customer', 'warning');
    return;
  }
  if (!profileName) {
    if (typeof showToast === 'function') showToast('Please enter a schedule title', 'warning');
    return;
  }

  // Collect line items
  const container = document.getElementById('rec-items-list');
  const rows = container?.querySelectorAll('.rec-item-row') || [];
  const items = [];

  for (const row of rows) {
    const desc = row.querySelector('.rec-item-desc')?.value.trim();
    const qty = Number(row.querySelector('.rec-item-qty')?.value) || 1;
    const rate = Number(row.querySelector('.rec-item-rate')?.value);

    if (!desc) {
      if (typeof showToast === 'function') showToast('Please provide a description for all items', 'warning');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      if (typeof showToast === 'function') showToast('Please provide a valid rate for all items', 'warning');
      return;
    }

    items.push({
      name: desc,
      quantity: qty,
      price: rate
    });
  }

  if (items.length === 0) {
    if (typeof showToast === 'function') showToast('Please add at least one line item', 'warning');
    return;
  }

  const payload = {
    customerId: Number(customerId),
    profileName,
    frequency,
    startDate: startDate || new Date().toISOString().split('T')[0],
    template,
    discountPercent,
    gstPercent,
    notes,
    items
  };

  try {
    await apiRequest('POST', '/api/recurring', payload);
    if (typeof showToast === 'function') showToast('Recurring billing profile activated!', 'success');
    closeRecurringModal();
    loadRecurring();
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'Failed to save recurring profile', 'error');
  }
}

async function toggleStatus(id) {
  try {
    await apiRequest('PATCH', `/api/recurring/${id}/toggle`);
    if (typeof showToast === 'function') showToast('Recurring status updated', 'success');
    loadRecurring();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to update status', 'error');
  }
}

async function generateNow(id) {
  const ok = await showConfirmDialog({
    title: 'Generate Invoice Now?',
    message: 'Issue an immediate billing invoice for this recurring profile schedule?',
    confirmText: 'Generate Invoice',
    cancelText: 'Cancel',
    isDanger: false
  });
  if (!ok) return;
  try {
    const inv = await apiRequest('POST', `/api/recurring/${id}/generate`);
    if (typeof showToast === 'function') showToast(`Invoice #${inv.invoiceNumber} created successfully!`, 'success');
    loadRecurring();
  } catch (e) {
    if (typeof showToast === 'function') showToast(e.message || 'Generation failed', 'error');
  }
}

async function deleteRecurring(id) {
  const ok = await showConfirmDialog({
    title: 'Delete Recurring Schedule?',
    message: 'Are you sure you want to delete this recurring automation profile? Future scheduled invoices will not be generated.',
    confirmText: 'Delete Schedule',
    isDanger: true
  });
  if (!ok) return;
  try {
    await apiRequest('DELETE', `/api/recurring/${id}`);
    if (typeof showToast === 'function') showToast('Recurring profile deleted', 'success');
    loadRecurring();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to delete profile', 'error');
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

window.toggleStatus = toggleStatus;
window.generateNow = generateNow;
window.deleteRecurring = deleteRecurring;
