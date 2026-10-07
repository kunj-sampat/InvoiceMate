// js/customers.js

let debounceTimer;
let editingCustomerId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadCustomers();

  const searchInput = document.getElementById('customer-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadCustomers(searchInput.value);
      }, 300);
    });
  }

  const addBtn = document.getElementById('add-customer-btn');
  if (addBtn) addBtn.addEventListener('click', () => openCustomerModal(null));

  const saveBtn = document.getElementById('save-customer-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveCustomer);
});

async function loadCustomers(search = '') {
  try {
    const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : '/api/customers';
    const data = await apiRequest('GET', url);
    const tbody = document.getElementById('customers-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No customers found.</td></tr>';
      return;
    }

    data.forEach(c => {
      const tr = document.createElement('tr');
      // Adding click to row to view detail, but exclude action buttons
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td onclick="viewCustomer('${c.id}')">${c.name}</td>
        <td onclick="viewCustomer('${c.id}')">${c.email || ''}</td>
        <td onclick="viewCustomer('${c.id}')">${c.invoiceCount || 0}</td>
        <td onclick="viewCustomer('${c.id}')">${formatCurrency(c.totalBilled || 0)}</td>
        <td onclick="viewCustomer('${c.id}')">${formatCurrency(c.totalOutstanding || 0)}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editCustomer('${c.id}', event)">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}', event)">Delete</button>
          <a href="customer-statement.html?customerId=${c.id}" class="btn btn-ghost btn-sm" title="View Statement">Statement</a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    if(typeof showToast === 'function') showToast('Failed to load customers', 'error');
  }
}

async function viewCustomer(id) {
  try {
    const c = await apiRequest('GET', `/api/customers/${id}`);
    const detailDiv = document.getElementById('customer-detail');
    if (detailDiv) {
      detailDiv.innerHTML = `
        <h3>${c.name}</h3>
        <p>Email: ${c.email}</p>
        <p>Phone: ${c.phone}</p>
        <p>Address: ${c.address}</p>
        <h4>Invoices</h4>
        <p>Total Billed: ${formatCurrency(c.totalBilled)} | Outstanding: ${formatCurrency(c.totalOutstanding)}</p>
      `;
      // Typically you'd load invoice history here too
    }
  } catch (e) {
    if(typeof showToast === 'function') showToast('Failed to load customer details', 'error');
  }
}

function openCustomerModal(customer) {
  editingCustomerId = customer ? customer.id : null;
  const title = document.getElementById('customer-modal-title');
  if (title) title.textContent = customer ? 'Edit Customer' : 'Add Customer';

  document.getElementById('modal-cust-name').value = customer ? customer.name : '';
  document.getElementById('modal-cust-email').value = customer ? (customer.email || '') : '';
  document.getElementById('modal-cust-phone').value = customer ? (customer.phone || '') : '';
  document.getElementById('modal-cust-address').value = customer ? (customer.address || '') : '';

  const modal = document.getElementById('customer-modal');
  if (modal) modal.style.display = 'flex';
}

async function editCustomer(id, event) {
  event.stopPropagation();
  try {
    const c = await apiRequest('GET', `/api/customers/${id}`);
    openCustomerModal(c);
  } catch (e) {
    if(typeof showToast === 'function') showToast('Failed to load customer', 'error');
  }
}

async function saveCustomer() {
  const name = document.getElementById('modal-cust-name').value;
  const email = document.getElementById('modal-cust-email').value;
  const phone = document.getElementById('modal-cust-phone').value;
  const address = document.getElementById('modal-cust-address').value;

  if (!name) {
    if(typeof showToast === 'function') showToast('Name is required', 'error');
    return;
  }

  const payload = { name, email, phone, address };

  try {
    if (editingCustomerId) {
      await apiRequest('PUT', `/api/customers/${editingCustomerId}`, payload);
      if(typeof showToast === 'function') showToast('Customer updated', 'success');
    } else {
      await apiRequest('POST', '/api/customers', payload);
      if(typeof showToast === 'function') showToast('Customer added', 'success');
    }
    const modal = document.getElementById('customer-modal');
    if (modal) modal.style.display = 'none';
    loadCustomers(document.getElementById('customer-search')?.value);
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}

async function deleteCustomer(id, event) {
  event.stopPropagation();
  if (!confirm('Are you sure you want to delete this customer?')) return;
  try {
    await apiRequest('DELETE', `/api/customers/${id}`);
    if(typeof showToast === 'function') showToast('Customer deleted', 'success');
    loadCustomers(document.getElementById('customer-search')?.value);
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}
