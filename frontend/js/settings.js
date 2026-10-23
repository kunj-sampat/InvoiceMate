// js/settings.js

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  const saveProfileBtn = document.getElementById('save-profile-btn'); // Assuming there's a button, though not explicitly in element IDs, I'll bind to forms if needed
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfileSettings);
  } else {
    // Try binding to a form submit or generic save button if exact IDs aren't provided for buttons
    const formProfile = document.getElementById('profile-form');
    if (formProfile) formProfile.addEventListener('submit', (e) => { e.preventDefault(); saveProfileSettings(); });
  }
});

async function loadSettings() {
  try {
    const data = await apiRequest('GET', '/api/settings');
    if (!data) return;

    // Profile / Business
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('set-biz-name',    data.businessName);
    setVal('set-biz-address', data.businessAddress);
    setVal('set-biz-phone',   data.businessPhone);
    setVal('set-biz-email',   data.businessEmail);

    // Also update the stored display name if fullName is returned
    if (data.fullName) {
      localStorage.setItem('userName', data.fullName);
    }

    // Invoice Settings
    setVal('set-prefix',        data.invoicePrefix || 'INV');
    setVal('set-next-num',      data.nextInvoiceNumber || 1);
    setVal('set-default-gst',   data.defaultGst !== undefined ? data.defaultGst : 18);
    setVal('set-payment-terms', data.defaultPaymentTermsDays || 30);
    setVal('set-default-notes', data.defaultNotes);

    // Dynamic UPI QR Settings
    setVal('set-upi-id', data.upiId || '');
    if (data.upiId) {
      localStorage.setItem('userUpiId', data.upiId);
    } else {
      localStorage.removeItem('userUpiId');
    }
    const payeeEl = document.getElementById('upi-display-payee');
    if (payeeEl) {
      payeeEl.value = data.businessName || data.fullName || 'Merchant';
    }
    updateSettingsUpiPreview();

    // Logo
    updateLogoPreview(data.logoPath);
    if (data.logoPath) {
      localStorage.setItem('userLogo', data.logoPath);
    } else {
      localStorage.removeItem('userLogo');
    }

  } catch (error) {
    console.error('Settings load error:', error);
    if (typeof showToast === 'function') showToast('Failed to load settings — please check you are logged in', 'error');
  }
}

function updateLogoPreview(path) {
  const img = document.getElementById('logo-preview-img');
  const placeholder = document.getElementById('logo-placeholder');
  const removeBtn = document.getElementById('remove-logo-btn');
  if (!img) return;

  if (path) {
    img.src = path;
    img.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'inline-block';
  } else {
    img.src = '';
    img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
  }
}


