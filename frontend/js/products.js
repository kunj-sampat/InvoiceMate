// js/products.js — Product & Service Catalog with Inventory Tracking

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let debounceTimer;
let editingProductId = null;
let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  const searchInput = document.getElementById('product-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(renderFilteredProducts, 200);
    });
  }

  document.getElementById('filter-category')?.addEventListener('change', renderFilteredProducts);
  document.getElementById('filter-stock')?.addEventListener('change', renderFilteredProducts);

  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal(null));
  setupCsvAndBarcodeListeners();
  document.getElementById('save-product-btn')?.addEventListener('click', saveProduct);
  document.getElementById('cancel-product-btn')?.addEventListener('click', closeProductModal);
  document.getElementById('close-product-modal')?.addEventListener('click', closeProductModal);

  const catSelect = document.getElementById('modal-prod-category');
  if (catSelect) {
    catSelect.addEventListener('change', toggleInventoryFields);
  }
});

function toggleInventoryFields() {
  const cat = document.getElementById('modal-prod-category')?.value || 'PRODUCT';
  const invRow = document.getElementById('inventory-fields-row');
  const unitSelect = document.getElementById('modal-prod-unit');
  if (invRow) {
    invRow.style.display = cat === 'SERVICE' ? 'none' : 'flex';
  }
  if (unitSelect && !editingProductId) {
    unitSelect.value = cat === 'SERVICE' ? 'hrs' : 'pcs';
  }
}

async function loadProducts() {
  try {
    const data = await apiRequest('GET', '/api/products');
    allProducts = Array.isArray(data) ? data : [];
    window.allProducts = allProducts;
    updateCatalogSummary(allProducts);
    renderFilteredProducts();
  } catch (error) {
    if (typeof showToast === 'function') showToast('Failed to load catalog', 'error');
  }
}

function updateCatalogSummary(items) {
  const totalItems = items.length;
  const prodCount = items.filter(p => (p.category || 'PRODUCT') !== 'SERVICE').length;
  const servCount = totalItems - prodCount;

  let totalUnits = 0;
  let lowStockCount = 0;
  let totalStockValue = 0;

  items.forEach(p => {
    const isService = (p.category || 'PRODUCT') === 'SERVICE' || p.trackInventory === false;
    if (!isService) {
      const qty = Number(p.stockQuantity || 0);
      const threshold = Number(p.lowStockThreshold ?? 5);
      totalUnits += qty;
      totalStockValue += qty * Number(p.price || 0);
      if (qty <= threshold) {
        lowStockCount++;
      }
    }
  });

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('cat-total-items', totalItems);
  setEl('cat-split-sub', `${prodCount} Products • ${servCount} Services`);
  setEl('cat-total-units', totalUnits.toLocaleString('en-IN'));
  setEl('cat-low-stock', lowStockCount);
  setEl('cat-low-sub', lowStockCount > 0 ? `${lowStockCount} item(s) need attention` : 'All stock healthy');
  setEl('cat-stock-value', formatCurrency(totalStockValue));
}

