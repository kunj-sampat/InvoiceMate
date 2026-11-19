// js/stocks.js — Low Stock Radar & 1-Click Vendor Restock Engine

let allProducts = [];
let activeTab = 'ATTENTION';
let activeRestockProduct = null;
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
  loadRadarData();

  // Tab buttons
  document.querySelectorAll('.radar-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.radar-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderRadarTable();
    });
  });

  // Top summary cards filter shortcuts
  document.getElementById('card-filter-critical')?.addEventListener('click', () => switchTab('OUT_OF_STOCK'));
  document.getElementById('card-filter-warning')?.addEventListener('click', () => switchTab('LOW_STOCK'));
  document.getElementById('card-filter-healthy')?.addEventListener('click', () => switchTab('HEALTHY'));

  // Search input
  const searchInput = document.getElementById('radar-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(renderRadarTable, 200);
    });
  }

  // Export CSV
  document.getElementById('export-radar-btn')?.addEventListener('click', exportRadarCSV);

  // Restock modal triggers
  document.getElementById('close-restock-modal')?.addEventListener('click', closeRestockModal);
  document.getElementById('btn-dispatch-whatsapp')?.addEventListener('click', dispatchWhatsAppRestock);
  document.getElementById('btn-print-po')?.addEventListener('click', printPurchaseOrder);
  document.getElementById('btn-quick-receive-stock')?.addEventListener('click', quickReceiveStock);

  // Set default target date to 7 days from now
  const targetDateInput = document.getElementById('restock-target-date');
  if (targetDateInput) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    targetDateInput.value = d.toISOString().split('T')[0];
  }
});

function switchTab(tabKey) {
  activeTab = tabKey;
  document.querySelectorAll('.radar-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });
  renderRadarTable();
}

async function loadRadarData() {
  const tbody = document.getElementById('radar-table-body');
  try {
    const data = await apiRequest('GET', '/api/products');
    // Only physical products with inventory tracking
    allProducts = (Array.isArray(data) ? data : []).filter(p => {
      return (p.category || 'PRODUCT') !== 'SERVICE' && p.trackInventory !== false;
    });

    updateRadarMetrics();
    renderRadarTable();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to load stock radar data', 'error');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color:#ef4444;">Failed to load radar data. Please refresh.</td></tr>';
    }
  }
}

function updateRadarMetrics() {
  let criticalCount = 0;
  let warningCount = 0;
  let healthyCount = 0;
  let totalUnitsToRecover = 0;

  allProducts.forEach(p => {
    const qty = Number(p.stockQuantity || 0);
    const threshold = Number(p.lowStockThreshold ?? 5);

    if (qty <= 0) {
      criticalCount++;
      totalUnitsToRecover += threshold;
    } else if (qty <= threshold) {
      warningCount++;
      totalUnitsToRecover += (threshold - qty);
    } else {
      healthyCount++;
    }
  });

  const attentionCount = criticalCount + warningCount;

  // Update card numbers
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('radar-count-critical', criticalCount);
  setEl('radar-count-critical-badge', `${criticalCount} Items`);
  setEl('radar-count-warning', warningCount);
  setEl('radar-count-warning-badge', `${warningCount} Items`);
  setEl('radar-count-healthy', healthyCount);
  setEl('radar-count-healthy-badge', `${healthyCount} Items`);

  setEl('tab-count-attention', attentionCount);
  setEl('tab-count-critical', criticalCount);
  setEl('tab-count-warning', warningCount);
  setEl('tab-count-healthy', healthyCount);
  setEl('tab-count-all', allProducts.length);
}

