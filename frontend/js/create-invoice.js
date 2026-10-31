// js/create-invoice.js

let items = [];
let editingInvoiceId = null;
let autoSaveTimer = null;
let customers = [];
let products = [];

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  await Promise.all([
    loadCustomers(),
    loadProducts(),
    loadUserSettings()
  ]);

  if (id) {
    await loadInvoiceForEditing(id);
  } else {
    // New invoice defaults
    generateDefaultInvoiceInfo();
  }

  setupEventListeners();
  updatePreview();
});

function checkAIDraft() {
  const raw = sessionStorage.getItem('aiInvoiceDraft');
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    sessionStorage.removeItem('aiInvoiceDraft');
    
    const custSelect = document.getElementById('customer-select');
    if (draft.clientName) {
      const match = customers.find(c => c.name.toLowerCase() === draft.clientName.toLowerCase());
      if (match && custSelect) {
        custSelect.value = match.id;
      } else {
        if (custSelect) custSelect.value = 'new';
        const nameField = document.getElementById('cust-name');
        if (nameField) nameField.value = draft.clientName;
      }
    }

    if (draft.gstPercent !== undefined && document.getElementById('gst-rate')) {
      document.getElementById('gst-rate').value = draft.gstPercent;
    }
    if (draft.notes && document.getElementById('notes')) {
      document.getElementById('notes').value = draft.notes;
    }

    if (draft.items && draft.items.length > 0) {
      items = draft.items;
      rebuildItemsTable();
      calculateTotals();
    }

    if (typeof showToast === 'function') {
      showToast('✨ AI Invoice Draft loaded! Review details below.', 'success');
    }
  } catch(e) {
    console.error('Error loading AI draft', e);
  }
}

async function loadCustomers() {
  try {
    customers = await apiRequest('GET', '/api/customers') || [];
    const select = document.getElementById('customer-select');
    if (select) {
      customers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error('Failed to load customers');
  }
}

async function loadProducts() {
  try {
    products = await apiRequest('GET', '/api/products') || [];
    const select = document.getElementById('product-select');
    if (select) {
      select.innerHTML = '<option value="">Select from catalog...</option><option value="manual">Manual Entry</option>';
      products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.name + ' - ₹' + Number(p.price || 0).toFixed(2);
        select.appendChild(option);
      });
    }
    renderCustomCatalogList(products);
  } catch (e) {
    console.error('Failed to load products');
  }
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

function renderCustomCatalogList(list) {
  const container = document.getElementById('catalog-product-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (!list || list.length === 0) {
    container.innerHTML = '<div style="padding: 14px 12px; font-size: 12.5px; color: #94a3b8; text-align: center;">No saved items in catalog</div>';
    return;
  }

  list.forEach(p => {
    const itemEl = document.createElement('div');
    itemEl.className = 'catalog-opt-item';
    itemEl.dataset.id = p.id;
    itemEl.innerHTML = `
      <div class="opt-left">
        <span class="opt-icon">📦</span>
        <div>
          <div class="opt-name">${escapeHtml(p.name)}</div>
          ${p.hsnSacCode ? `<div class="opt-hsn">HSN/SAC: ${escapeHtml(p.hsnSacCode)}</div>` : ''}
        </div>
      </div>
      <span class="opt-price">₹${Number(p.price || 0).toFixed(2)}</span>
    `;
    itemEl.addEventListener('click', () => {
      selectCatalogProduct(p);
    });
    container.appendChild(itemEl);
  });
}

