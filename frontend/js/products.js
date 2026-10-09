// js/products.js — Product & Service Catalog with Inventory Tracking

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
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-secondary" onclick="editProduct(${p.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
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