function renderFilteredProducts() {
  const tbody = document.getElementById('products-body');
  if (!tbody) return;

  const q = (document.getElementById('product-search')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('filter-category')?.value || 'ALL';
  const stockFilter = document.getElementById('filter-stock')?.value || 'ALL';

  const filtered = allProducts.filter(p => {
    const isService = (p.category || 'PRODUCT') === 'SERVICE' || p.trackInventory === false;
    const qty = Number(p.stockQuantity || 0);
    const threshold = Number(p.lowStockThreshold ?? 5);

    if (q) {
      const hay = `${p.name || ''} ${p.sku || ''} ${p.description || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (catFilter === 'PRODUCT' && isService) return false;
    if (catFilter === 'SERVICE' && !isService) return false;

    if (stockFilter !== 'ALL') {
      if (isService) return false;
      if (stockFilter === 'OUT_OF_STOCK' && qty > 0) return false;
      if (stockFilter === 'LOW_STOCK' && (qty === 0 || qty > threshold)) return false;
      if (stockFilter === 'IN_STOCK' && qty <= threshold) return false;
    }

    return true;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 48px 20px; color: var(--color-text-tertiary);">
          No catalog items match your filter. Click <strong>+ Add Item</strong> to add products or services.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(p => {
    const isService = (p.category || 'PRODUCT') === 'SERVICE' || p.trackInventory === false;
    const qty = Number(p.stockQuantity || 0);
    const threshold = Number(p.lowStockThreshold ?? 5);
    const unit = p.unit || (isService ? 'hrs' : 'pcs');

    let statusBadge = '<span class="badge badge-info">Service</span>';
    let stockCell = '<span style="color:var(--color-text-tertiary);font-size:12.5px;">Unlimited</span>';
    let stockValueCell = '<span style="color:var(--color-text-tertiary);">&mdash;</span>';

    if (!isService) {
      if (qty <= 0) {
        statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
      } else if (qty <= threshold) {
        statusBadge = '<span class="badge badge-warning">Low Stock</span>';
      } else {
        statusBadge = '<span class="badge badge-success">In Stock</span>';
      }

      stockCell = `
        <div class="stock-control">
          <button class="stock-btn" onclick="quickAdjustStock(${p.id}, -1)" title="Decrease stock">&minus;</button>
          <span style="min-width: 52px; text-align: center; font-weight: 700;">${qty} <small style="font-weight:500;color:var(--color-text-tertiary);">${unit}</small></span>
          <button class="stock-btn" onclick="quickAdjustStock(${p.id}, 1)" title="Increase stock">+</button>
        </div>
      `;

      stockValueCell = `<strong style="color:var(--color-text);">${formatCurrency(qty * Number(p.price || 0))}</strong>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: var(--color-text);">${p.name}</div>
        ${p.sku ? `<span class="sku-pill">${p.sku}</span>` : ''}
        ${p.description ? `<div style="font-size:12px;color:var(--color-text-tertiary);margin-top:3px;">${p.description}</div>` : ''}
      </td>
      <td>
        <span class="badge ${isService ? 'badge-purple' : 'badge-secondary'}">
          ${isService ? 'Service' : 'Product'}
        </span>
      </td>
      <td>
        <span style="font-family:monospace;font-size:12px;background:var(--color-bg-secondary);padding:3px 7px;border-radius:4px;border:1px solid var(--color-border);">${p.hsnSacCode || '&mdash;'}</span>
      </td>
      <td style="font-weight: 700;">
        ${formatCurrency(p.price)} <span style="font-size:11.5px;font-weight:500;color:var(--color-text-tertiary);">/ ${unit}</span>
      </td>
      <td>${stockCell}</td>
      <td>${statusBadge}</td>
      <td>${stockValueCell}</td>
      <td>
        <div style="display:flex;gap:5px;justify-content:flex-end;white-space:nowrap;">
          <button class="btn btn-sm btn-secondary" onclick="openBarcodeModalById(${p.id})" title="Print Shelf Label & Barcode" style="padding: 3px 8px; font-size: 11.5px;">🏷️ Barcode</button>
          <button class="btn btn-sm btn-secondary" onclick="editProduct(${p.id})" title="Edit Details" style="padding: 3px 8px; font-size: 11.5px;">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})" title="Delete" style="padding: 3px 7px; font-size: 11.5px;">&times;</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function quickAdjustStock(id, delta) {
  try {
    await apiRequest('PATCH', `/api/products/${id}/stock`, { delta });
    await loadProducts();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to update stock', 'error');
  }
}

function openProductModal(product) {
  editingProductId = product ? product.id : null;
  const title = document.getElementById('product-modal-title');
  if (title) title.textContent = product ? 'Edit Catalog Item' : 'Add Catalog Item';

  const cat = product ? (product.category || 'PRODUCT') : 'PRODUCT';
  document.getElementById('modal-prod-category').value = cat;
  document.getElementById('modal-prod-sku').value = product ? (product.sku || '') : `PRD-${String(allProducts.length + 1).padStart(3, '0')}`;
  document.getElementById('modal-prod-name').value = product ? product.name : '';
  document.getElementById('modal-prod-hsn').value = product ? (product.hsnSacCode || '') : '';
  document.getElementById('modal-prod-gst').value = product ? (product.defaultGstPercent || 18) : 18;
  document.getElementById('modal-prod-desc').value = product ? (product.description || '') : '';
  document.getElementById('modal-prod-price').value = product ? product.price : '';
  document.getElementById('modal-prod-unit').value = product ? (product.unit || 'pcs') : 'pcs';
  document.getElementById('modal-prod-stock').value = product ? (product.stockQuantity ?? 10) : 10;
  document.getElementById('modal-prod-threshold').value = product ? (product.lowStockThreshold ?? 5) : 5;

  toggleInventoryFields();

  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'flex';
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'none';
}

async function editProduct(id) {
  const existing = allProducts.find(p => Number(p.id) === Number(id));
  if (existing) {
    openProductModal(existing);
    return;
  }
  try {
    const p = await apiRequest('GET', `/api/products/${id}`);
    openProductModal(p);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to load product', 'error');
  }
}

async function saveProduct() {
  const category = document.getElementById('modal-prod-category').value;
  const sku = document.getElementById('modal-prod-sku').value.trim();
  const name = document.getElementById('modal-prod-name').value.trim();
  const hsnSacCode = document.getElementById('modal-prod-hsn')?.value.trim() || '';
  const defaultGstPercent = Number(document.getElementById('modal-prod-gst')?.value) || 18;
  const description = document.getElementById('modal-prod-desc').value.trim();
  const price = Number(document.getElementById('modal-prod-price').value);
  const unit = document.getElementById('modal-prod-unit').value;
  const stockQuantity = Number(document.getElementById('modal-prod-stock').value) || 0;
  const lowStockThreshold = Number(document.getElementById('modal-prod-threshold').value) || 0;

  if (!name || isNaN(price) || price < 0) {
    if (typeof showToast === 'function') showToast('Please enter a valid name and price', 'error');
    return;
  }

  const payload = {
    name,
    sku,
    category,
    unit,
    hsnSacCode,
    defaultGstPercent,
    description,
    price,
    trackInventory: category !== 'SERVICE',
    stockQuantity: category === 'SERVICE' ? 0 : stockQuantity,
    lowStockThreshold: category === 'SERVICE' ? 0 : lowStockThreshold
  };

  try {
    if (editingProductId) {
      await apiRequest('PUT', `/api/products/${editingProductId}`, payload);
      if (typeof showToast === 'function') showToast('Catalog item updated', 'success');
    } else {
      await apiRequest('POST', '/api/products', payload);
      if (typeof showToast === 'function') showToast('Catalog item added', 'success');
    }
    closeProductModal();
    loadProducts();
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'Save failed', 'error');
  }
}

async function deleteProduct(id) {
  const ok = await showConfirmDialog({
    title: 'Delete Catalog Item?',
    message: 'Are you sure you want to delete this product/service from your catalog?',
    confirmText: 'Delete Item',
    isDanger: true
  });
  if (!ok) return;
  try {
    await apiRequest('DELETE', `/api/products/${id}`);
    if (typeof showToast === 'function') showToast('Item deleted', 'success');
    loadProducts();
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message, 'error');
  }
}

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.quickAdjustStock = quickAdjustStock;