function selectCatalogProduct(p) {
  const nameEl = document.getElementById('item-name');
  const priceEl = document.getElementById('item-price');
  const hsnEl = document.getElementById('item-hsn');
  const qtyEl = document.getElementById('item-qty');
  const hiddenSelect = document.getElementById('product-select');
  const labelEl = document.getElementById('catalog-btn-label');
  const priceBadge = document.getElementById('catalog-btn-price');
  const popover = document.getElementById('catalog-popover');
  const trigger = document.getElementById('catalog-picker-trigger');

  if (p) {
    if (nameEl) nameEl.value = p.name;
    if (priceEl) priceEl.value = p.price;
    if (hsnEl) hsnEl.value = p.hsnSacCode || '';
    if (qtyEl && (!qtyEl.value || Number(qtyEl.value) <= 0)) qtyEl.value = '1';
    if (hiddenSelect) hiddenSelect.value = p.id;

    if (labelEl) labelEl.textContent = p.name;
    if (priceBadge) {
      priceBadge.textContent = '₹' + Number(p.price || 0).toFixed(2);
      priceBadge.style.display = 'inline-block';
    }

    // Auto-apply default GST if product has it
    if (p.defaultGstPercent !== null && p.defaultGstPercent !== undefined) {
      const gstEl = document.getElementById('gst-rate');
      if (gstEl && (!gstEl.value || gstEl.value === '0')) {
        gstEl.value = p.defaultGstPercent;
        calculateTotals();
      }
    }

    // Flash visual highlight
    [nameEl, priceEl, hsnEl].forEach(el => {
      if (el) {
        el.classList.remove('field-highlight-flash');
        void el.offsetWidth;
        el.classList.add('field-highlight-flash');
      }
    });

    updateLiveItemSubtotal();
  } else {
    // Manual
    if (hiddenSelect) hiddenSelect.value = 'manual';
    if (labelEl) labelEl.textContent = 'Manual Entry';
    if (priceBadge) priceBadge.style.display = 'none';
  }

  if (popover) popover.classList.remove('show');
  if (trigger) trigger.classList.remove('active');
}

function updateLiveItemSubtotal() {
  const qty = Number(document.getElementById('item-qty')?.value) || 0;
  const price = Number(document.getElementById('item-price')?.value) || 0;
  const total = qty * price;
  const totalEl = document.getElementById('builder-live-item-total');
  if (totalEl) {
    totalEl.textContent = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function initCatalogCustomDropdown() {
  const trigger = document.getElementById('catalog-picker-trigger');
  const popover = document.getElementById('catalog-popover');
  const searchInput = document.getElementById('catalog-search-input');
  const root = document.getElementById('catalog-dropdown-root');
  const manualOpt = document.querySelector('.catalog-opt-item.manual');

  if (trigger && popover) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = popover.classList.contains('show');
      if (isOpen) {
        popover.classList.remove('show');
        trigger.classList.remove('active');
      } else {
        popover.classList.add('show');
        trigger.classList.add('active');
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
          renderCustomCatalogList(products);
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (root && !root.contains(e.target)) {
        popover.classList.remove('show');
        trigger.classList.remove('active');
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.hsnSacCode && p.hsnSacCode.toLowerCase().includes(q))
      );
      renderCustomCatalogList(filtered);
    });
  }

  if (manualOpt) {
    manualOpt.addEventListener('click', () => {
      selectCatalogProduct(null);
    });
  }

  // Live item total calculation
  document.getElementById('item-qty')?.addEventListener('input', updateLiveItemSubtotal);
  document.getElementById('item-price')?.addEventListener('input', updateLiveItemSubtotal);
}