// Provided as global functions to be called by inline onclick if IDs not provided for buttons
async function saveProfileSettings() {
  const payload = {
    businessName: document.getElementById('set-biz-name')?.value,
    businessAddress: document.getElementById('set-biz-address')?.value,
    businessPhone: document.getElementById('set-biz-phone')?.value,
    businessEmail: document.getElementById('set-biz-email')?.value,
  };
  try {
    await apiRequest('PUT', '/api/settings/profile', payload);
    if(typeof showToast === 'function') showToast('Profile settings saved', 'success');
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}

async function saveInvoiceSettings() {
  const upiId = document.getElementById('set-upi-id')?.value?.trim();
  const payload = {
    invoicePrefix: document.getElementById('set-prefix')?.value,
    nextInvoiceNumber: Number(document.getElementById('set-next-num')?.value) || 1,
    defaultGst: Number(document.getElementById('set-default-gst')?.value) || 18,
    defaultPaymentTermsDays: Number(document.getElementById('set-payment-terms')?.value) || 30,
    defaultNotes: document.getElementById('set-default-notes')?.value,
    upiId: upiId !== undefined ? upiId : null,
  };
  try {
    await apiRequest('PUT', '/api/settings/invoice', payload);
    if (upiId !== undefined) {
      if (upiId) localStorage.setItem('userUpiId', upiId);
      else localStorage.removeItem('userUpiId');
    }
    if(typeof showToast === 'function') showToast('Invoice settings saved', 'success');
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}

async function saveUpiSettings() {
  const upiId = document.getElementById('set-upi-id')?.value?.trim() || '';
  try {
    await apiRequest('PUT', '/api/settings/invoice', { upiId: upiId });
    if (upiId) {
      localStorage.setItem('userUpiId', upiId);
    } else {
      localStorage.removeItem('userUpiId');
    }
    if (typeof showToast === 'function') showToast('Business UPI ID saved successfully!', 'success');
    updateSettingsUpiPreview();
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'Failed to save UPI ID', 'error');
  }
}

function updateSettingsUpiPreview() {
  const upiId = document.getElementById('set-upi-id')?.value?.trim();
  const qrContainer = document.getElementById('settings-upi-qr');
  const statusEl = document.getElementById('settings-upi-preview-status');
  const payee = document.getElementById('upi-display-payee')?.value || document.getElementById('set-biz-name')?.value || 'Merchant';
  if (!qrContainer) return;

  if (upiId && typeof InvoiceMateUPI !== 'undefined') {
    const uri = InvoiceMateUPI.buildUpiUri({
      upiId: upiId,
      payeeName: payee,
      amount: 1000,
      invoiceNumber: 'TEST-001'
    });
    qrContainer.innerHTML = InvoiceMateUPI.generateQRCodeSVG(uri, 130);
    if (statusEl) {
      statusEl.textContent = `Active: ${upiId} • Test ₹1,000.00`;
      statusEl.style.color = '#059669';
    }
  } else {
    qrContainer.innerHTML = `
      <div style="width:130px; height:130px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:11px; text-align:center; padding:10px;">
        <span style="font-size:26px; margin-bottom:6px;">⚡</span>
        Enter UPI ID to generate live QR
      </div>
    `;
    if (statusEl) {
      statusEl.textContent = 'Enter UPI ID to preview test QR';
      statusEl.style.color = '#64748b';
    }
  }
}

async function saveAppearanceSettings() {
  const payload = {
    invoiceHeading: document.getElementById('set-heading')?.value,
    footerText: document.getElementById('set-footer')?.value,
    paymentInstructions: document.getElementById('set-instructions')?.value,
    accentColor: document.getElementById('set-accent')?.value,
  };
  try {
    await apiRequest('PUT', '/api/settings/appearance', payload);
    if(typeof showToast === 'function') showToast('Appearance settings saved', 'success');
    
    // Apply accent color immediately
    if (payload.accentColor) {
      document.documentElement.style.setProperty('--color-primary', payload.accentColor);
    }
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
  }
}

async function uploadLogo() {
  const fileInput = document.getElementById('logo-upload');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    if (typeof showToast === 'function') showToast('Please select an image file first', 'warning');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  
  try {
    const res = await apiRequest('POST', '/api/settings/logo', formData);
    if (typeof showToast === 'function') showToast('Business logo uploaded successfully!', 'success');
    if (res) {
      const path = typeof res === 'string' ? res : (res.logoPath || res.path);
      if (path) {
        localStorage.setItem('userLogo', path);
        updateLogoPreview(path);
      }
    }
    loadSettings();
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message || 'Logo upload failed', 'error');
  }
}

async function removeLogo() {
  try {
    await apiRequest('DELETE', '/api/settings/logo');
    localStorage.removeItem('userLogo');
    const fileInput = document.getElementById('logo-upload');
    if (fileInput) fileInput.value = '';
    updateLogoPreview('');
    if (typeof showToast === 'function') showToast('Business logo removed successfully', 'info');
  } catch (e) {
    console.error('Remove logo error:', e);
    if (typeof showToast === 'function') showToast(e.message || 'Failed to remove logo', 'error');
  }
}