function renderRadarTable() {
  const tbody = document.getElementById('radar-table-body');
  if (!tbody) return;

  const q = (document.getElementById('radar-search')?.value || '').toLowerCase().trim();

  const filtered = allProducts.filter(p => {
    const qty = Number(p.stockQuantity || 0);
    const threshold = Number(p.lowStockThreshold ?? 5);

    if (q) {
      const hay = `${p.name || ''} ${p.sku || ''} ${p.hsnSacCode || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (activeTab === 'ATTENTION') return qty <= threshold;
    if (activeTab === 'OUT_OF_STOCK') return qty <= 0;
    if (activeTab === 'LOW_STOCK') return qty > 0 && qty <= threshold;
    if (activeTab === 'HEALTHY') return qty > threshold;
    return true; // 'ALL'
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 48px 20px; color: var(--color-text-tertiary);">
          ${activeTab === 'ATTENTION' 
            ? '🎉 <strong>All Clear!</strong> No items are currently depleted or below reorder threshold.'
            : 'No inventory items match the current filter.'}
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(p => {
    const qty = Number(p.stockQuantity || 0);
    const threshold = Number(p.lowStockThreshold ?? 5);
    const unit = p.unit || 'pcs';
    const sku = p.sku || `PRD-${String(p.id).padStart(3, '0')}`;
    const rate = Number(p.price || 0);

    // Suggested reorder: enough to reach at least 2x threshold
    const suggestedReorder = Math.max(10, (threshold * 2) - Math.max(0, qty));
    const estCost = suggestedReorder * rate;

    // Progress bar math
    const maxScale = Math.max(1, threshold * 2);
    const pct = Math.min(100, Math.round((qty / maxScale) * 100));

    let statusPill = '';
    let fillClass = 'success';

    if (qty <= 0) {
      statusPill = '<span class="badge badge-danger">Out of Stock</span>';
      fillClass = 'danger';
    } else if (qty <= threshold) {
      statusPill = `<span class="badge badge-warning">Low Stock (${qty} left)</span>`;
      fillClass = 'warning';
    } else {
      statusPill = '<span class="badge badge-success">Healthy Stock</span>';
      fillClass = 'success';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: var(--color-text); font-size: 13.5px;">${escapeHtml(p.name)}</div>
        <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
          <span style="font-family:monospace; font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569;">${escapeHtml(sku)}</span>
          ${p.description ? `<span style="font-size:11.5px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${escapeHtml(p.description)}</span>` : ''}
        </div>
      </td>
      <td>
        <span style="font-size:12px; color:#475569;">${p.hsnSacCode ? `HSN: <strong>${escapeHtml(p.hsnSacCode)}</strong>` : '-'}</span>
        <div style="font-size:11.5px; color:#64748b;">Unit: ${escapeHtml(unit)}</div>
      </td>
      <td style="min-width: 140px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600;">
          <span style="color: ${qty <= 0 ? '#dc2626' : (qty <= threshold ? '#d97706' : '#059669')}; font-weight:800;">${qty} ${unit}</span>
          <span style="color:#64748b;">Min: ${threshold}</span>
        </div>
        <div class="stock-progress-track">
          <div class="stock-progress-fill ${fillClass}" style="width: ${pct}%;"></div>
        </div>
      </td>
      <td>${statusPill}</td>
      <td>
        <span style="font-weight:700; color:#1e293b;">+${suggestedReorder}</span>
        <span style="font-size:11.5px; color:#64748b;">${unit}</span>
      </td>
      <td style="font-weight:700; color:#205646;">
        ${formatCurrency(estCost)}
      </td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn btn-sm btn-primary" onclick="openRestockModal(${p.id})" style="padding: 4px 10px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;" title="1-Click Vendor Restock Order">
          <span>⚡ Restock</span>
        </button>
        <button class="btn btn-sm btn-secondary" onclick="quickIncrementStock(${p.id})" style="padding: 4px 8px; font-size: 12px;" title="Quick Stock-In (+5 units)">
          +5 In
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openRestockModal(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  activeRestockProduct = p;

  const modal = document.getElementById('restock-modal');
  if (!modal) return;

  const qty = Number(p.stockQuantity || 0);
  const threshold = Number(p.lowStockThreshold ?? 5);
  const suggestedReorder = Math.max(10, (threshold * 2) - Math.max(0, qty));

  document.getElementById('modal-restock-prod-name').textContent = p.name;
  document.getElementById('modal-restock-sku').textContent = p.sku || `PRD-${String(p.id).padStart(3, '0')}`;
  document.getElementById('modal-restock-current-stock').textContent = `${qty} ${p.unit || 'pcs'}`;
  document.getElementById('modal-restock-current-stock').style.color = qty <= 0 ? '#dc2626' : (qty <= threshold ? '#d97706' : '#059669');
  document.getElementById('modal-restock-threshold').textContent = `${threshold} ${p.unit || 'pcs'}`;

  document.getElementById('restock-qty').value = suggestedReorder;

  modal.classList.add('show');
}

function closeRestockModal() {
  document.getElementById('restock-modal')?.classList.remove('show');
  activeRestockProduct = null;
}

async function quickIncrementStock(productId) {
  try {
    await apiRequest('PATCH', `/api/products/${productId}/stock`, { delta: 5 });
    if (typeof showToast === 'function') showToast('Added +5 units to stock!', 'success');
    await loadRadarData();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to increment stock', 'error');
  }
}

async function quickReceiveStock() {
  if (!activeRestockProduct) return;
  const qty = parseInt(document.getElementById('restock-qty')?.value || '10', 10);
  if (qty <= 0) {
    if (typeof showToast === 'function') showToast('Please enter a valid received quantity', 'error');
    return;
  }

  try {
    await apiRequest('PATCH', `/api/products/${activeRestockProduct.id}/stock`, { delta: qty });
    if (typeof showToast === 'function') showToast(`✓ Received +${qty} units of ${activeRestockProduct.name}! Stock updated.`, 'success');
    closeRestockModal();
    await loadRadarData();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to update received stock', 'error');
  }
}

function dispatchWhatsAppRestock() {
  if (!activeRestockProduct) return;
  const p = activeRestockProduct;
  const qty = document.getElementById('restock-qty')?.value || '10';
  const targetDate = document.getElementById('restock-target-date')?.value || 'Immediate';
  const vendorName = document.getElementById('restock-vendor-name')?.value.trim() || 'Supplier';
  const vendorPhone = document.getElementById('restock-vendor-phone')?.value.replace(/[^0-9]/g, '');
  const notes = document.getElementById('restock-notes')?.value.trim();
  const bizName = localStorage.getItem('businessName') || 'InvoiceMate Merchant';

  const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}`;

  const message = `*PURCHASE ORDER: ${poNumber}*\n\n` +
    `From: *${bizName}*\n` +
    `To: *${vendorName}*\n\n` +
    `*Order Details:*\n` +
    `- *Item:* ${p.name}\n` +
    `- *SKU / Code:* ${p.sku || '-'}\n` +
    `- *Quantity Required:* ${qty} ${p.unit || 'pcs'}\n` +
    `- *Target Delivery Date:* ${targetDate}\n` +
    (notes ? `- *Notes:* ${notes}\n` : '') +
    `\nPlease confirm receipt of this order along with pricing and dispatch schedule.\n\n` +
    `Thank you.\n\n` +
    `Sincerely,\n*${bizName}*`;

  const encoded = encodeURIComponent(message);
  let url = `https://wa.me/?text=${encoded}`;
  if (vendorPhone && vendorPhone.length >= 10) {
    const formattedPhone = vendorPhone.length === 10 ? `91${vendorPhone}` : vendorPhone;
    url = `https://wa.me/${formattedPhone}?text=${encoded}`;
  }

  window.open(url, '_blank');
  if (typeof showToast === 'function') showToast('WhatsApp Purchase Order draft opened', 'success');
}

function printPurchaseOrder() {
  if (!activeRestockProduct) return;
  const p = activeRestockProduct;
  const qty = parseInt(document.getElementById('restock-qty')?.value || '10', 10);
  const targetDate = document.getElementById('restock-target-date')?.value || new Date().toISOString().split('T')[0];
  const vendorName = document.getElementById('restock-vendor-name')?.value.trim() || 'Valued Supplier';
  const notes = document.getElementById('restock-notes')?.value.trim() || 'Please enclose delivery challan and GST invoice.';
  const bizName = localStorage.getItem('businessName') || 'InvoiceMate Merchant';
  const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}`;
  const rate = Number(p.price || 0);
  const estTotal = qty * rate;

  const poHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 700px; margin: 0 auto; background: #fff;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #205646; padding-bottom: 16px;">
        <div>
          <h2 style="margin: 0; color: #205646; font-size: 24px; font-weight: 900;">${escapeHtml(bizName)}</h2>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">OFFICIAL PURCHASE ORDER</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${poNumber}</div>
          <div style="font-size: 12px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
          <div style="font-size: 12px; color: #64748b;">Expected: ${targetDate}</div>
        </div>
      </div>

      <div style="margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Vendor / Supplier:</span>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(vendorName)}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; font-size: 12px; text-transform: uppercase;">
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Item Description</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">SKU / HSN</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: center;">Qty</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right;">Unit Rate</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right;">Estimated Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${escapeHtml(p.name)}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 12px;">${escapeHtml(p.sku || '-')}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${qty} ${escapeHtml(p.unit || 'pcs')}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${rate.toFixed(2)}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">₹${estTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 24px; font-size: 12.5px; color: #475569; background: #fff; border-left: 3px solid #205646; padding-left: 12px;">
        <strong>Instructions:</strong> ${escapeHtml(notes)}
      </div>

      <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 11px; color: #64748b;">Generated via InvoiceMate Inventory Radar</div>
        </div>
        <div style="text-align: center; border-top: 1px solid #0f172a; width: 180px; padding-top: 6px;">
          <div style="font-size: 12px; font-weight: 700;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(`<html><head><title>Purchase Order ${poNumber}</title></head><body>${poHtml}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  }
}

function exportRadarCSV() {
  if (!allProducts || allProducts.length === 0) {
    if (typeof showToast === 'function') showToast('No inventory items to export', 'warning');
    return;
  }

  const headers = ['Item Name', 'SKU', 'Category', 'Unit', 'Current Stock', 'Low Stock Threshold', 'Status', 'Suggested Reorder', 'Unit Price (INR)', 'Est Reorder Cost (INR)'];
  const rows = allProducts.map(p => {
    const qty = Number(p.stockQuantity || 0);
    const threshold = Number(p.lowStockThreshold ?? 5);
    const suggested = Math.max(10, (threshold * 2) - Math.max(0, qty));
    const status = qty <= 0 ? 'OUT_OF_STOCK' : (qty <= threshold ? 'LOW_STOCK' : 'HEALTHY');
    const cost = (suggested * Number(p.price || 0)).toFixed(2);

    return [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.category || 'PRODUCT'}"`,
      `"${p.unit || 'pcs'}"`,
      qty,
      threshold,
      status,
      suggested,
      (p.price || 0).toFixed(2),
      cost
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `InvoiceMate_LowStock_Radar_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof showToast === 'function') showToast('Stock Radar exported successfully!', 'success');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.openRestockModal = openRestockModal;
window.quickIncrementStock = quickIncrementStock;
