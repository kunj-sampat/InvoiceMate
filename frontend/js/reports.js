// js/reports.js — Sales Analytics & GST Tax Summary / CA Filing Preparation

let currentGstData = null;
let selectedQuarter = 'Q1';
let selectedMode = 'QUARTER'; // 'QUARTER', 'MONTH', 'FY'

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupFilterModes();
  setupQuarterButtons();

  document.getElementById('gst-year-select')?.addEventListener('change', loadGstReport);
  document.getElementById('gst-month-select')?.addEventListener('change', loadGstReport);
  document.getElementById('export-gst-csv-btn')?.addEventListener('click', exportGstCsv);
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());

  document.getElementById('generate-report-btn')?.addEventListener('click', loadSalesReport);

  await loadCustomersForFilter();

  // Load GST report by default
  loadGstReport();
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

function setupFilterModes() {
  const btnQuarter = document.getElementById('mode-btn-quarter');
  const btnMonth = document.getElementById('mode-btn-month');
  const btnFy = document.getElementById('mode-btn-fy');

  const controlQuarter = document.getElementById('period-control-quarter');
  const controlMonth = document.getElementById('period-control-month');

  function setMode(mode) {
    selectedMode = mode;
    [btnQuarter, btnMonth, btnFy].forEach(b => {
      if (b) {
        b.style.background = 'transparent';
        b.style.color = '#64748b';
        b.classList.remove('active');
      }
    });

    let activeBtn = btnQuarter;
    if (mode === 'MONTH') activeBtn = btnMonth;
    if (mode === 'FY') activeBtn = btnFy;

    if (activeBtn) {
      activeBtn.style.background = '#205646';
      activeBtn.style.color = '#ffffff';
      activeBtn.classList.add('active');
    }

    if (controlQuarter) controlQuarter.style.display = mode === 'QUARTER' ? 'block' : 'none';
    if (controlMonth) controlMonth.style.display = mode === 'MONTH' ? 'block' : 'none';

    loadGstReport();
  }

  btnQuarter?.addEventListener('click', () => setMode('QUARTER'));
  btnMonth?.addEventListener('click', () => setMode('MONTH'));
  btnFy?.addEventListener('click', () => setMode('FY'));
}

function setupQuarterButtons() {
  const buttons = document.querySelectorAll('.quarter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedQuarter = btn.getAttribute('data-quarter') || 'Q1';
      loadGstReport();
    });
  });
}

// ==========================================================================
// 1. GST REPORT (MONTH / QUARTER / FY)
// ==========================================================================
async function loadGstReport() {
  const year = document.getElementById('gst-year-select')?.value || 2026;
  const month = document.getElementById('gst-month-select')?.value || 10;

  const params = new URLSearchParams();
  params.append('periodType', selectedMode);
  params.append('year', year);
  if (selectedMode === 'QUARTER') {
    params.append('quarter', selectedQuarter);
  } else if (selectedMode === 'MONTH') {
    params.append('month', month);
  } else {
    params.append('quarter', 'ALL');
  }

  const url = `/api/reports/gst-report?${params.toString()}`;

  const invBody = document.getElementById('gst-invoices-body');
  if (invBody) {
    invBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 36px;">
          <div style="display:inline-flex; align-items:center; gap:10px; color:#64748b; font-weight:600; font-size:13px;">
            <div class="invoza-bar-loader">
              <span></span><span></span><span></span><span></span>
            </div>
            <span>Calculating GST filing summary...</span>
          </div>
        </td>
      </tr>
    `;
  }

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
    setEl('gst-igst-val', formatCurrency(data.totalIgstAmount || 0));
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
            <td style="text-align: right; color: var(--color-text-secondary);">${formatCurrency(s.igstAmount || 0)}</td>
            <td style="text-align: right; font-weight: 700; color: #205646;">${formatCurrency(s.totalTaxAmount || 0)}</td>
          `;
          slabsBody.appendChild(tr);
        });
      } else {
        slabsBody.innerHTML = '<tr><td colspan="7" class="text-center">No tax data for this period.</td></tr>';
      }
    }

    // Invoices list
    const invBody = document.getElementById('gst-invoices-body');
    const tableCountEl = document.getElementById('gst-invoice-table-count');
    if (tableCountEl) {
      tableCountEl.textContent = `${(data.invoices || []).length} invoices`;
    }

    if (invBody) {
      invBody.innerHTML = '';
      if (data.invoices && data.invoices.length > 0) {
        data.invoices.forEach(inv => {
          const tr = document.createElement('tr');
          const gstinDisplay = (inv.customerGstin && inv.customerGstin !== 'N/A')
            ? `<span style="font-family: monospace; font-size: 12px; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">${inv.customerGstin}</span>`
            : '<span style="color: #94a3b8; font-size: 12px;">N/A</span>';

          tr.innerHTML = `
            <td><a href="invoice-detail.html?id=${inv.id}" style="font-weight:700; color:#205646; text-decoration: none;">${inv.invoiceNumber}</a></td>
            <td style="color: #64748b;">${formatDate(inv.invoiceDate)}</td>
            <td><strong>${inv.customerName || 'N/A'}</strong></td>
            <td>${gstinDisplay}</td>
            <td style="text-align: right;">${formatCurrency(inv.taxableAmount)}</td>
            <td style="text-align: center;"><span class="badge badge-info" style="font-size: 11px;">${inv.gstPercent}%</span></td>
            <td style="text-align: right; color: #64748b;">${formatCurrency(inv.cgstAmount)}</td>
            <td style="text-align: right; color: #64748b;">${formatCurrency(inv.sgstAmount)}</td>
            <td style="text-align: right; color: #64748b;">${formatCurrency(inv.igstAmount || 0)}</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(inv.grandTotal)}</td>
            <td style="text-align: center;"><span class="badge ${getStatusBadgeClass(inv.status)}">${inv.status}</span></td>
          `;
          invBody.appendChild(tr);
        });
      } else {
        invBody.innerHTML = '<tr><td colspan="11" class="text-center" style="padding: 36px; color: var(--color-text-tertiary);">No outward supplies in this selected filing period.</td></tr>';
      }
    }

  } catch (error) {
    if (typeof showToast === 'function') showToast('Failed to load GST tax report', 'error');
  }
}