async function loadUserSettings() {
  try {
    const settings = await apiRequest('GET', '/api/settings');
    if (settings) {
      localStorage.setItem('bizSettings', JSON.stringify(settings));
      if (settings.logoPath) {
        localStorage.setItem('userLogo', settings.logoPath);
      }
      if (settings.businessName) {
        localStorage.setItem('businessName', settings.businessName);
      }
      
      const bizNameInput = document.getElementById('inv-biz-name');
      if (bizNameInput && !bizNameInput.value) {
        bizNameInput.value = settings.businessName || localStorage.getItem('businessName') || '';
      }

      const upiInput = document.getElementById('inv-upi-id');
      if (upiInput && !upiInput.value) {
        upiInput.value = settings.upiId || localStorage.getItem('userUpiId') || '';
      }
      
      if (!editingInvoiceId) {
        const gstInput = document.getElementById('gst-rate');
        if (gstInput && (settings.defaultGst !== undefined || settings.defaultGstRate !== undefined)) {
          gstInput.value = settings.defaultGst !== undefined ? settings.defaultGst : settings.defaultGstRate;
        }
        if (settings.defaultNotes) {
          const notesEl = document.getElementById('notes');
          if (notesEl && !notesEl.value) notesEl.value = settings.defaultNotes;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load settings');
  }
}

function generateDefaultInvoiceInfo() {
  const numInput = document.getElementById('inv-number') || document.getElementById('invoice-number');
  if (numInput) numInput.value = 'INV-' + String(Math.floor(1000 + Math.random() * 9000));
  
  const dateInput = document.getElementById('inv-date') || document.getElementById('invoice-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  
  const dueInput = document.getElementById('due-date');
  if (dueInput) {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    dueInput.value = d.toISOString().split('T')[0];
  }
}

function setupEventListeners() {
  initCatalogCustomDropdown();
  setupBarcodeScanner();
  const custSelect = document.getElementById('customer-select');
  if (custSelect) {
    custSelect.addEventListener('change', () => {
      updatePreview();
      triggerAutoSave();
    });
  }

  const prodSelect = document.getElementById('product-select');
  if (prodSelect) {
    prodSelect.addEventListener('change', (e) => {
      const pId = e.target.value;
      const p = products.find(x => String(x.id) === String(pId));
      if (p) {
        document.getElementById('item-name').value = p.name;
        document.getElementById('item-price').value = p.price;
        const hsnEl = document.getElementById('item-hsn');
        if (hsnEl) hsnEl.value = p.hsnSacCode || '';
        if (p.defaultGstPercent !== null && p.defaultGstPercent !== undefined) {
          const gstEl = document.getElementById('gst-rate');
          if (gstEl && (!gstEl.value || gstEl.value === '0')) {
            gstEl.value = p.defaultGstPercent;
            calculateTotals();
          }
        }
      }
    });
  }

  document.getElementById('add-item-btn')?.addEventListener('click', addItem);
  document.getElementById('cancel-edit-item-btn')?.addEventListener('click', cancelItemEdit);
  
  // Enter key in builder fields adds/updates item
  ['item-name', 'item-hsn', 'item-qty', 'item-price'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItem();
      }
    });
  });
  
  const discountInput = document.getElementById('discount');
  if (discountInput) discountInput.addEventListener('input', () => { calculateTotals(); updatePreview(); triggerAutoSave(); });
  
  const gstInput = document.getElementById('gst-rate');
  if (gstInput) gstInput.addEventListener('change', () => { calculateTotals(); updatePreview(); triggerAutoSave(); });

  const advanceInput = document.getElementById('advance-paid');
  if (advanceInput) advanceInput.addEventListener('input', () => { calculateTotals(); updatePreview(); triggerAutoSave(); });

  const templateSelector = document.getElementById('template-selector');
  if (templateSelector) templateSelector.addEventListener('change', updatePreview);

  document.getElementById('save-draft-btn')?.addEventListener('click', () => saveInvoice(true));
  document.getElementById('generate-btn')?.addEventListener('click', () => saveInvoice(false));

  // Live preview + Auto-save triggers
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', () => {
      updatePreview();
      triggerAutoSave();
    });
  });
}

let editingItemIndex = -1;

function editItem(index) {
  if (index < 0 || index >= items.length) return;
  const item = items[index];
  editingItemIndex = index;

  const nameInput = document.getElementById('item-name');
  const qtyInput = document.getElementById('item-qty');
  const priceInput = document.getElementById('item-price');
  const hsnInput = document.getElementById('item-hsn');
  const prodSelect = document.getElementById('product-select');
  const labelEl = document.getElementById('catalog-btn-label');
  const priceBadge = document.getElementById('catalog-btn-price');
  const addBtn = document.getElementById('add-item-btn');
  const cancelBtn = document.getElementById('cancel-edit-item-btn');
  const builderTitle = document.querySelector('.builder-header-title');

  if (nameInput) nameInput.value = item.name || '';
  if (qtyInput) qtyInput.value = item.quantity || 1;
  if (priceInput) priceInput.value = item.price !== undefined ? item.price : '';
  if (hsnInput) hsnInput.value = item.hsnSacCode || '';

  if (item.productId && Array.isArray(products)) {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      if (prodSelect) prodSelect.value = prod.id;
      if (labelEl) labelEl.textContent = prod.name;
      if (priceBadge) {
        priceBadge.textContent = '₹' + Number(prod.price || 0).toFixed(2);
        priceBadge.style.display = 'inline-block';
      }
    } else {
      if (prodSelect) prodSelect.value = 'manual';
      if (labelEl) labelEl.textContent = 'Manual Entry';
      if (priceBadge) priceBadge.style.display = 'none';
    }
  } else {
    if (prodSelect) prodSelect.value = 'manual';
    if (labelEl) labelEl.textContent = 'Manual Entry';
    if (priceBadge) priceBadge.style.display = 'none';
  }

  if (addBtn) {
    addBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>Update Item</span>
    `;
    addBtn.style.background = '#059669';
  }

  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  if (builderTitle) builderTitle.textContent = `Edit Line Item #${index + 1}`;

  updateLiveItemSubtotal();
  rebuildItemsTable();

  // Smooth scroll and focus
  const builderCard = document.querySelector('.invoza-item-builder-card');
  if (builderCard) {
    builderCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    nameInput?.focus();
  }
}