// ==========================================
// CSV IMPORT & EXPORT + BARCODE EXTENSIONS
// ==========================================

let parsedCsvItems = [];

function setupCsvAndBarcodeListeners() {
  document.getElementById('export-products-csv-btn')?.addEventListener('click', exportProductsCSV);
  document.getElementById('import-products-csv-btn')?.addEventListener('click', openImportModal);
  document.getElementById('batch-barcode-btn')?.addEventListener('click', batchPrintBarcodes);

  // Barcode modal close
  document.getElementById('close-barcode-modal')?.addEventListener('click', closeBarcodeModal);
  document.getElementById('cancel-barcode-btn')?.addEventListener('click', closeBarcodeModal);

  // Import modal close
  document.getElementById('close-import-modal')?.addEventListener('click', closeImportModal);
  document.getElementById('cancel-import-btn')?.addEventListener('click', closeImportModal);
  document.getElementById('download-sample-csv-btn')?.addEventListener('click', downloadSampleProductCSV);
  document.getElementById('btn-clear-csv')?.addEventListener('click', clearCsvSelection);
  document.getElementById('confirm-import-btn')?.addEventListener('click', executeCsvImport);

  // Drag & drop zone
  const dropzone = document.getElementById('csv-dropzone');
  const fileInput = document.getElementById('csv-file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleCsvFile(file);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#205646';
      dropzone.style.background = '#f0fdf4';
    });

    ['dragleave', 'dragend'].forEach(evt => {
      dropzone.addEventListener(evt, () => {
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#cbd5e1';
      dropzone.style.background = '#f8fafc';
      const file = e.dataTransfer.files[0];
      if (file) handleCsvFile(file);
    });
  }
}

