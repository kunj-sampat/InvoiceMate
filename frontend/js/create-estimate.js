// js/create-estimate.js
// Handles the Create / Edit Estimate page

let estimateItems = [];

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  loadCustomers();
  loadSettings();
  addEstimateItem(); // Start with one empty row

  // Recalculate on discount/gst change
  document.getElementById('discount-percent').addEventListener('input', recalculate);
  document.getElementById('gst-percent').addEventListener('change', recalculate);

  // Update preview on template change or company name change
  document.getElementById('template-select').addEventListener('change', updatePreview);
  document.getElementById('est-biz-name')?.addEventListener('input', updatePreview);
});

function setDefaultDates() {
  const today = new Date();
  const validUntil = new Date();
  validUntil.setDate(today.getDate() + 30);

  const toISO = d => d.toISOString().split('T')[0];
  document.getElementById('estimate-date').value = toISO(today);
  document.getElementById('valid-until').value   = toISO(validUntil);
}

async function loadCustomers() {
  try {
    const customers = await apiRequest('GET', '/api/customers');
    const select = document.getElementById('customer-select');
    if (!customers) return;
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    select.addEventListener('change', updatePreview);
  } catch (e) {
    console.error('Could not load customers', e);
  }
}

async function loadSettings() {
  try {
    const settings = await apiRequest('GET', '/api/settings');
    if (!settings) return;
    // Populate estimate number
    const nextNum = settings.nextEstimateNumber || 1;
    document.getElementById('estimate-number').value = 'EST-' + String(nextNum).padStart(3, '0');
    
    // Populate sender company name
    const bizEl = document.getElementById('est-biz-name');
    if (bizEl && !bizEl.value) {
      bizEl.value = settings.businessName || localStorage.getItem('businessName') || '';
    }

    // Pre-fill GST default
    if (settings.defaultGst) {
      const gstSelect = document.getElementById('gst-percent');
      for (let opt of gstSelect.options) {
        if (parseFloat(opt.value) === settings.defaultGst) {
          gstSelect.value = opt.value;
          break;
        }
      }
    }
    if (settings.defaultNotes) {
      document.getElementById('estimate-notes').value = settings.defaultNotes;
    }
    updatePreview();
  } catch (e) {
    console.error('Could not load settings', e);
  }
}