function cancelItemEdit() {
  resetItemBuilder();
  rebuildItemsTable();
}

function resetItemBuilder() {
  editingItemIndex = -1;
  const nameInput = document.getElementById('item-name');
  const qtyInput = document.getElementById('item-qty');
  const priceInput = document.getElementById('item-price');
  const hsnInput = document.getElementById('item-hsn');
  const prodSelect = document.getElementById('product-select');
  const labelEl = document.getElementById('catalog-btn-label');
  const priceBadge = document.getElementById('catalog-btn-price');
  const addBtn = document.getElementById('add-item-btn');
  const cancelBtn = document.getElementById('cancel-edit-item-btn');
  const builderTitle = document.querySelector('.builder-header-title');
  const liveTotal = document.getElementById('builder-live-item-total');

  if (nameInput) nameInput.value = '';
  if (qtyInput) qtyInput.value = '1';
  if (priceInput) priceInput.value = '';
  if (hsnInput) hsnInput.value = '';
  if (prodSelect) prodSelect.value = '';
  if (labelEl) labelEl.textContent = 'Fill from Product Catalog';
  if (priceBadge) priceBadge.style.display = 'none';
  if (liveTotal) liveTotal.textContent = '₹0.00';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (builderTitle) builderTitle.textContent = 'Add Line Item';

  if (addBtn) {
    addBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>Add Line Item</span>
    `;
    addBtn.style.background = '';
  }
}

function addItem() {
  const name = document.getElementById('item-name').value.trim();
  const qty = Number(document.getElementById('item-qty').value);
  const price = Number(document.getElementById('item-price').value);
  const hsn = document.getElementById('item-hsn')?.value.trim() || '';
  const prodSelect = document.getElementById('product-select');
  const pId = prodSelect ? prodSelect.value : null;

  if (!name || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
    if (typeof showToast === 'function') showToast('Please enter a valid item name, quantity and rate', 'error');
    return;
  }

  const itemData = {
    name: name,
    hsnSacCode: hsn,
    quantity: qty,
    price: price,
    total: qty * price,
    productId: pId && pId !== '' && pId !== 'manual' ? Number(pId) : null
  };

  if (editingItemIndex >= 0 && editingItemIndex < items.length) {
    items[editingItemIndex] = itemData;
    if (typeof showToast === 'function') showToast('Line item updated successfully!', 'success');
  } else {
    items.push(itemData);
    if (typeof showToast === 'function') showToast('Line item added!', 'success');
  }

  resetItemBuilder();
  rebuildItemsTable();
  calculateTotals();
  updatePreview();
  triggerAutoSave();
}

function removeItem(index) {
  if (editingItemIndex === index) {
    resetItemBuilder();
  } else if (editingItemIndex > index) {
    editingItemIndex--;
  }
  items.splice(index, 1);
  rebuildItemsTable();
  calculateTotals();
  updatePreview();
  triggerAutoSave();
}

function rebuildItemsTable() {
  const tbody = document.getElementById('items-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  items.forEach((item, index) => {
    const isEditingThis = editingItemIndex === index;
    const tr = document.createElement('tr');
    if (isEditingThis) {
      tr.style.backgroundColor = 'rgba(32, 86, 70, 0.08)';
      tr.style.outline = '1px solid rgba(32, 86, 70, 0.35)';
    }
    tr.innerHTML = `
      <td>
        <span style="font-weight: 500; color: #1e293b;">${escapeHtml(item.name)}</span>
        ${isEditingThis ? '<span style="margin-left: 8px; font-size: 11px; padding: 2px 7px; border-radius: 4px; background: #205646; color: #fff; font-weight: 500;">Editing</span>' : ''}
      </td>
      <td style="text-align: center; color: var(--color-text-tertiary); font-family: monospace; font-size: 12px; white-space: nowrap;">${escapeHtml(item.hsnSacCode) || '-'}</td>
      <td style="text-align: center; white-space: nowrap;">${item.quantity}</td>
      <td style="text-align: right; white-space: nowrap;">${formatCurrency(item.price)}</td>
      <td style="text-align: right; font-weight: 600; white-space: nowrap;">${formatCurrency(item.total)}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button type="button" onclick="editItem(${index})" class="btn btn-sm" style="background: rgba(32, 86, 70, 0.1); color: #205646; border: 1px solid rgba(32, 86, 70, 0.25); padding: 3px 8px; font-size: 12px; margin-right: 4px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;" title="Edit this line item">
          ✏️ Edit
        </button>
        <button type="button" onclick="removeItem(${index})" class="btn btn-sm btn-danger" style="padding: 3px 7px; border-radius: 6px; cursor: pointer;" title="Delete this line item">
          &times;
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editItem = editItem;
window.cancelItemEdit = cancelItemEdit;
window.removeItem = removeItem;

function calculateTotals() {
  let subtotal = 0;
  items.forEach(i => subtotal += i.total);
  
  const discountPercent = Number(document.getElementById('discount')?.value) || 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  
  const gstPercent = Number(document.getElementById('gst-rate')?.value) || 0;
  const gstAmount = afterDiscount * (gstPercent / 100);
  
  const grandTotal = afterDiscount + gstAmount;
  const advancePaid = Number(document.getElementById('advance-paid')?.value) || 0;
  const balanceDue = Math.max(0, grandTotal - advancePaid);

  if(document.getElementById('subtotal-display')) document.getElementById('subtotal-display').textContent = formatCurrency(subtotal);
  if(document.getElementById('discount-display')) document.getElementById('discount-display').textContent = formatCurrency(discountAmount);
  if(document.getElementById('gst-display')) document.getElementById('gst-display').textContent = formatCurrency(gstAmount);
  if(document.getElementById('grand-total-display')) document.getElementById('grand-total-display').textContent = formatCurrency(grandTotal);

  const advanceRow = document.getElementById('advance-display-row');
  const advanceDisplay = document.getElementById('advance-display');
  const balanceDisplay = document.getElementById('balance-due-display');

  if (advanceRow && advanceDisplay && balanceDisplay) {
    if (advancePaid > 0) {
      advanceRow.style.display = 'flex';
      advanceDisplay.textContent = '-' + formatCurrency(advancePaid);
      balanceDisplay.textContent = formatCurrency(balanceDue);
    } else {
      advanceRow.style.display = 'none';
      balanceDisplay.textContent = formatCurrency(grandTotal);
    }
  }
}

function updatePreview() {
  const preview = document.getElementById('invoice-preview');
  if (!preview) return;

  const tplSelect = document.getElementById('template-selector');
  const tplName = tplSelect ? tplSelect.value : 'modern';

  let bizSettings = {};
  try {
    bizSettings = JSON.parse(localStorage.getItem('bizSettings') || '{}');
  } catch(e){}

  const custSelect = document.getElementById('customer-select');
  let custName = document.getElementById('cust-name')?.value || 'Client Name';
  let custEmail = document.getElementById('cust-email')?.value || '';
  let custPhone = document.getElementById('cust-phone')?.value || '';
  let custAddress = document.getElementById('cust-address')?.value || '';

  if (custSelect && custSelect.value && custSelect.value !== 'new') {
    const c = customers.find(x => String(x.id) === String(custSelect.value));
    if (c) {
      custName = c.name;
      custEmail = c.email || '';
      custPhone = c.phone || '';
      custAddress = c.address || '';
    }
  }

  const rawDate = (document.getElementById('inv-date') || document.getElementById('invoice-date'))?.value;
  const invNum = (document.getElementById('inv-number') || document.getElementById('invoice-number'))?.value || 'INV-0001';
  const invDate = formatDate(rawDate) || '-';
  const dueDate = formatDate(document.getElementById('due-date')?.value) || '-';
  const notes = document.getElementById('notes')?.value || '';

  let subtotal = 0;
  items.forEach(i => subtotal += i.total);
  const discountPercent = Number(document.getElementById('discount')?.value) || 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const gstPercent = Number(document.getElementById('gst-rate')?.value) || 0;
  const gstAmount = afterDiscount * (gstPercent / 100);
  const grandTotal = afterDiscount + gstAmount;
  const advancePaid = Number(document.getElementById('advance-paid')?.value) || 0;

  const customBizName = document.getElementById('inv-biz-name')?.value;
  const activeBizName = customBizName || bizSettings.businessName || localStorage.getItem('businessName') || 'My Business';
  const upiId = document.getElementById('inv-upi-id')?.value?.trim() || bizSettings.upiId || localStorage.getItem('userUpiId') || '';

  renderInvoiceTemplate(preview, tplName, {
    docTitle: 'INVOICE',
    docNumber: invNum,
    docDate: invDate,
    dueDate: dueDate,
    dueLabel: 'Due Date',
    bizName: activeBizName,
    bizAddress: bizSettings.businessAddress || 'India',
    bizPhone: bizSettings.businessPhone || '+91 98765 43210',
    bizEmail: bizSettings.businessEmail || localStorage.getItem('userEmail') || '',
    logoUrl: bizSettings.logoPath || localStorage.getItem('userLogo') || '',
    upiId: upiId,
    customerName: custName,
    customerEmail: custEmail,
    customerPhone: custPhone,
    customerAddress: custAddress,
    notes: notes,
    items: items,
    subtotal: subtotal,
    discountAmount: discountAmount,
    gstAmount: gstAmount,
    grandTotal: grandTotal,
    amountPaid: advancePaid,
    advancePaid: advancePaid
  });
}

function triggerAutoSave() {
  if (!editingInvoiceId) return; // Only auto-save if we're editing an existing draft
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    // Only auto-save if valid
    const custId = document.getElementById('customer-select')?.value;
    if (items.length > 0 && custId && custId !== 'new') {
      saveInvoice(true, true);
    }
  }, 30000);
}