function closeBarcodeModal() {
  const modal = document.getElementById('barcode-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function openBarcodeModalById(idOrProduct) {
  let p = null;
  if (typeof idOrProduct === 'object' && idOrProduct !== null) {
    p = idOrProduct;
  } else {
    const list = (typeof allProducts !== 'undefined' && Array.isArray(allProducts) && allProducts.length) ? allProducts : (window.allProducts || []);
    p = list.find(x => String(x.id) === String(idOrProduct) || x.sku === idOrProduct);
  }
  if (!p) {
    console.warn('Product not found for barcode modal:', idOrProduct);
    if (typeof showToast === 'function') showToast('Product not found for barcode generation', 'warning');
    return;
  }
  if (typeof window.openBarcodeModal === 'function') {
    window.openBarcodeModal(p);
  } else if (typeof openBarcodeModal === 'function') {
    openBarcodeModal(p);
  }
}

function batchPrintBarcodes() {
  if (!allProducts || allProducts.length === 0) {
    if (typeof showToast === 'function') showToast('No items in catalog to print', 'warning');
    return;
  }
  const physicalOnly = allProducts.filter(p => (p.category || 'PRODUCT') !== 'SERVICE');
  if (physicalOnly.length === 0) {
    if (typeof showToast === 'function') showToast('No physical products with barcodes to print', 'warning');
    return;
  }
  if (typeof executePrintLabels === 'function') {
    executePrintLabels(physicalOnly, 'shelf');
  }
}

function exportProductsCSV() {
  if (!allProducts || allProducts.length === 0) {
    if (typeof showToast === 'function') showToast('No catalog items to export', 'warning');
    return;
  }

  const headers = ['Name', 'SKU', 'Category', 'Unit', 'HSN/SAC', 'Price', 'StockQuantity', 'LowStockThreshold', 'GST%', 'Description'];
  const rows = allProducts.map(p => [
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${p.sku || ''}"`,
    `"${p.category || 'PRODUCT'}"`,
    `"${p.unit || 'pcs'}"`,
    `"${p.hsnSacCode || ''}"`,
    (p.price || 0).toFixed(2),
    p.stockQuantity ?? 0,
    p.lowStockThreshold ?? 5,
    p.defaultGstPercent ?? 18,
    `"${(p.description || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `InvoiceMate_ProductCatalog_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof showToast === 'function') showToast('Catalog exported successfully!', 'success');
}

function downloadSampleProductCSV() {
  const sampleData = [
    'Name,SKU,Category,Unit,HSN/SAC,Price,StockQuantity,LowStockThreshold,GST%,Description',
    '"Premium Ball Pen","PEN-101","PRODUCT","pcs","960810",25.00,100,15,18,"Smooth flowing gel ink ball pen"',
    '"Water Bottle 1L","BOT-202","PRODUCT","pcs","392330",150.00,45,10,18,"BPA-free durable plastic bottle"',
    '"Website Maintenance","SRV-303","SERVICE","hrs","998311",1200.00,0,0,18,"Monthly web uptime & security audit"'
  ].join('\n');

  const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'InvoiceMate_Products_Sample_Template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openImportModal() {
  clearCsvSelection();
  document.getElementById('import-csv-modal')?.classList.add('show');
}

function closeImportModal() {
  document.getElementById('import-csv-modal')?.classList.remove('show');
  clearCsvSelection();
}

function clearCsvSelection() {
  parsedCsvItems = [];
  const fileInput = document.getElementById('csv-file-input');
  if (fileInput) fileInput.value = '';
  const previewBox = document.getElementById('csv-preview-container');
  if (previewBox) previewBox.style.display = 'none';
  const confirmBtn = document.getElementById('confirm-import-btn');
  if (confirmBtn) confirmBtn.disabled = true;
}

function handleCsvFile(file) {
  if (!file.name.endsWith('.csv')) {
    if (typeof showToast === 'function') showToast('Please select a valid .csv file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    parseAndPreviewCSV(text);
  };
  reader.readAsText(file);
}

function parseAndPreviewCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    if (typeof showToast === 'function') showToast('CSV file is empty or missing data rows', 'error');
    return;
  }

  // Parse header
  const headers = splitCsvRow(lines[0]).map(h => h.trim().toLowerCase());
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const skuIdx = headers.findIndex(h => h.includes('sku') || h.includes('code'));
  const catIdx = headers.findIndex(h => h.includes('cat') || h.includes('type'));
  const unitIdx = headers.findIndex(h => h.includes('unit'));
  const hsnIdx = headers.findIndex(h => h.includes('hsn') || h.includes('sac'));
  const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('rate') || h.includes('mrp'));
  const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty'));
  const threshIdx = headers.findIndex(h => h.includes('thresh') || h.includes('alert') || h.includes('min'));
  const gstIdx = headers.findIndex(h => h.includes('gst'));
  const descIdx = headers.findIndex(h => h.includes('desc'));

  if (nameIdx === -1 || priceIdx === -1) {
    if (typeof showToast === 'function') showToast('CSV must include "Name" and "Price" columns', 'error');
    return;
  }

  const existingSkus = new Set(allProducts.map(p => (p.sku || '').trim().toLowerCase()));
  parsedCsvItems = [];
  let newCount = 0;
  let updateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    if (cols.length === 0 || !cols[nameIdx] || !cols[nameIdx].trim()) continue;

    const name = cols[nameIdx].trim();
    const price = parseFloat(cols[priceIdx]) || 0;
    const sku = skuIdx !== -1 && cols[skuIdx] ? cols[skuIdx].trim() : '';
    const category = catIdx !== -1 && cols[catIdx] ? cols[catIdx].trim().toUpperCase() : 'PRODUCT';
    const unit = unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx].trim() : (category === 'SERVICE' ? 'hrs' : 'pcs');
    const hsn = hsnIdx !== -1 && cols[hsnIdx] ? cols[hsnIdx].trim() : '';
    const stock = stockIdx !== -1 ? (parseInt(cols[stockIdx], 10) || 0) : 10;
    const threshold = threshIdx !== -1 ? (parseInt(cols[threshIdx], 10) || 5) : 5;
    const gst = gstIdx !== -1 ? (parseFloat(cols[gstIdx]) || 18) : 18;
    const desc = descIdx !== -1 && cols[descIdx] ? cols[descIdx].trim() : '';

    const isExisting = sku && existingSkus.has(sku.toLowerCase());
    if (isExisting) updateCount++; else newCount++;

    parsedCsvItems.push({
      name,
      sku: sku || `PRD-${String(allProducts.length + parsedCsvItems.length + 1).padStart(3, '0')}`,
      category: category === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
      unit,
      hsnSacCode: hsn,
      price,
      stockQuantity: stock,
      lowStockThreshold: threshold,
      defaultGstPercent: gst,
      description: desc,
      isExisting
    });
  }

  if (parsedCsvItems.length === 0) {
    if (typeof showToast === 'function') showToast('No valid product rows found in CSV', 'error');
    return;
  }

  // Render preview table
  const tbody = document.getElementById('csv-preview-tbody');
  if (tbody) {
    tbody.innerHTML = parsedCsvItems.slice(0, 50).map(item => `
      <tr>
        <td style="padding: 6px 10px; font-weight: 600;">${escapeHtml(item.name)}</td>
        <td style="padding: 6px 10px; font-family: monospace;">${escapeHtml(item.sku)}</td>
        <td style="padding: 6px 10px;"><span class="badge ${item.category === 'SERVICE' ? 'badge-purple' : 'badge-secondary'}" style="font-size: 10px;">${item.category}</span></td>
        <td style="padding: 6px 10px; text-align: right; font-weight: 700;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 6px 10px; text-align: center;">${item.stockQuantity}</td>
        <td style="padding: 6px 10px; text-align: center;">
          <span class="badge ${item.isExisting ? 'badge-info' : 'badge-success'}" style="font-size: 10px;">
            ${item.isExisting ? 'Update' : 'New'}
          </span>
        </td>
      </tr>
    `).join('');
  }

  const summaryEl = document.getElementById('csv-preview-summary');
  if (summaryEl) {
    summaryEl.textContent = `Ready to import ${parsedCsvItems.length} items (${newCount} new, ${updateCount} updates by SKU)`;
  }

  document.getElementById('csv-preview-container').style.display = 'block';
  const confirmBtn = document.getElementById('confirm-import-btn');
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `<span>Import ${parsedCsvItems.length} Items</span>`;
  }
}

