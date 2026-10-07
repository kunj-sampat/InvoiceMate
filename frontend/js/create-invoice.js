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
    checkAIDraft();
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
      products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.name;
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error('Failed to load products');
  }
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
  
  const discountInput = document.getElementById('discount');
  if (discountInput) discountInput.addEventListener('input', () => { calculateTotals(); updatePreview(); triggerAutoSave(); });
  
  const gstInput = document.getElementById('gst-rate');
  if (gstInput) gstInput.addEventListener('change', () => { calculateTotals(); updatePreview(); triggerAutoSave(); });

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

function addItem() {
  const name = document.getElementById('item-name').value;
  const qty = Number(document.getElementById('item-qty').value);
  const price = Number(document.getElementById('item-price').value);
  const hsn = document.getElementById('item-hsn')?.value || '';
  const prodSelect = document.getElementById('product-select');
  const pId = prodSelect ? prodSelect.value : null;

  if (!name || qty <= 0 || price < 0) {
    if(typeof showToast === 'function') showToast('Invalid item details', 'error');
    return;
  }

  items.push({
    name: name,
    hsnSacCode: hsn,
    quantity: qty,
    price: price,
    total: qty * price,
    productId: pId && pId !== '' && pId !== 'manual' ? Number(pId) : null
  });

  document.getElementById('item-name').value = '';
  document.getElementById('item-qty').value = '1';
  document.getElementById('item-price').value = '';
  if (document.getElementById('item-hsn')) document.getElementById('item-hsn').value = '';
  if (prodSelect) prodSelect.value = '';

  rebuildItemsTable();
  calculateTotals();
  updatePreview();
  triggerAutoSave();
}

function removeItem(index) {
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
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td style="text-align: center; color: var(--color-text-tertiary); font-family: monospace; font-size: 12px;">${item.hsnSacCode || '-'}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${formatCurrency(item.price)}</td>
      <td style="text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
      <td style="text-align: center;"><button type="button" onclick="removeItem(${index})" class="btn btn-sm btn-danger" style="padding: 2px 7px;">&times;</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function calculateTotals() {
  let subtotal = 0;
  items.forEach(i => subtotal += i.total);
  
  const discountPercent = Number(document.getElementById('discount')?.value) || 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  
  const gstPercent = Number(document.getElementById('gst-rate')?.value) || 0;
  const gstAmount = afterDiscount * (gstPercent / 100);
  
  const grandTotal = afterDiscount + gstAmount;

  if(document.getElementById('subtotal-display')) document.getElementById('subtotal-display').textContent = formatCurrency(subtotal);
  if(document.getElementById('discount-display')) document.getElementById('discount-display').textContent = formatCurrency(discountAmount);
  if(document.getElementById('gst-display')) document.getElementById('gst-display').textContent = formatCurrency(gstAmount);
  if(document.getElementById('grand-total-display')) document.getElementById('grand-total-display').textContent = formatCurrency(grandTotal);
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

  const customBizName = document.getElementById('inv-biz-name')?.value;
  const activeBizName = customBizName || bizSettings.businessName || localStorage.getItem('businessName') || 'My Business';

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
    customerName: custName,
    customerEmail: custEmail,
    customerPhone: custPhone,
    customerAddress: custAddress,
    notes: notes,
    items: items,
    subtotal: subtotal,
    discountAmount: discountAmount,
    gstAmount: gstAmount,
    grandTotal: grandTotal
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
    businessName: document.getElementById('inv-biz-name')?.value || null,
    invoiceDate: (document.getElementById('inv-date') || document.getElementById('invoice-date'))?.value,
    dueDate: document.getElementById('due-date')?.value,
    discountPercent: Number(document.getElementById('discount')?.value) || 0,
    gstPercent: Number(document.getElementById('gst-rate')?.value) || 0,
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
    
    document.title = 'Edit Invoice';
    const genBtn = document.getElementById('generate-btn');
    if (genBtn) genBtn.textContent = 'Update Invoice';

    if (data.businessName && document.getElementById('inv-biz-name')) {
      document.getElementById('inv-biz-name').value = data.businessName;
    }

    if (document.getElementById('customer-select')) document.getElementById('customer-select').value = data.customerId;
    const numEl = document.getElementById('inv-number') || document.getElementById('invoice-number');
    if (numEl) numEl.value = data.invoiceNumber;
    const dateEl = document.getElementById('inv-date') || document.getElementById('invoice-date');
    if (dateEl) dateEl.value = data.invoiceDate ? data.invoiceDate.substring(0,10) : '';
    if (document.getElementById('due-date')) document.getElementById('due-date').value = data.dueDate ? data.dueDate.substring(0,10) : '';
    if (document.getElementById('discount')) document.getElementById('discount').value = data.discountPercent || 0;
    if (document.getElementById('gst-rate')) document.getElementById('gst-rate').value = data.gstPercent || 0;
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
