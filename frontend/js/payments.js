// js/payments.js

document.addEventListener('DOMContentLoaded', () => {
  loadPayments();
});

async function loadPayments() {
  try {
    const data = await apiRequest('GET', '/api/payments');
    const tbody = document.getElementById('payments-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No payments found.</td></tr>';
      return;
    }

    data.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(p.paymentDate)}</td>
        <td><a href="invoice-detail.html?id=${p.invoiceId}">${p.invoiceNumber || p.invoiceId}</a></td>
        <td>${p.customerName || 'N/A'}</td>
        <td>${formatCurrency(p.amount)}</td>
        <td>${p.paymentMethod}</td>
        <td>${p.notes || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    if(typeof showToast === 'function') showToast('Failed to load payments', 'error');
  }
}