async function saveInvoice(isDraft, isAutoSave = false) {
  const custSelect = document.getElementById('customer-select');
  let customerId = custSelect ? custSelect.value : null;

  if (items.length === 0) {
    if(!isAutoSave && typeof showToast === 'function') showToast('Add at least one item', 'error');
    return;
  }
  
  if (!customerId || customerId === 'new') {
    if(!isAutoSave && typeof showToast === 'function') showToast('Please select or create a customer', 'error');
    return;
  }

  const payload = {
    customerId: Number(customerId),
    invoiceNumber: (document.getElementById('inv-number') || document.getElementById('invoice-number'))?.value?.trim() || null,
    businessName: document.getElementById('inv-biz-name')?.value || null,
    upiId: document.getElementById('inv-upi-id')?.value?.trim() || null,
    invoiceDate: (document.getElementById('inv-date') || document.getElementById('invoice-date'))?.value,
    dueDate: document.getElementById('due-date')?.value,
    discountPercent: Number(document.getElementById('discount')?.value) || 0,
    gstPercent: Number(document.getElementById('gst-rate')?.value) || 0,
    amountPaid: Number(document.getElementById('advance-paid')?.value) || 0,
    template: document.getElementById('template-selector')?.value || 'modern',
    notes: document.getElementById('notes')?.value || '',
    isDraft: isDraft,
    items: items.map(i => ({
      productId: i.productId,
      name: i.name,
      hsnSacCode: i.hsnSacCode || null,
      quantity: i.quantity,
      price: i.price
    }))
  };

  try {
    let resp;
    if (editingInvoiceId) {
      resp = await apiRequest('PUT', `/api/invoices/${editingInvoiceId}`, payload);
    } else {
      resp = await apiRequest('POST', '/api/invoices', payload);
      if (isDraft && resp && resp.id) {
        editingInvoiceId = resp.id;
      }
    }
    
    if (!isAutoSave) {
      if(typeof showToast === 'function') showToast(isDraft ? 'Draft saved' : 'Invoice created', 'success');
      if (!isDraft && resp && resp.id) {
        window.location.href = `invoice-detail.html?id=${resp.id}`;
      }
    }
  } catch (error) {
    if(!isAutoSave && typeof showToast === 'function') showToast(error.message, 'error');
  }
}

