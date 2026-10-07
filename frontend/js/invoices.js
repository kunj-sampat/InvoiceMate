// js/invoices.js

let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
  loadInvoices();

  const searchInput = document.getElementById('invoice-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadInvoices();
      }, 300);
    });
  }

  const applyFiltersBtn = document.getElementById('apply-filters');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', loadInvoices);
  }
});

async function loadInvoices() {
  const search = document.getElementById('invoice-search')?.value || '';
  const status = document.getElementById('status-filter')?.value || '';
  const dateFrom = document.getElementById('date-from')?.value || '';
  const dateTo = document.getElementById('date-to')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (dateFrom) params.append('from', dateFrom);
  if (dateTo) params.append('to', dateTo);

  try {
    const data = await apiRequest('GET', `/api/invoices?${params.toString()}`);
    const tbody = document.getElementById('invoices-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoices found.</td></tr>';
      return;
    }

    data.forEach(inv => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="invoice-detail.html?id=${inv.id}">${inv.invoiceNumber}</a></td>
        <td>${inv.customerName || 'N/A'}</td>
        <td>${formatDate(inv.invoiceDate)}</td>
        <td>${formatDate(inv.dueDate)}</td>
        <td>${formatCurrency(inv.grandTotal)}</td>
        <td><span class="badge ${getStatusBadgeClass(inv.status)}">${inv.status}</span></td>
        <td>
          <a href="invoice-detail.html?id=${inv.id}" class="btn btn-sm btn-secondary">View</a>
          <button onclick="quickWhatsApp('${inv.id}')" class="btn btn-sm" style="background:#25d366;color:#ffffff;border:none;" title="Send on WhatsApp">&#128172; WhatsApp</button>
          <button onclick="duplicateInvoice('${inv.id}')" class="btn btn-sm btn-secondary">Duplicate</button>
          <button onclick="deleteInvoice('${inv.id}')" class="btn btn-sm btn-danger">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    if(typeof showToast === 'function') showToast('Failed to load invoices', 'error');
  }
}

async function quickWhatsApp(id) {
  try {
    const inv = await apiRequest('GET', `/api/invoices/${id}`);
    if (inv && typeof shareOnWhatsApp === 'function') {
      const type = (inv.status === 'PENDING' || inv.status === 'OVERDUE') ? 'reminder' : (inv.estimate ? 'estimate' : 'invoice');
      shareOnWhatsApp(inv, type);
    }
  } catch(e) {
    if (typeof showToast === 'function') showToast('Failed to open WhatsApp', 'error');
  }
}
window.quickWhatsApp = quickWhatsApp;

async function duplicateInvoice(id) {
  try {
    const data = await apiRequest('POST', `/api/invoices/${id}/duplicate`);
    if(typeof showToast === 'function') showToast('Invoice duplicated', 'success');
    loadInvoices();
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}

async function deleteInvoice(id) {
  if (!confirm('Delete this invoice?')) return;
  try {
    await apiRequest('DELETE', `/api/invoices/${id}`);
    if(typeof showToast === 'function') showToast('Invoice deleted', 'success');
    loadInvoices();
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}
