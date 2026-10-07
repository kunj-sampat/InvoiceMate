// js/estimates.js
// Estimates page — lists invoices that have isEstimate flag
// Estimates are stored using the same invoice API with ?isEstimate=true filter

document.addEventListener('DOMContentLoaded', () => {
  loadEstimates();

  const searchInput = document.getElementById('estimate-search');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(loadEstimates, 300);
    });
  }

  const applyBtn = document.getElementById('apply-estimate-filters');
  if (applyBtn) applyBtn.addEventListener('click', loadEstimates);
});

async function loadEstimates() {
  const search = document.getElementById('estimate-search')?.value || '';
  const status = document.getElementById('estimate-status-filter')?.value || '';

  const params = new URLSearchParams({ isEstimate: 'true' });
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  try {
    const data = await apiRequest('GET', `/api/invoices?${params.toString()}`);
    const tbody = document.getElementById('estimates-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding:48px; color:var(--color-text-tertiary);">
          No estimates yet. Create your first estimate.
        </td></tr>`;
      updateSummary([]);
      return;
    }

    data.forEach(est => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="invoice-detail.html?id=${est.id}" style="font-weight:500;">${est.invoiceNumber}</a></td>
        <td>${est.customerName || 'N/A'}</td>
        <td>${formatDate(est.invoiceDate)}</td>
        <td>${formatDate(est.dueDate)}</td>
        <td style="font-weight:600;">${formatCurrency(est.grandTotal)}</td>
        <td><span class="badge ${getEstimateBadgeClass(est.status)}">${est.status || 'DRAFT'}</span></td>
        <td>
          <div class="action-links">
            <a href="invoice-detail.html?id=${est.id}">View</a>
            <button onclick="convertToInvoice('${est.id}')" style="color:var(--color-success); background:none; border:none; font-size:13px; cursor:pointer; font-weight:500;">Convert</button>
            <button onclick="deleteEstimate('${est.id}')" style="color:var(--color-danger); background:none; border:none; font-size:13px; cursor:pointer; font-weight:500;">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    updateSummary(data);

  } catch (error) {
    if (typeof showToast === 'function') showToast('Failed to load estimates', 'error');
  }
}

function getEstimateBadgeClass(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ACCEPTED') return 'badge-success';
  if (s === 'DECLINED') return 'badge-danger';
  if (s === 'SENT')     return 'badge-info';
  return 'badge-secondary'; // DRAFT
}

function updateSummary(estimates) {
  const total = estimates.length;
  const accepted = estimates.filter(e => (e.status || '').toUpperCase() === 'ACCEPTED').length;
  const pending  = estimates.filter(e => (e.status || '').toUpperCase() !== 'ACCEPTED' && (e.status || '').toUpperCase() !== 'DECLINED').length;
  const totalValue = estimates.reduce((sum, e) => sum + (e.grandTotal || 0), 0);

  const el = id => document.getElementById(id);
  if (el('est-total-count'))   el('est-total-count').textContent   = total;
  if (el('est-accepted-count')) el('est-accepted-count').textContent = accepted;
  if (el('est-pending-count')) el('est-pending-count').textContent  = pending;
  if (el('est-total-value'))   el('est-total-value').textContent    = formatCurrency(totalValue);
}

async function convertToInvoice(id) {
  if (!confirm('Convert this estimate to an invoice?')) return;
  try {
    // Duplicate the estimate as a regular invoice by posting to duplicate and then updating
    const est = await apiRequest('GET', `/api/invoices/${id}`);
    if (!est) return;

    // Create a new invoice with the same data but isEstimate: false
    const payload = {
      customerId: est.customerId,
      invoiceDate: est.invoiceDate,
      dueDate: est.dueDate,
      items: est.items.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, price: i.price })),
      discountPercent: est.discountPercent,
      gstPercent: est.gstPercent,
      template: est.template || 'modern',
      notes: est.notes,
      isDraft: false,
      isEstimate: false
    };

    const newInvoice = await apiRequest('POST', '/api/invoices', payload);
    if (newInvoice && newInvoice.id) {
      if (typeof showToast === 'function') showToast('Converted to invoice successfully!', 'success');
      setTimeout(() => { window.location.href = `invoice-detail.html?id=${newInvoice.id}`; }, 1200);
    }
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'Conversion failed', 'error');
  }
}

async function deleteEstimate(id) {
  if (!confirm('Delete this estimate?')) return;
  try {
    await apiRequest('DELETE', `/api/invoices/${id}`);
    if (typeof showToast === 'function') showToast('Estimate deleted', 'success');
    loadEstimates();
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message, 'error');
  }
}