async function loadInvoiceForEditing(id) {
  try {
    const data = await apiRequest('GET', `/api/invoices/${id}`);
    editingInvoiceId = id;
    
    document.title = 'Edit Invoice | InvoiceMate';
    const genBtn = document.getElementById('generate-btn');
    if (genBtn) genBtn.textContent = 'Update Invoice';

    if (data.businessName && document.getElementById('inv-biz-name')) {
      document.getElementById('inv-biz-name').value = data.businessName;
    }

    if (data.upiId && document.getElementById('inv-upi-id')) {
      document.getElementById('inv-upi-id').value = data.upiId;
    }

    if (document.getElementById('customer-select')) document.getElementById('customer-select').value = data.customerId;
    const numEl = document.getElementById('inv-number') || document.getElementById('invoice-number');
    if (numEl) numEl.value = data.invoiceNumber;
    const dateEl = document.getElementById('inv-date') || document.getElementById('invoice-date');
    if (dateEl) dateEl.value = data.invoiceDate ? data.invoiceDate.substring(0,10) : '';
    if (document.getElementById('due-date')) document.getElementById('due-date').value = data.dueDate ? data.dueDate.substring(0,10) : '';
    if (document.getElementById('discount')) document.getElementById('discount').value = data.discountPercent || 0;
    if (document.getElementById('gst-rate')) document.getElementById('gst-rate').value = data.gstPercent || 0;
    if (document.getElementById('advance-paid')) document.getElementById('advance-paid').value = data.amountPaid || 0;
    if (document.getElementById('template-selector')) document.getElementById('template-selector').value = data.template || 'modern';
    
    items = (data.items || []).map(i => ({
      name: i.name,
      hsnSacCode: i.hsnSacCode || '',
      quantity: i.quantity,
      price: i.price,
      total: (i.quantity || 1) * (i.price || 0),
      productId: i.productId || null
    }));
    rebuildItemsTable();
    calculateTotals();
  } catch (error) {
    if(typeof showToast === 'function') showToast('Failed to load invoice', 'error');
  }
}


