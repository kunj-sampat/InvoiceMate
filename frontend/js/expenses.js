// js/expenses.js — Expense & Profit Tracker Controller

let currentExpenses = [];
let currentProfitData = null;

document.addEventListener('DOMContentLoaded', () => {
  initExpensesPage();
  setupEventListeners();
  loadProfitSummary();
  loadExpenses();
});

function initExpensesPage() {
  // Set default expense date in modal to today
  const dateInput = document.getElementById('expense-input-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

function setupEventListeners() {
  // Add Expense Button
  document.getElementById('add-expense-btn')?.addEventListener('click', () => openExpenseModal());
  document.getElementById('close-expense-modal')?.addEventListener('click', closeExpenseModal);
  document.getElementById('cancel-expense-btn')?.addEventListener('click', closeExpenseModal);

  // Form submission
  document.getElementById('expense-form')?.addEventListener('submit', handleExpenseSubmit);

  // Filters
  const searchInput = document.getElementById('expense-search');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        loadExpenses();
      }, 300);
    });
  }

  document.getElementById('expense-category-filter')?.addEventListener('change', loadExpenses);
  document.getElementById('apply-expense-filters')?.addEventListener('click', () => {
    loadExpenses();
    const from = document.getElementById('expense-from')?.value;
    const to = document.getElementById('expense-to')?.value;
    loadProfitSummary(from, to);
  });

  document.getElementById('clear-expense-filters')?.addEventListener('click', () => {
    if (document.getElementById('expense-search')) document.getElementById('expense-search').value = '';
    if (document.getElementById('expense-category-filter')) document.getElementById('expense-category-filter').value = '';
    if (document.getElementById('expense-from')) document.getElementById('expense-from').value = '';
    if (document.getElementById('expense-to')) document.getElementById('expense-to').value = '';
    loadExpenses();
    loadProfitSummary();
  });

  // Export CSV
  document.getElementById('export-expenses-csv')?.addEventListener('click', exportExpensesCsv);
}

// ==========================================================================
// 1. PROFIT SUMMARY & ACTUAL COLLECTED NET PROFIT
// ==========================================================================
async function loadProfitSummary(from = null, to = null) {
  try {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const summary = await apiRequest('GET', `/api/expenses/profit-summary?${params.toString()}`);
    if (!summary) return;

    currentProfitData = summary;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('kpi-total-invoiced', formatCurrency(summary.totalInvoiced || 0));
    setEl('kpi-total-collected', formatCurrency(summary.totalCollected || 0));
    setEl('kpi-total-expenses', formatCurrency(summary.totalExpenses || 0));
    setEl('kpi-pending-amount', formatCurrency(summary.pendingAmount || 0));
    setEl('kpi-net-profit', formatCurrency(summary.netProfit || 0));

    setEl('kpi-invoice-count', `${summary.invoiceCount || 0} billed invoices`);
    setEl('kpi-expense-count', `${summary.expenseCount || 0} recorded items`);

    // Render 3-Stream Monthly Bar Chart: Collected vs Expenses vs Net Profit
    if (summary.monthlyBreakdown && summary.monthlyBreakdown.length > 0) {
      drawExpenseProfitBarChart('expense-profit-canvas', summary.monthlyBreakdown);
    }

  } catch (error) {
    console.error('Failed to load profit summary', error);
  }
}