function addEstimateItem() {
  const id = Date.now();
  estimateItems.push({ id, name: '', hsnSacCode: '', quantity: 1, price: 0 });

  const tbody = document.getElementById('estimate-items-body');
  const tr = document.createElement('tr');
  tr.setAttribute('data-id', id);
  tr.innerHTML = `
    <td>
      <input type="text" class="item-name" placeholder="Item or service name"
        oninput="updateItem(${id}, 'name', this.value)"
        style="width:100%; border:none; background:transparent; outline:1px solid var(--color-border); border-radius:4px; padding:6px 8px; font-size:13.5px; color:var(--color-text);">
    </td>
    <td>
      <input type="text" class="item-hsn" placeholder="e.g. 9983"
        oninput="updateItem(${id}, 'hsnSacCode', this.value)"
        style="width:100%; border:none; background:transparent; outline:1px solid var(--color-border); border-radius:4px; padding:6px 8px; font-size:13.5px; color:var(--color-text); text-align:center;">
    </td>
    <td>
      <input type="number" class="item-qty" value="1" min="1"
        oninput="updateItem(${id}, 'quantity', this.value)"
        style="width:70px; border:none; background:transparent; outline:1px solid var(--color-border); border-radius:4px; padding:6px 8px; font-size:13.5px; color:var(--color-text); text-align:center;">
    </td>
    <td>
      <input type="number" class="item-price" value="0" min="0" step="0.01"
        oninput="updateItem(${id}, 'price', this.value)"
        style="width:110px; border:none; background:transparent; outline:1px solid var(--color-border); border-radius:4px; padding:6px 8px; font-size:13.5px; color:var(--color-text); text-align:right;">
    </td>
    <td class="item-total" id="total-${id}" style="font-weight:600; text-align:right; white-space:nowrap;">&#8377;0.00</td>
    <td style="text-align:center;">
      <button onclick="removeEstimateItem(${id})"
        style="background:none; border:none; color:var(--color-danger); cursor:pointer; font-size:16px; padding:4px; line-height:1;" title="Remove">&#10005;</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function updateItem(id, field, value) {
  const item = estimateItems.find(i => i.id === id);
  if (!item) return;
  if (field === 'quantity') item.quantity = parseFloat(value) || 1;
  else if (field === 'price') item.price = parseFloat(value) || 0;
  else item[field] = value;

  const total = item.quantity * item.price;
  const totalEl = document.getElementById('total-' + id);
  if (totalEl) totalEl.textContent = '₹' + total.toFixed(2);
  recalculate();
  updatePreview();
}

function removeEstimateItem(id) {
  estimateItems = estimateItems.filter(i => i.id !== id);
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if (tr) tr.remove();
  recalculate();
  updatePreview();
}

function recalculate() {
  const subtotal = estimateItems.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const discountPct = parseFloat(document.getElementById('discount-percent').value) || 0;
  const gstPct = parseFloat(document.getElementById('gst-percent').value) || 0;
  const discountAmt = subtotal * discountPct / 100;
  const afterDiscount = subtotal - discountAmt;
  const gstAmt = afterDiscount * gstPct / 100;
  const grand = afterDiscount + gstAmt;

  const fmt = n => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('subtotal-display').textContent   = fmt(subtotal);
  document.getElementById('discount-display').textContent   = fmt(discountAmt);
  document.getElementById('gst-display').textContent        = fmt(gstAmt);
  document.getElementById('grand-total-display').textContent = fmt(grand);
  updatePreview();
}

function updatePreview() {
  const template = document.getElementById('template-select').value || 'modern';
  const preview  = document.getElementById('estimate-preview');
  if (!preview) return;

  const customerSelect = document.getElementById('customer-select');
  const customerName = (customerSelect && customerSelect.value)
    ? customerSelect.options[customerSelect.selectedIndex]?.text
    : 'Customer Name';
  const estDate   = formatDate(document.getElementById('estimate-date').value) || '-';
  const validDate = formatDate(document.getElementById('valid-until').value) || '-';
  const estNum    = document.getElementById('estimate-number').value || 'EST-001';
  const notes     = document.getElementById('estimate-notes').value || '';
  const customBiz = document.getElementById('est-biz-name')?.value;
  const biz       = customBiz || localStorage.getItem('businessName') || localStorage.getItem('userName') || 'InvoiceMate Studio';

  renderInvoiceTemplate(preview, template, {
    docTitle: 'ESTIMATE',
    docNumber: estNum,
    docDate: estDate,
    dueDate: validDate,
    dueLabel: 'Valid Until',
    bizName: biz,
    logoUrl: localStorage.getItem('userLogo') || '',
    upiId: localStorage.getItem('userUpiId') || '',
    customerName: customerName,
    notes: notes,
    items: estimateItems.map(i => ({
      name: i.name || 'Item / Service',
      hsnSacCode: i.hsnSacCode || '',
      quantity: i.quantity || 1,
      price: i.price || 0,
      total: (i.quantity || 1) * (i.price || 0)
    })),
    subtotalText: document.getElementById('subtotal-display').textContent,
    discountText: document.getElementById('discount-display').textContent,
    gstText: document.getElementById('gst-display').textContent,
    grandText: document.getElementById('grand-total-display').textContent
  });
}

async function saveEstimate(isDraft) {
  const customerId = document.getElementById('customer-select').value;
  if (!customerId) {
    if (typeof showToast === 'function') showToast('Please select a customer', 'error');
    return;
  }
  const activeItems = estimateItems.filter(i => i.name && i.price > 0);
  if (activeItems.length === 0) {
    if (typeof showToast === 'function') showToast('Please add at least one item', 'error');
    return;
  }

  const payload = {
    customerId: parseInt(customerId),
    businessName: document.getElementById('est-biz-name')?.value || null,
    invoiceDate: document.getElementById('estimate-date').value,
    dueDate: document.getElementById('valid-until').value,
    items: activeItems.map(i => ({
      name: i.name,
      hsnSacCode: i.hsnSacCode || null,
      quantity: i.quantity,
      price: i.price
    })),
    discountPercent: parseFloat(document.getElementById('discount-percent').value) || 0,
    gstPercent: parseFloat(document.getElementById('gst-percent').value) || 0,
    template: document.getElementById('template-select').value || 'modern',
    notes: document.getElementById('estimate-notes').value || '',
    isDraft: isDraft,
    isEstimate: true
  };

  try {
    const result = await apiRequest('POST', '/api/invoices', payload);
    if (result && result.id) {
      if (typeof showToast === 'function') showToast(isDraft ? 'Estimate draft saved' : 'Estimate created!', 'success');
      setTimeout(() => { window.location.href = 'estimates.html'; }, 1200);
    }
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'Failed to save estimate', 'error');
  }
}

window.addEstimateItem    = addEstimateItem;
window.removeEstimateItem = removeEstimateItem;
window.updateItem         = updateItem;
window.saveEstimate       = saveEstimate;