// ==========================================
// BARCODE SCANNER LOGIC FOR INVOICE CREATION
// ==========================================

let scannerMediaStream = null;
let barcodeDetectorInstance = null;
let scanFrameInterval = null;

function setupBarcodeScanner() {
  document.getElementById('btn-open-barcode-scanner')?.addEventListener('click', openBarcodeScannerModal);
  document.getElementById('close-barcode-scanner-modal')?.addEventListener('click', closeBarcodeScannerModal);
  document.getElementById('btn-done-scanning')?.addEventListener('click', closeBarcodeScannerModal);

  const scanInput = document.getElementById('barcode-scanner-input');
  if (scanInput) {
    scanInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = scanInput.value.trim();
        if (code) handleScannedBarcode(code);
      }
    });
  }

  document.getElementById('btn-submit-scanned-barcode')?.addEventListener('click', () => {
    const code = document.getElementById('barcode-scanner-input')?.value.trim();
    if (code) handleScannedBarcode(code);
  });
}

function openBarcodeScannerModal() {
  const modal = document.getElementById('barcode-scanner-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.style.display = 'flex';

  const countEl = document.getElementById('scanner-invoice-item-count');
  if (countEl) countEl.textContent = items.length;

  const scanInput = document.getElementById('barcode-scanner-input');
  if (scanInput) {
    scanInput.value = '';
    setTimeout(() => scanInput.focus(), 150);
  }

  startCameraScanner();
}

function closeBarcodeScannerModal() {
  const modal = document.getElementById('barcode-scanner-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  stopCameraScanner();
}

async function startCameraScanner() {
  const videoEl = document.getElementById('barcode-video-stream');
  const fallbackEl = document.getElementById('scanner-camera-fallback');

  if (fallbackEl) fallbackEl.style.display = 'none';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (fallbackEl) fallbackEl.style.display = 'block';
    return;
  }

  try {
    scannerMediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });

    if (videoEl) {
      videoEl.srcObject = scannerMediaStream;
      videoEl.play();
    }

    // Initialize BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetectorInstance = new BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a'] });
      } catch(e) {
        barcodeDetectorInstance = null;
      }
    }

    if (barcodeDetectorInstance && videoEl) {
      scanFrameInterval = setInterval(async () => {
        if (!videoEl.videoWidth) return;
        try {
          const detected = await barcodeDetectorInstance.detect(videoEl);
          if (detected && detected.length > 0) {
            const rawVal = detected[0].rawValue;
            if (rawVal) {
              handleScannedBarcode(rawVal);
            }
          }
        } catch(err) {
          // Frame drop or detection skip
        }
      }, 350);
    }
  } catch (err) {
    console.warn('Camera access error:', err);
    if (fallbackEl) fallbackEl.style.display = 'block';
  }
}