// ==========================================================================
// 2. EXPENSES LIST & TABLE
// ==========================================================================
async function loadExpenses() {
  const search = document.getElementById('expense-search')?.value || '';
  const category = document.getElementById('expense-category-filter')?.value || '';
  const from = document.getElementById('expense-from')?.value || '';
  const to = document.getElementById('expense-to')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const tbody = document.getElementById('expenses-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px;">
          <div style="display:inline-flex; align-items:center; gap:10px; color:#64748b; font-weight:600; font-size:13px;">
            <div class="invoza-bar-loader">
              <span></span><span></span><span></span><span></span>
            </div>
            <span>Loading expense records...</span>
          </div>
        </td>
      </tr>
    `;
  }

  try {
    const data = await apiRequest('GET', `/api/expenses?${params.toString()}`);
    currentExpenses = data || [];

    const summaryEl = document.getElementById('expense-table-summary');
    if (summaryEl) {
      summaryEl.textContent = `${currentExpenses.length} expense${currentExpenses.length !== 1 ? 's' : ''} listed`;
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (currentExpenses.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 48px 20px; color: var(--color-text-tertiary);">
            <div style="font-size: 28px; margin-bottom: 8px;">📋</div>
            <div style="font-size: 15px; font-weight: 600; color: var(--color-text); margin-bottom: 4px;">No expenses found</div>
            <p style="margin: 0; font-size: 13px;">No business expenditures match your current filters. Click "Add Expense" to record one.</p>
          </td>
        </tr>
      `;
      return;
    }

    currentExpenses.forEach(exp => {
      const tr = document.createElement('tr');
      const catClass = getCategoryClass(exp.category);

      tr.innerHTML = `
        <td style="color: #64748b; font-size: 13px;">${formatDate(exp.expenseDate)}</td>
        <td>
          <strong style="color: #0f172a; font-size: 14px;">${escapeHtml(exp.title)}</strong>
        </td>
        <td>
          <span class="category-pill ${catClass}">${escapeHtml(exp.category || 'Other')}</span>
        </td>
        <td>
          <span class="payment-method-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            ${escapeHtml(exp.paymentMethod || 'Bank Transfer')}
          </span>
        </td>
        <td style="color: #64748b; font-size: 12.5px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${exp.notes ? escapeHtml(exp.notes) : '<span style="color:#cbd5e1;">-</span>'}
        </td>
        <td style="text-align: right; font-weight: 700; color: #dc2626; font-size: 14px;">
          ${formatCurrency(exp.amount || 0)}
        </td>
        <td style="text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <button onclick="editExpense(${exp.id})" class="btn btn-secondary btn-sm" style="padding: 4px 8px;" title="Edit Expense">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button onclick="confirmDeleteExpense(${exp.id}, '${escapeHtml(exp.title).replace(/'/g, "\\'")}')" class="btn btn-secondary btn-sm" style="padding: 4px 8px; color: #dc2626;" title="Delete Expense">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    if (typeof showToast === 'function') showToast('Failed to load expenses', 'error');
  }
}

function getCategoryClass(cat) {
  const c = (cat || '').toLowerCase().trim();
  if (c.includes('office')) return 'cat-office';
  if (c.includes('software')) return 'cat-software';
  if (c.includes('travel')) return 'cat-travel';
  if (c.includes('market')) return 'cat-marketing';
  if (c.includes('equip')) return 'cat-equipment';
  if (c.includes('rent')) return 'cat-rent';
  if (c.includes('util')) return 'cat-utilities';
  if (c.includes('salary') || c.includes('free')) return 'cat-salary';
  return 'cat-other';
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

// ==========================================================================
// 3. ADD & EDIT EXPENSE MODAL
// ==========================================================================
function openExpenseModal(expense = null) {
  const modal = document.getElementById('expense-modal');
  const titleEl = document.getElementById('expense-modal-title');
  const editIdInput = document.getElementById('expense-edit-id');

  if (expense) {
    if (titleEl) titleEl.textContent = 'Edit Business Expense';
    if (editIdInput) editIdInput.value = expense.id;
    document.getElementById('expense-input-title').value = expense.title || '';
    document.getElementById('expense-input-category').value = expense.category || 'Other';
    document.getElementById('expense-input-amount').value = expense.amount || '';
    document.getElementById('expense-input-date').value = expense.expenseDate || '';
    document.getElementById('expense-input-method').value = expense.paymentMethod || 'Bank Transfer';
    document.getElementById('expense-input-notes').value = expense.notes || '';
  } else {
    if (titleEl) titleEl.textContent = 'Add Business Expense';
    if (editIdInput) editIdInput.value = '';
    document.getElementById('expense-form').reset();
    document.getElementById('expense-input-date').value = new Date().toISOString().split('T')[0];
  }

  if (modal) modal.classList.add('active');
}

function closeExpenseModal() {
  const modal = document.getElementById('expense-modal');
  if (modal) modal.classList.remove('active');
}

async function handleExpenseSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('expense-edit-id')?.value;
  const title = document.getElementById('expense-input-title')?.value.trim();
  const category = document.getElementById('expense-input-category')?.value;
  const amount = parseFloat(document.getElementById('expense-input-amount')?.value);
  const expenseDate = document.getElementById('expense-input-date')?.value;
  const paymentMethod = document.getElementById('expense-input-method')?.value;
  const notes = document.getElementById('expense-input-notes')?.value.trim();

  if (!title) {
    if (typeof showToast === 'function') showToast('Please enter an expense title', 'warning');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    if (typeof showToast === 'function') showToast('Please enter a valid expense amount', 'warning');
    return;
  }
  if (!expenseDate) {
    if (typeof showToast === 'function') showToast('Please select an expense date', 'warning');
    return;
  }

  const payload = {
    title,
    category,
    amount,
    expenseDate,
    paymentMethod,
    notes
  };

  try {
    if (editId) {
      await apiRequest('PUT', `/api/expenses/${editId}`, payload);
      if (typeof showToast === 'function') showToast('Expense updated successfully!', 'success');
    } else {
      await apiRequest('POST', '/api/expenses', payload);
      if (typeof showToast === 'function') showToast('Expense added successfully!', 'success');
    }

    closeExpenseModal();
    loadExpenses();
    loadProfitSummary();
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'Failed to save expense', 'error');
  }
}

window.editExpense = async function(id) {
  const exp = currentExpenses.find(x => x.id === id);
  if (exp) {
    openExpenseModal(exp);
  } else {
    try {
      const fetched = await apiRequest('GET', `/api/expenses/${id}`);
      if (fetched) openExpenseModal(fetched);
    } catch (e) {
      if (typeof showToast === 'function') showToast('Failed to load expense details', 'error');
    }
  }
};

window.confirmDeleteExpense = async function(id, title) {
  if (typeof window.showConfirmDialog === 'function') {
    const ok = await window.showConfirmDialog({
      title: 'Delete Expense',
      message: `Are you sure you want to delete "${title}"? This will update your net profit calculations.`,
      confirmText: 'Delete Expense',
      cancelText: 'Cancel',
      isDanger: true
    });
    if (ok) {
      await performDeleteExpense(id);
    }
  } else {
    // Fallback in-app modal
    const overlay = document.getElementById('confirm-modal-overlay');
    const msgEl = document.getElementById('confirm-modal-message');
    const proceedBtn = document.getElementById('confirm-modal-proceed');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    if (overlay && proceedBtn) {
      if (msgEl) msgEl.textContent = `Are you sure you want to delete "${title}"?`;
      overlay.classList.add('active');

      const closeConfirm = () => overlay.classList.remove('active');
      cancelBtn.onclick = closeConfirm;
      proceedBtn.onclick = () => {
        closeConfirm();
        performDeleteExpense(id);
      };
    } else if (confirm(`Delete expense "${title}"?`)) {
      performDeleteExpense(id);
    }
  }
};

async function performDeleteExpense(id) {
  try {
    await apiRequest('DELETE', `/api/expenses/${id}`);
    if (typeof showToast === 'function') showToast('Expense deleted successfully', 'success');
    loadExpenses();
    loadProfitSummary();
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'Failed to delete expense', 'error');
  }
}

// ==========================================================================
// 4. MONTHLY REVENUE VS EXPENSES VS PROFIT VISUALIZATION CANVAS
// ==========================================================================
function drawExpenseProfitBarChart(canvasId, monthlyPoints = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.parentElement.clientWidth || 560;
  const height = 200;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const padLeft = 50;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 28;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  if (!monthlyPoints || monthlyPoints.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No financial activity recorded in this period', width / 2, height / 2);
    return;
  }

  // Find max value across streams for scaling
  let maxVal = 0;
  monthlyPoints.forEach(p => {
    if (p.collected > maxVal) maxVal = p.collected;
    if (p.expenses > maxVal) maxVal = p.expenses;
    if (Math.abs(p.profit) > maxVal) maxVal = Math.abs(p.profit);
  });

  if (maxVal === 0) maxVal = 10000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  maxVal = Math.ceil((maxVal * 1.15) / magnitude) * magnitude;

  // Draw 4 dashed horizontal guide lines
  const steps = 4;
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);

  for (let i = 0; i <= steps; i++) {
    const val = (maxVal / steps) * i;
    const y = padTop + plotHeight - (val / maxVal) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    let label = '₹0';
    if (val >= 100000) label = `₹${(val / 100000).toFixed(1)}L`;
    else if (val >= 1000) label = `₹${Math.round(val / 1000)}k`;
    else if (val > 0) label = `₹${Math.round(val)}`;
    ctx.fillText(label, padLeft - 6, y + 3);
    ctx.setLineDash([3, 4]);
  }
  ctx.setLineDash([]);

  // Calculate 3 grouped bars per month (Collected, Expenses, Net Profit)
  const numGroups = monthlyPoints.length;
  const groupSlot = plotWidth / numGroups;
  const barWidth = Math.min(Math.max(groupSlot * 0.22, 10), 20);
  const barGap = 3;

  const barPositions = [];

  monthlyPoints.forEach((m, idx) => {
    const groupCenterX = padLeft + idx * groupSlot + groupSlot / 2;
    const xCollected = groupCenterX - barWidth - barGap;
    const xExpenses = groupCenterX;
    const xProfit = groupCenterX + barWidth + barGap;

    const hCollected = Math.max((m.collected / maxVal) * plotHeight, m.collected > 0 ? 3 : 0);
    const yCollected = padTop + plotHeight - hCollected;

    const hExpenses = Math.max((m.expenses / maxVal) * plotHeight, m.expenses > 0 ? 3 : 0);
    const yExpenses = padTop + plotHeight - hExpenses;

    const hProfit = Math.max((Math.max(m.profit, 0) / maxVal) * plotHeight, m.profit > 0 ? 3 : 0);
    const yProfit = padTop + plotHeight - hProfit;

    // 1. Collected bar (Mint #10b981)
    ctx.fillStyle = '#10b981';
    if (hCollected > 0) {
      drawRoundedBar(ctx, xCollected, yCollected, barWidth, hCollected, 3);
    } else {
      ctx.fillStyle = '#f1f5f9';
      drawRoundedBar(ctx, xCollected, padTop + plotHeight - 2, barWidth, 2, 1);
    }

    // 2. Expenses bar (Coral #f43f5e)
    ctx.fillStyle = '#f43f5e';
    if (hExpenses > 0) {
      drawRoundedBar(ctx, xExpenses, yExpenses, barWidth, hExpenses, 3);
    } else {
      ctx.fillStyle = '#f1f5f9';
      drawRoundedBar(ctx, xExpenses, padTop + plotHeight - 2, barWidth, 2, 1);
    }

    // 3. Net Profit bar (Forest #205646)
    ctx.fillStyle = '#205646';
    if (hProfit > 0) {
      drawRoundedBar(ctx, xProfit, yProfit, barWidth, hProfit, 3);
    } else {
      ctx.fillStyle = '#f1f5f9';
      drawRoundedBar(ctx, xProfit, padTop + plotHeight - 2, barWidth, 2, 1);
    }

    // Month label
    ctx.fillStyle = '#64748b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.month, groupCenterX, height - 8);

    barPositions.push({
      x: groupCenterX,
      month: m.month,
      fullDate: m.fullDate || m.month,
      collected: m.collected,
      expenses: m.expenses,
      profit: m.profit
    });
  });

  function drawRoundedBar(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
    c.fill();
  }

  // Interactive Hover Tooltip
  canvas.onmousemove = function(e) {
    const mouseX = e.offsetX;
    let closest = null;
    let minDist = Infinity;
    barPositions.forEach(b => {
      const dist = Math.abs(b.x - mouseX);
      if (dist < minDist && dist < groupSlot * 0.7) {
        minDist = dist;
        closest = b;
      }
    });

    const tip = document.getElementById('expense-chart-tooltip');
    if (tip && closest) {
      tip.style.left = `${Math.min(Math.max(closest.x - 90, 10), width - 200)}px`;
      tip.style.top = `10px`;
      tip.style.display = 'block';
      tip.innerHTML = `
        <div class="chart-tooltip-title">${closest.fullDate}</div>
        <div class="chart-tooltip-row">
          <span style="color:#10b981; font-weight:600;">■ Collected:</span>
          <strong>${formatCurrency(closest.collected)}</strong>
        </div>
        <div class="chart-tooltip-row">
          <span style="color:#f43f5e; font-weight:600;">■ Expenses:</span>
          <strong>${formatCurrency(closest.expenses)}</strong>
        </div>
        <div class="chart-tooltip-row">
          <span style="color:#205646; font-weight:700;">■ Net Profit:</span>
          <strong>${formatCurrency(closest.profit)}</strong>
        </div>
      `;
    } else if (tip) {
      tip.style.display = 'none';
    }
  };

  canvas.onmouseleave = function() {
    const tip = document.getElementById('expense-chart-tooltip');
    if (tip) tip.style.display = 'none';
  };
}

// ==========================================================================
// 5. EXPORT EXPENSES CSV
// ==========================================================================
function exportExpensesCsv() {
  if (!currentExpenses || currentExpenses.length === 0) {
    if (typeof showToast === 'function') showToast('No expenses to export', 'warning');
    return;
  }

  const headers = ['Date', 'Title', 'Category', 'Payment Method', 'Amount (INR)', 'Notes'];
  const rows = currentExpenses.map(e => [
    `"${e.expenseDate || ''}"`,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.paymentMethod || '').replace(/"/g, '""')}"`,
    (e.amount || 0).toFixed(2),
    `"${(e.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `InvoiceMate_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === 'function') showToast('Expenses exported successfully!', 'success');
}
