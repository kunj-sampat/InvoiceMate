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
  const payload = {
    invoicePrefix: document.getElementById('set-prefix')?.value,
    nextInvoiceNumber: Number(document.getElementById('set-next-num')?.value) || 1,
    defaultGst: Number(document.getElementById('set-default-gst')?.value) || 18,
    defaultPaymentTermsDays: Number(document.getElementById('set-payment-terms')?.value) || 30,
    defaultNotes: document.getElementById('set-default-notes')?.value,
  };
  try {
    await apiRequest('PUT', '/api/settings/invoice', payload);
    if(typeof showToast === 'function') showToast('Invoice settings saved', 'success');
  } catch (error) {
    if(typeof showToast === 'function') showToast(error.message, 'error');
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
});

// Bind to window if buttons are calling these directly from HTML onClick attributes
window.saveProfileSettings = saveProfileSettings;
window.saveInvoiceSettings = saveInvoiceSettings;
window.saveAppearanceSettings = saveAppearanceSettings;
window.uploadLogo = uploadLogo;
window.removeLogo = removeLogo;
