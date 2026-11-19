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
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        loadInvoices();
      }
    });
  }

  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', loadInvoices);
  }

  const dateFrom = document.getElementById('date-from');
  if (dateFrom) {
    dateFrom.addEventListener('change', loadInvoices);
  }

  const dateTo = document.getElementById('date-to');
  if (dateTo) {
    dateTo.addEventListener('change', loadInvoices);
  }

  const applyFiltersBtn = document.getElementById('apply-filters');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadInvoices();
    });
  }

  const resetFiltersBtn = document.getElementById('reset-filters');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      if (dateFrom) dateFrom.value = '';
      if (dateTo) dateTo.value = '';
      loadInvoices();
    });
  }

  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportInvoicesToCSV);
  }
});

let currentLoadedInvoices = [];

function exportInvoicesToCSV() {
  if (!currentLoadedInvoices || currentLoadedInvoices.length === 0) {
    if (typeof showToast === 'function') showToast('No invoices to export', 'warning');
    return;
  }
  const headers = ['Invoice #', 'Customer', 'Date', 'Due Date', 'Amount (INR)', 'Status'];
  const rows = currentLoadedInvoices.map(inv => [
    `"${inv.invoiceNumber || inv.id}"`,
    `"${(inv.customerName || '').replace(/"/g, '""')}"`,
    `"${inv.invoiceDate || ''}"`,
    `"${inv.dueDate || ''}"`,
    (inv.grandTotal || 0).toFixed(2),
    `"${inv.status || 'PENDING'}"`
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `InvoiceMate_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof showToast === 'function') showToast('Invoices exported successfully!', 'success');
}

async function loadInvoices() {
  const search = document.getElementById('invoice-search')?.value.trim() || '';
  const status = document.getElementById('status-filter')?.value || '';
  const dateFrom = document.getElementById('date-from')?.value || '';
  const dateTo = document.getElementById('date-to')?.value || '';

  const params = new URLSearchParams({ isEstimate: 'false' });
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (dateFrom) params.append('from', dateFrom);
  if (dateTo) params.append('to', dateTo);

  const tbody = document.getElementById('invoices-body');
  // Show skeleton rows immediately while loading
  if (tbody && !search && !status && !dateFrom && !dateTo) {
    tbody.innerHTML = Array(5).fill(0).map(() => `
      <tr>
        <td><span class="skeleton skeleton-text" style="width:70px"></span></td>
        <td><span class="skeleton skeleton-text" style="width:110px"></span></td>
        <td><span class="skeleton skeleton-text" style="width:70px"></span></td>
        <td><span class="skeleton skeleton-text" style="width:70px"></span></td>
        <td><span class="skeleton skeleton-text" style="width:60px;float:right"></span></td>
        <td style="text-align:center"><span class="skeleton skeleton-text" style="width:60px;margin:0 auto;display:block"></span></td>
        <td></td>
      </tr>
    `).join('');
  }

  try {
    const data = await apiRequest('GET', `/api/invoices?${params.toString()}`);
    currentLoadedInvoices = data || [];
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:#94a3b8;">No invoices found.</td></tr>';
      return;
    }

    data.forEach(inv => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="invoice-detail.html?id=${inv.id}">${inv.invoiceNumber}</a></td>
        <td>${inv.customerName || 'N/A'}</td>
        <td>${formatDate(inv.invoiceDate)}</td>
        <td>${formatDate(inv.dueDate)}</td>
        <td style="text-align:right">${formatCurrency(inv.grandTotal)}</td>
        <td style="text-align:center"><span class="badge ${getStatusBadgeClass(inv.status)}">${inv.status}</span></td>
        <td>
          <a href="invoice-detail.html?id=${inv.id}" class="btn btn-sm btn-secondary">View</a>
          <button onclick="copyPublicLink('${inv.shareToken || inv.id}')" class="btn btn-sm btn-secondary" title="Copy client share link">Link</button>
          <button onclick="quickWhatsApp('${inv.id}')" class="btn btn-sm" style="background:#25d366;color:#ffffff;border:none;" title="Send on WhatsApp">WhatsApp</button>
          <button onclick="duplicateInvoice('${inv.id}')" class="btn btn-sm btn-secondary">Duplicate</button>
          <button onclick="deleteInvoice('${inv.id}')" class="btn btn-sm btn-danger">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    if(typeof showToast === 'function') showToast('Failed to load invoices', 'error');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:#94a3b8;">Failed to load invoices. Please check your connection.</td></tr>';
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
  const ok = await showConfirmDialog({
    title: 'Delete Invoice?',
    message: 'Are you sure you want to permanently delete this invoice? This action cannot be undone.',
    confirmText: 'Delete Invoice',
    isDanger: true
  });
  if (!ok) return;
  try {
    await apiRequest('DELETE', `/api/invoices/${id}`);
    if(typeof showToast === 'function') showToast('Invoice deleted', 'success');
    loadInvoices();
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}

window.copyPublicLink = function(token) {
  if (!token) return;
  const url = `${window.location.origin}/pay.html?token=${encodeURIComponent(token)}`;
  navigator.clipboard.writeText(url).then(() => {
    if (typeof showToast === 'function') {
      showToast('Public client link copied to clipboard!', 'success');
    } else {
      alert('Client link: ' + url);
    }
  }).catch(() => {
    prompt('Copy client link:', url);
  });
};
