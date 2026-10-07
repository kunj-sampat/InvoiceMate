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
      if (freq === 'WEEKLY') mrr += g * 4.33;
      else if (freq === 'QUARTERLY') mrr += g / 3.0;
      else if (freq === 'YEARLY') mrr += g / 12.0;
      else mrr += g; // Monthly
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
      <td style="font-weight: 800; color: var(--color-text);">
        ${formatCurrency(r.grandTotal)}
      </td>
      <td>
        <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">
          ${isActive ? 'Active' : 'Paused'}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px; align-items:center;">
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

function openRecurringModal() {
  document.getElementById('rec-profile-name').value = '';
  document.getElementById('rec-item-name').value = '';
  document.getElementById('rec-item-price').value = '';
  document.getElementById('rec-notes').value = '';
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
  const itemName = document.getElementById('rec-item-name')?.value.trim();
  const itemPrice = Number(document.getElementById('rec-item-price')?.value);
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
  if (!itemName || isNaN(itemPrice) || itemPrice <= 0) {
    if (typeof showToast === 'function') showToast('Please enter a valid service description and rate', 'warning');
    return;
  }

  const payload = {
    customerId: Number(customerId),
    profileName,
    frequency,
    startDate: startDate || new Date().toISOString().split('T')[0],
    template,
    discountPercent: 0,
    gstPercent,
    notes,
    items: [
      {
        name: itemName,
        quantity: 1,
        price: itemPrice
      }
    ]
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
  if (!confirm('Issue invoice for this recurring profile immediately?')) return;
  try {
    const inv = await apiRequest('POST', `/api/recurring/${id}/generate`);
    if (typeof showToast === 'function') showToast(`Invoice #${inv.invoiceNumber} created successfully!`, 'success');
    loadRecurring();
  } catch (e) {
    if (typeof showToast === 'function') showToast(e.message || 'Generation failed', 'error');
  }
}

async function deleteRecurring(id) {
  if (!confirm('Are you sure you want to delete this recurring profile?')) return;
  try {
    await apiRequest('DELETE', `/api/recurring/${id}`);
    if (typeof showToast === 'function') showToast('Recurring profile deleted', 'success');
    loadRecurring();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to delete profile', 'error');
  }
}

window.toggleStatus = toggleStatus;
window.generateNow = generateNow;
window.deleteRecurring = deleteRecurring;
