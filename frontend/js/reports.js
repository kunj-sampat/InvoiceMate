// js/reports.js — Sales Analytics & GST Quarterly (GSTR-1) Reporting

let currentGstData = null;
let selectedQuarter = 'Q1';

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupQuarterButtons();

  document.getElementById('gst-year-select')?.addEventListener('change', loadGstQuarterly);
  document.getElementById('export-gst-csv-btn')?.addEventListener('click', exportGstCsv);
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());

  document.getElementById('generate-report-btn')?.addEventListener('click', loadSalesReport);

  await loadCustomersForFilter();

  // Load GST report by default
  loadGstQuarterly();
});

function setupTabs() {
  const tabGst = document.getElementById('tab-btn-gst');
  const tabSales = document.getElementById('tab-btn-sales');
  const contentGst = document.getElementById('tab-content-gst');
  const contentSales = document.getElementById('tab-content-sales');

  if (tabGst && tabSales) {
    tabGst.addEventListener('click', () => {
      tabGst.classList.add('active');
      tabSales.classList.remove('active');
      if (contentGst) contentGst.style.display = 'block';
      if (contentSales) contentSales.style.display = 'none';
    });

    tabSales.addEventListener('click', () => {
      tabSales.classList.add('active');
      tabGst.classList.remove('active');
      if (contentSales) contentSales.style.display = 'block';
      if (contentGst) contentGst.style.display = 'none';
      loadSalesReport();
    });
  }
}

function setupQuarterButtons() {
  const buttons = document.querySelectorAll('.quarter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedQuarter = btn.getAttribute('data-quarter') || 'Q1';
      loadGstQuarterly();
    });
  });
}

async function loadGstQuarterly() {
  const year = document.getElementById('gst-year-select')?.value || 2026;
  const url = `/api/reports/gst-quarterly?year=${encodeURIComponent(year)}&quarter=${encodeURIComponent(selectedQuarter)}`;

  try {
    const data = await apiRequest('GET', url);
    if (!data) return;
    currentGstData = data;

    // Period label
    const labelEl = document.getElementById('gst-period-label');
    if (labelEl) labelEl.textContent = `Showing filing data for ${data.dateRangeLabel || ''}`;

    // Summary cards
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('gst-taxable-val', formatCurrency(data.totalTaxableAmount || 0));
    setEl('gst-total-tax', formatCurrency(data.totalGstAmount || 0));
    setEl('gst-cgst-val', formatCurrency(data.totalCgstAmount || 0));
    setEl('gst-sgst-val', formatCurrency(data.totalSgstAmount || 0));
    setEl('gst-invoice-count', `${data.totalInvoiceCount || 0} filed invoices`);

    // Slabs table
    const slabsBody = document.getElementById('gst-slabs-body');
    if (slabsBody) {
      slabsBody.innerHTML = '';
      if (data.slabBreakdowns && data.slabBreakdowns.length > 0) {
        data.slabBreakdowns.forEach(s => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${s.rate}% GST Slab</strong></td>
            <td>${s.invoiceCount || 0}</td>
            <td style="text-align: right;">${formatCurrency(s.taxableAmount || 0)}</td>
            <td style="text-align: right; color: var(--color-text-secondary);">${formatCurrency(s.cgstAmount || 0)}</td>
            <td style="text-align: right; color: var(--color-text-secondary);">${formatCurrency(s.sgstAmount || 0)}</td>
            <td style="text-align: right; font-weight: 700; color: var(--color-primary);">${formatCurrency(s.totalTaxAmount || 0)}</td>
          `;
          slabsBody.appendChild(tr);
        });
      } else {
        slabsBody.innerHTML = '<tr><td colspan="6" class="text-center">No tax data for this quarter.</td></tr>';
      }
    }

    // Invoices list
    const invBody = document.getElementById('gst-invoices-body');
    if (invBody) {
      invBody.innerHTML = '';
      if (data.invoices && data.invoices.length > 0) {
        data.invoices.forEach(inv => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><a href="invoice-detail.html?id=${inv.id}" style="font-weight:700; color:var(--color-primary);">${inv.invoiceNumber}</a></td>
            <td>${formatDate(inv.invoiceDate)}</td>
            <td>${inv.customerName || 'N/A'}</td>
            <td><span class="badge badge-info">${inv.gstPercent}%</span></td>
            <td style="text-align: right;">${formatCurrency(inv.taxableAmount)}</td>
            <td style="text-align: right; color: var(--color-primary); font-weight:600;">${formatCurrency(inv.totalGst)}</td>
            <td style="text-align: right; font-weight: 700;">${formatCurrency(inv.grandTotal)}</td>
            <td><span class="badge ${getStatusBadgeClass(inv.status)}">${inv.status}</span></td>
          `;
          invBody.appendChild(tr);
        });
      } else {
        invBody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 32px; color: var(--color-text-tertiary);">No non-draft invoices in this quarter.</td></tr>';
      }
    }

  } catch (error) {
    if (typeof showToast === 'function') showToast('Failed to load GST quarterly report', 'error');
  }
}

