// js/dashboard.js
// InvoiceMate Dashboard Controller (Invoza Design with Real InvoiceMate Content)

let dashboardInvoices = [];

document.addEventListener('DOMContentLoaded', () => {
  initDashboardHeader();
  loadDashboardData();
  initExportCSV();
});

// ==========================================================================
// 1. HEADER & DATES
// ==========================================================================
function initDashboardHeader() {
  const userName = localStorage.getItem('userName') || 'User';

  const welcomeTitle = document.getElementById('welcome-header-title');
  if (welcomeTitle) welcomeTitle.textContent = `Welcome Back, ${userName}`;

  const sidebarName = document.getElementById('sidebar-user-name');
  if (sidebarName) sidebarName.textContent = userName;

  const initials = getInitials(userName);
  const sideAvatar = document.getElementById('sidebar-user-avatar');
  if (sideAvatar) sideAvatar.textContent = initials;
  const topAvatar = document.getElementById('header-user-avatar');
  if (topAvatar) topAvatar.textContent = initials;

  const dateDisplay = document.getElementById('dash-date-display');
  if (dateDisplay) {
    const today = new Date();
    dateDisplay.textContent = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ==========================================================================
// 2. LOAD DASHBOARD DATA
// ==========================================================================
async function loadDashboardData() {
  try {
    const data = await apiRequest('GET', '/api/dashboard/summary');
    if (!data) return;

    const totalRev = data.totalRevenue || 0;
    const totalPaid = data.totalPaid || 0;
    const totalDue = data.totalOutstanding || 0;
    const overdueCount = data.overdueCount || 0;
    const totalOverdue = overdueCount > 0 ? (totalDue * 0.5) : 0;

    // 1. Stat Cards Numbers
    if (document.getElementById('total-revenue')) document.getElementById('total-revenue').textContent = formatCurrency(totalRev);
    if (document.getElementById('total-paid')) document.getElementById('total-paid').textContent = formatCurrency(totalPaid);
    if (document.getElementById('total-outstanding')) document.getElementById('total-outstanding').textContent = formatCurrency(totalDue);
    if (document.getElementById('total-overdue')) document.getElementById('total-overdue').textContent = formatCurrency(totalOverdue);
    if (document.getElementById('chart-rev-big')) document.getElementById('chart-rev-big').textContent = formatCurrency(totalRev);

    // Paid Rate Calculation
    const paidRate = totalRev > 0 ? Math.min(Math.round((totalPaid / totalRev) * 100), 100) : 0;
    if (document.getElementById('paid-rate-label')) {
      document.getElementById('paid-rate-label').textContent = `↗ ${paidRate}% Settled`;
    }
    if (document.getElementById('due-count-label')) {
      document.getElementById('due-count-label').textContent = `${data.pendingCount || 0} Pending`;
    }
    if (document.getElementById('overdue-status-label')) {
      document.getElementById('overdue-status-label').textContent = `${overdueCount} Overdue`;
    }

    // 2. Collection Rate & Cash Flow Health Card
    if (document.getElementById('health-rate-num')) {
      document.getElementById('health-rate-num').textContent = `${paidRate}%`;
    }
    if (document.getElementById('health-progress-bar')) {
      document.getElementById('health-progress-bar').style.width = `${paidRate}%`;
    }
    if (document.getElementById('health-collected-text')) {
      document.getElementById('health-collected-text').textContent = formatCurrency(totalPaid);
    }
    if (document.getElementById('health-pending-text')) {
      document.getElementById('health-pending-text').textContent = formatCurrency(totalDue);
    }

    // Fetch Profit Summary (Collected - Expenses)
    try {
      const profitData = await apiRequest('GET', '/api/expenses/profit-summary');
      if (profitData) {
        if (document.getElementById('health-expenses-text')) {
          document.getElementById('health-expenses-text').textContent = formatCurrency(profitData.totalExpenses || 0);
        }
        if (document.getElementById('health-net-profit')) {
          document.getElementById('health-net-profit').textContent = formatCurrency(profitData.netProfit || 0);
        }
      }
    } catch (e) {
      console.warn('Could not load expense profit data', e);
    }

    // Overdue Alert Notice
    const overdueNotice = document.getElementById('overdue-alert-notice');
    const overdueCountEl = document.getElementById('overdue-alert-count');
    if (overdueNotice && overdueCount > 0) {
      if (overdueCountEl) overdueCountEl.textContent = `${overdueCount} Invoice${overdueCount > 1 ? 's' : ''} Overdue`;
      overdueNotice.style.display = 'block';
    } else if (overdueNotice) {
      overdueNotice.style.display = 'none';
    }

    // 3. Render Mini SVG Graphics
    if (typeof renderInvozaStatGraphics === 'function') {
      renderInvozaStatGraphics({ paidRate: paidRate || 0 });
    }

    // 4. Fetch All Invoices for Real Cash Flow & Receivables Pipeline Breakdown
    let allInvoices = [];
    try {
      allInvoices = await apiRequest('GET', '/api/invoices') || [];
    } catch (e) {
      allInvoices = data.recentInvoices || [];
    }

    renderCashFlowAndPipeline(allInvoices, totalRev, totalPaid);

    // 5. Render Recent Invoices
    dashboardInvoices = data.recentInvoices || [];
    renderRecentInvoices(dashboardInvoices);

  } catch (err) {
    console.error('Failed to load dashboard data', err);
    if (typeof showToast === 'function') showToast('Failed to load dashboard statistics', 'error');
  }
}

// ==========================================================================
// 3. REAL CASH FLOW & RECEIVABLES PIPELINE
// ==========================================================================
let currentMonthlyData = [];

function renderCashFlowAndPipeline(invoices, totalRev, totalPaid) {
  // Exclude estimates
  const regularInvoices = (invoices || []).filter(i => !i.isEstimate);

  // 1. Calculate Last 6 Months (Real Data)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const monthsData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const label = monthNames[m];
    const fullDate = `${label} ${y}`;

    // Filter invoices matching this month & year
    let billed = 0;
    let collected = 0;

    regularInvoices.forEach(inv => {
      if (!inv.isDraft && inv.invoiceDate) {
        const invD = new Date(inv.invoiceDate);
        if (invD.getFullYear() === y && invD.getMonth() === m) {
          billed += (inv.grandTotal || 0);
          collected += (inv.amountPaid || 0);
        }
      }
    });

    monthsData.push({ label, fullDate, billed, collected });
  }

  currentMonthlyData = monthsData;

  // Draw Bar Chart
  if (typeof drawInvozaCashFlowBarChart === 'function') {
    drawInvozaCashFlowBarChart('invoza-bar-canvas', monthsData);
  }

  window.removeEventListener('resize', resizeCashFlowChart);
  window.addEventListener('resize', resizeCashFlowChart);

  // 2. Calculate Receivables Status & Aging Breakdown Matrix
  let paidAmt = 0, paidCount = 0;
  let pendingAmt = 0, pendingCount = 0;
  let overdueAmt = 0, overdueCount = 0;
  let draftAmt = 0, draftCount = 0;

  regularInvoices.forEach(inv => {
    const total = inv.grandTotal || 0;
    const paid = inv.amountPaid || 0;
    const balance = Math.max(total - paid, 0);

    if (inv.isDraft || inv.status === 'DRAFT') {
      draftAmt += total;
      draftCount++;
    } else if (inv.status === 'PAID') {
      paidAmt += total;
      paidCount++;
    } else if (inv.status === 'OVERDUE') {
      overdueAmt += balance;
      overdueCount++;
    } else {
      // Pending / Partially Paid
      pendingAmt += balance;
      pendingCount++;
    }
  });

  const sumAll = paidAmt + pendingAmt + overdueAmt + draftAmt || 1;
  const paidPct = Math.round((paidAmt / sumAll) * 100);
  const pendingPct = Math.round((pendingAmt / sumAll) * 100);
  const overduePct = Math.round((overdueAmt / sumAll) * 100);
  const draftPct = Math.round((draftAmt / sumAll) * 100);

  // Update DOM elements for pipeline
  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setEl('pipe-paid-pct', `${paidPct}%`);
  setEl('pipe-paid-amount', formatCurrency(paidAmt));
  setEl('pipe-paid-count', `${paidCount} invoice${paidCount !== 1 ? 's' : ''}`);

  setEl('pipe-pending-pct', `${pendingPct}%`);
  setEl('pipe-pending-amount', formatCurrency(pendingAmt));
  setEl('pipe-pending-count', `${pendingCount} invoice${pendingCount !== 1 ? 's' : ''}`);

  setEl('pipe-overdue-pct', `${overduePct}%`);
  setEl('pipe-overdue-amount', formatCurrency(overdueAmt));
  setEl('pipe-overdue-count', `${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`);

  setEl('pipe-draft-pct', `${draftPct}%`);
  setEl('pipe-draft-amount', formatCurrency(draftAmt));
  setEl('pipe-draft-count', `${draftCount} invoice${draftCount !== 1 ? 's' : ''}`);

  setEl('badge-total-settled', `${paidPct}% Settled`);
}

function resizeCashFlowChart() {
  if (typeof drawInvozaCashFlowBarChart === 'function' && currentMonthlyData.length > 0) {
    drawInvozaCashFlowBarChart('invoza-bar-canvas', currentMonthlyData);
  }
}

// ==========================================================================
// 4. RECENT INVOICES TABLE
// ==========================================================================
function renderRecentInvoices(invoices) {
  const tbody = document.getElementById('invoza-recent-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!invoices || invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
          No invoices yet. <a href="create-invoice.html" style="color: #205646; font-weight: 700;">Create your first invoice</a>
        </td>
      </tr>
    `;
    return;
  }

  invoices.forEach(inv => {
    const tr = document.createElement('tr');

    const clientInitials = getInitials(inv.customerName || 'Client');
    const dateFormatted = inv.invoiceDate ? formatDate(inv.invoiceDate) : '-';
    const dueFormatted = inv.dueDate ? formatDate(inv.dueDate) : '-';

    // Status Pill
    const st = (inv.status || 'PENDING').toUpperCase();
    let badgeHtml = '<span class="status-pill-pending">Pending</span>';
    if (st === 'PAID') {
      badgeHtml = '<span class="status-pill-success">Paid</span>';
    } else if (st === 'OVERDUE') {
      badgeHtml = '<span class="status-pill-danger">Overdue</span>';
    } else if (st === 'DRAFT') {
      badgeHtml = '<span class="status-pill-draft">Draft</span>';
    }

    tr.innerHTML = `
      <td>
        <a href="invoice-detail.html?id=${inv.id}" style="color: #205646; font-weight: 700; text-decoration: none;">
          ${inv.invoiceNumber || '#' + inv.id}
        </a>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #475569;">
            ${clientInitials}
          </div>
          <span style="font-weight: 600;">${inv.customerName || 'N/A'}</span>
        </div>
      </td>
      <td style="color: #64748b;">${dateFormatted}</td>
      <td style="color: #64748b;">${dueFormatted}</td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(inv.grandTotal || 0)}</td>
      <td style="text-align: center;">${badgeHtml}</td>
      <td style="text-align: center;">
        <div style="display: inline-flex; align-items: center; gap: 6px;">
          <a href="invoice-detail.html?id=${inv.id}" class="btn btn-secondary btn-sm" style="padding: 4px 10px;">View</a>
          <button onclick="quickWhatsApp('${inv.id}')" style="background:none; border:none; cursor:pointer; font-size:15px; padding: 3px;" title="Share on WhatsApp">&#128242;</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.quickWhatsApp = function(id) {
  const inv = dashboardInvoices.find(x => String(x.id) === String(id));
  if (inv && typeof shareOnWhatsApp === 'function') {
    shareOnWhatsApp(inv, 'invoice');
  } else {
    window.location.href = `invoice-detail.html?id=${id}`;
  }
};

// ==========================================================================
// 5. EXPORT CSV
// ==========================================================================
function initExportCSV() {
  const exportBtn = document.getElementById('btn-export-csv');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    if (!dashboardInvoices || dashboardInvoices.length === 0) {
      if (typeof showToast === 'function') showToast('No invoices to export', 'warning');
      return;
    }

    const headers = ['Invoice Number', 'Client Name', 'Date', 'Due Date', 'Grand Total (INR)', 'Status'];
    const rows = dashboardInvoices.map(inv => [
      `"${inv.invoiceNumber || inv.id}"`,
      `"${(inv.customerName || 'N/A').replace(/"/g, '""')}"`,
      `"${inv.invoiceDate || ''}"`,
      `"${inv.dueDate || ''}"`,
      inv.grandTotal || 0,
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
  });
}