function stopCameraScanner() {
  if (scanFrameInterval) {
    clearInterval(scanFrameInterval);
    scanFrameInterval = null;
  }
  if (scannerMediaStream) {
    scannerMediaStream.getTracks().forEach(track => track.stop());
    scannerMediaStream = null;
  }
  const videoEl = document.getElementById('barcode-video-stream');
  if (videoEl) videoEl.srcObject = null;
}

function playCheckoutBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1760; // 1760 Hz crisp POS checkout tone
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch(e) {}
}

let lastScannedCode = '';
let lastScannedTime = 0;

function handleScannedBarcode(rawCode) {
  const code = String(rawCode || '').trim();
  if (!code) return;

  // Prevent duplicate accidental double-triggering within 1.2s for camera frames
  const now = Date.now();
  if (code === lastScannedCode && (now - lastScannedTime < 1200)) {
    return;
  }
  lastScannedCode = code;
  lastScannedTime = now;

  const cleanCode = code.toLowerCase();

  // Search product in catalog
  const matched = (Array.isArray(products) ? products : []).find(p => {
    const sku = (p.sku || '').toLowerCase();
    const idStr = String(p.id);
    const name = (p.name || '').toLowerCase();
    return sku === cleanCode || idStr === cleanCode || name === cleanCode;
  });

  if (!matched) {
    if (typeof showToast === 'function') {
      showToast(`No product found matching barcode: "${code}"`, 'warning');
    }
    return;
  }

  // Play audio confirmation
  playCheckoutBeep();

  // Check if item is already added to invoice
  const existingIdx = items.findIndex(i => {
    return (i.productId && i.productId === matched.id) || 
           (matched.sku && i.name.toLowerCase() === matched.name.toLowerCase());
  });

  if (existingIdx !== -1) {
    // Increment quantity
    items[existingIdx].quantity += 1;
    items[existingIdx].total = items[existingIdx].quantity * items[existingIdx].price;
    if (typeof showToast === 'function') {
      showToast(`+1 Added: ${matched.name} (Qty: ${items[existingIdx].quantity})`, 'success');
    }
    editItem(existingIdx); // Populates builder so user can adjust
  } else {
    // Add new line item
    const newItem = {
      name: matched.name,
      hsnSacCode: matched.hsnSacCode || '',
      quantity: 1,
      price: Number(matched.price || 0),
      total: Number(matched.price || 0),
      productId: matched.id
    };
    items.push(newItem);
    if (typeof showToast === 'function') {
      showToast(`✓ Added to Invoice: ${matched.name} (₹${matched.price})`, 'success');
    }
    editItem(items.length - 1); // Populates builder so user can adjust
  }

  // Update modal feedback chip
  const fbBox = document.getElementById('scanner-feedback-box');
  const fbName = document.getElementById('scanner-feedback-name');
  const fbPrice = document.getElementById('scanner-feedback-price');
  if (fbBox && fbName && fbPrice) {
    fbBox.style.display = 'block';
    fbName.textContent = matched.name;
    fbPrice.textContent = '₹' + Number(matched.price || 0).toFixed(2);
  }

  const countEl = document.getElementById('scanner-invoice-item-count');
  if (countEl) countEl.textContent = items.length;

  // Rebuild items table, calculate totals, update preview, trigger auto-save
  rebuildItemsTable();
  calculateTotals();
  updatePreview();
  triggerAutoSave();

  // Reset and autofocus input
  const scanInput = document.getElementById('barcode-scanner-input');
  if (scanInput) {
    scanInput.value = '';
    scanInput.focus();
  }
}
