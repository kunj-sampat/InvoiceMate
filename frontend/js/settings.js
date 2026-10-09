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
    await apiRequest('PUT', '/api/settings/profile', { logoPath: '' });
    localStorage.removeItem('userLogo');
    updateLogoPreview('');
    if (typeof showToast === 'function') showToast('Logo removed', 'info');
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to remove logo', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('upload-logo-btn')?.addEventListener('click', uploadLogo);
  document.getElementById('remove-logo-btn')?.addEventListener('click', removeLogo);
  document.getElementById('save-invoice-settings-btn')?.addEventListener('click', saveInvoiceSettings);
  document.getElementById('save-appearance-btn')?.addEventListener('click', saveAppearanceSettings);
  document.getElementById('save-upi-settings-btn')?.addEventListener('click', saveUpiSettings);
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