async function deleteAccount() {
  const confirmed = await showConfirmDialog({
    title: 'Delete InvoiceMate Account?',
    message: 'This will permanently wipe your account, invoices, customer records, products, and all workspace data from the database. This action cannot be reversed.',
    confirmText: 'Yes, Delete Account',
    cancelText: 'Cancel',
    isDanger: true
  });

  if (!confirmed) return;

  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="invoza-spin" style="animation: spin 0.8s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
      Deleting Account...
    `;
  }

  try {
    await apiRequest('DELETE', '/api/settings/account');
    localStorage.clear();
    sessionStorage.clear();
    if (typeof showToast === 'function') {
      showToast('Your account and workspace data have been permanently deleted.', 'info');
    }
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
  } catch (err) {
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        Delete Account
      `;
    }
    if (typeof showToast === 'function') {
      showToast(err.message || 'Failed to delete account. Please try again.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('upload-logo-btn')?.addEventListener('click', uploadLogo);
  document.getElementById('remove-logo-btn')?.addEventListener('click', removeLogo);
  document.getElementById('save-invoice-settings-btn')?.addEventListener('click', saveInvoiceSettings);
  document.getElementById('save-appearance-btn')?.addEventListener('click', saveAppearanceSettings);
  document.getElementById('save-upi-settings-btn')?.addEventListener('click', saveUpiSettings);
  document.getElementById('delete-account-btn')?.addEventListener('click', deleteAccount);
  document.getElementById('set-upi-id')?.addEventListener('input', updateSettingsUpiPreview);
  document.getElementById('set-biz-name')?.addEventListener('input', () => {
    const payeeEl = document.getElementById('upi-display-payee');
    if (payeeEl) payeeEl.value = document.getElementById('set-biz-name')?.value || 'Merchant';
    updateSettingsUpiPreview();
  });
});

// Bind to window if buttons are calling these directly from HTML onClick attributes
window.saveProfileSettings = saveProfileSettings;
window.saveInvoiceSettings = saveInvoiceSettings;
window.saveUpiSettings = saveUpiSettings;
window.updateSettingsUpiPreview = updateSettingsUpiPreview;
window.saveAppearanceSettings = saveAppearanceSettings;
window.uploadLogo = uploadLogo;
window.removeLogo = removeLogo;
window.deleteAccount = deleteAccount;
window.updatePassword = updatePassword;
window.exportData = exportData;

async function updatePassword() {
  const curPass = document.getElementById('current-password')?.value;
  const newPass = document.getElementById('new-password')?.value;
  const confirmPass = document.getElementById('confirm-new-password')?.value;

  if (!curPass) {
    if (typeof showToast === 'function') showToast('Please enter your current password', 'error');
    return;
  }
  if (!newPass || newPass.length < 6) {
    if (typeof showToast === 'function') showToast('New password must be at least 6 characters long', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    if (typeof showToast === 'function') showToast('New password and confirmation do not match', 'error');
    return;
  }

  const btn = document.getElementById('update-password-btn');
  const origText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Updating...';
  }

  try {
    const res = await apiRequest('PUT', '/api/settings/password', {
      currentPassword: curPass,
      newPassword: newPass,
      confirmPassword: confirmPass
    });

    if (typeof showToast === 'function') {
      showToast(res?.message || 'Password updated successfully!', 'success');
    }
    document.getElementById('change-password-form')?.reset();
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message || 'Failed to update password', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }
}

async function exportData(type) {
  let endpoint = '/api/export/backup/json';
  let defaultFilename = `invoicemate_backup_${new Date().toISOString().split('T')[0]}.json`;

  if (type === 'invoices') {
    endpoint = '/api/export/invoices/csv';
    defaultFilename = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
  } else if (type === 'customers') {
    endpoint = '/api/export/customers/csv';
    defaultFilename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
  }

  try {
    if (typeof showToast === 'function') showToast('Preparing export download...', 'info');
    const token = localStorage.getItem('token');
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error('Export download failed: ' + res.status);

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    if (typeof showToast === 'function') showToast('File downloaded successfully!', 'success');
  } catch (err) {
    console.error('Export error:', err);
    if (typeof showToast === 'function') showToast(err.message || 'Failed to download export', 'error');
  }
}