// Backward-compatible alias
window.loadGstQuarterly = loadGstReport;

// ==========================================================================
// 2. EXPORT GST REPORT CSV (FORMATTED FOR CHARTERED ACCOUNTANT)
// ==========================================================================
function exportGstCsv() {
  if (!currentGstData || !currentGstData.invoices || currentGstData.invoices.length === 0) {
    if (typeof showToast === 'function') showToast('No data to export for this period', 'warning');
    return;
  }

  const rows = [
    [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Taxable Value (INR)',
      'GST Rate (%)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total GST (INR)',
      'Grand Total (INR)',
      'Filing Status'
    ]
  ];

  currentGstData.invoices.forEach(i => {
    rows.push([
      `"${i.invoiceNumber}"`,
      `"${i.invoiceDate}"`,
      `"${(i.customerName || '').replace(/"/g, '""')}"`,
      `"${i.customerGstin && i.customerGstin !== 'N/A' ? i.customerGstin : ''}"`,
      (i.taxableAmount || 0).toFixed(2),
      i.gstPercent,
      (i.cgstAmount || 0).toFixed(2),
      (i.sgstAmount || 0).toFixed(2),
      (i.igstAmount || 0).toFixed(2),
      (i.totalGst || 0).toFixed(2),
      (i.grandTotal || 0).toFixed(2),
      `"${i.status}"`
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  
  let filenamePeriod = `${currentGstData.year}_${currentGstData.periodType}`;
  if (currentGstData.periodType === 'QUARTER') filenamePeriod += `_${currentGstData.quarter}`;
  if (currentGstData.periodType === 'MONTH') filenamePeriod += `_Month${currentGstData.month}`;

  link.setAttribute('download', `InvoiceMate_GST_Report_${filenamePeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === 'function') showToast('GST Report CSV exported successfully for CA review', 'success');
}

// ==========================================================================
// 3. SALES OVERVIEW & ANALYTICS TAB
// ==========================================================================
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
            <td><a href="invoice-detail.html?id=${inv.id}" style="font-weight:700; color:#205646; text-decoration:none;">${inv.invoiceNumber}</a></td>
            <td style="color:#64748b;">${formatDate(inv.invoiceDate)}</td>
            <td><strong>${inv.customerName || 'N/A'}</strong></td>
            <td><span class="badge ${getStatusBadgeClass(inv.status)}">${inv.status}</span></td>
            <td style="text-align: right; font-weight:700; color:#0f172a;">${formatCurrency(inv.grandTotal)}</td>
          `;
          invTbody.appendChild(tr);
        });
      } else {
        invTbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:32px; color:var(--color-text-tertiary);">No sales in this period.</td></tr>';
      }
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to load sales report', 'error');
  }
}