function exportGstCsv() {
  if (!currentGstData || !currentGstData.invoices || currentGstData.invoices.length === 0) {
    if (typeof showToast === 'function') showToast('No data to export for this quarter', 'warning');
    return;
  }

  const rows = [
    ['Invoice Number', 'Invoice Date', 'Customer Name', 'GST Rate (%)', 'Taxable Value (INR)', 'CGST (INR)', 'SGST (INR)', 'Total GST (INR)', 'Grand Total (INR)', 'Status']
  ];

  currentGstData.invoices.forEach(i => {
    rows.push([
      `"${i.invoiceNumber}"`,
      `"${i.invoiceDate}"`,
      `"${(i.customerName || '').replace(/"/g, '""')}"`,
      i.gstPercent,
      i.taxableAmount.toFixed(2),
      i.cgstAmount.toFixed(2),
      i.sgstAmount.toFixed(2),
      i.totalGst.toFixed(2),
      i.grandTotal.toFixed(2),
      `"${i.status}"`
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `GSTR1_${currentGstData.year}_${currentGstData.quarter}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === 'function') showToast('GSTR-1 CSV exported successfully', 'success');
}

async function loadCustomersForFilter() {
  try {
    const customers = await apiRequest('GET', '/api/customers');
    const select = document.getElementById('report-customer');
    if (select && Array.isArray(customers)) {
      customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    }
  } catch(e) {}
}

async function loadSalesReport() {
  const from = document.getElementById('report-from')?.value;
  const to = document.getElementById('report-to')?.value;
  const custId = document.getElementById('report-customer')?.value;

  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (custId) params.append('customerId', custId);

  try {
    const summary = await apiRequest('GET', `/api/reports?${params.toString()}`);
    if (summary) {
      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setEl('report-invoices', summary.totalInvoices || 0);
      setEl('report-revenue', formatCurrency(summary.totalRevenue || 0));
      setEl('report-paid', formatCurrency(summary.totalPaid || 0));
      setEl('report-outstanding', formatCurrency(summary.outstanding || 0));
    }

    const invTbody = document.getElementById('report-invoices-body');
    if (invTbody && summary && summary.invoices) {
      invTbody.innerHTML = '';
      if (summary.invoices.length > 0) {
        summary.invoices.forEach(inv => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><a href="invoice-detail.html?id=${inv.id}" style="font-weight:700;">${inv.invoiceNumber}</a></td>
            <td>${formatDate(inv.invoiceDate)}</td>
            <td>${inv.customerName || 'N/A'}</td>
            <td><span class="badge ${getStatusBadgeClass(inv.status)}">${inv.status}</span></td>
            <td style="text-align: right; font-weight:700;">${formatCurrency(inv.grandTotal)}</td>
          `;
          invTbody.appendChild(tr);
        });
      } else {
        invTbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:32px;">No sales in this period.</td></tr>';
      }
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to load sales report', 'error');
  }
}