function splitCsvRow(row) {
  const result = [];
  let insideQuote = false;
  let entry = '';
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') {
      if (insideQuote && row[i + 1] === '"') {
        entry += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (c === ',' && !insideQuote) {
      result.push(entry.trim());
      entry = '';
    } else {
      entry += c;
    }
  }
  result.push(entry.trim());
  return result;
}

async function executeCsvImport() {
  if (!parsedCsvItems || parsedCsvItems.length === 0) return;
  const btn = document.getElementById('confirm-import-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Importing...</span>';
  }

  try {
    const payload = parsedCsvItems.map(p => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      hsnSacCode: p.hsnSacCode,
      price: p.price,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      defaultGstPercent: p.defaultGstPercent,
      description: p.description,
      trackInventory: p.category !== 'SERVICE'
    }));

    await apiRequest('POST', '/api/products/bulk', payload);
    if (typeof showToast === 'function') {
      showToast(`Successfully imported ${payload.length} products!`, 'success');
    }
    closeImportModal();
    await loadProducts();
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to import items. Please check connection.', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Import Items</span>';
    }
  }
}

window.openBarcodeModalById = openBarcodeModalById;
window.batchPrintBarcodes = batchPrintBarcodes;

window.closeBarcodeModal = closeBarcodeModal;
