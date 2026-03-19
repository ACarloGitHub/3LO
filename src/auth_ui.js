// Login System UI for 3LO
import { registerUser, loginUser, logoutUser, verifySession, deleteUser, updateUserColor, getUserColor } from './auth.js';

let currentSessionId = null;
let currentUser = null;

// ==========================================
// INIT
// ==========================================

let authInitialized = false;

export async function initAuth() {
  // Prevent double initialization
  if (authInitialized) {
    console.log('🔧 initAuth already called, skipping');
    return;
  }
  authInitialized = true;
  
  // Make sure login modal is closed
  const loginModal = document.getElementById('login-modal');
  if (loginModal) {
    loginModal.style.display = 'none';
  }
  
  // LOGOUT AT STARTUP - Clear any saved session for security
  // User must login again every time the app starts
  const savedSession = localStorage.getItem('3lo_session');
  if (savedSession) {
    console.log('🔧 initAuth - clearing saved session (security logout)');
    try {
      await logoutUser(savedSession);
    } catch (e) {
      // Ignore errors - session might not exist in DB
    }
    localStorage.removeItem('3lo_session');
  }
  
  // Always start logged out
  currentSessionId = null;
  currentUser = null;
  updateUIForLoggedOut();
  
  setupEventListeners();
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
  // Account button
  const accountBtn = document.getElementById('account-btn');
  if (accountBtn) {
    accountBtn.addEventListener('click', handleAccountClick);
  }
  
  // Login modal
  const closeLogin = document.getElementById('close-login');
  const loginModal = document.getElementById('login-modal');
  
  if (closeLogin && loginModal) {
    closeLogin.addEventListener('click', () => {
      loginModal.style.display = 'none';
      clearLoginForm();
    });
    
    window.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = 'none';
        clearLoginForm();
      }
    });
  }
  
  // Tab switching
  const loginTabBtn = document.getElementById('login-tab-btn');
  const registerTabBtn = document.getElementById('register-tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginTabBtn && registerTabBtn) {
    loginTabBtn.addEventListener('click', () => {
      loginTabBtn.classList.add('active');
      registerTabBtn.classList.remove('active');
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
    });
    
    registerTabBtn.addEventListener('click', () => {
      registerTabBtn.classList.add('active');
      loginTabBtn.classList.remove('active');
      registerForm.style.display = 'flex';
      loginForm.style.display = 'none';
    });
  }
  
  // Login form
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Register form
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
    
    // Color picker setup
    const colorOptions = registerForm.querySelectorAll('.color-option');
    const colorInput = registerForm.querySelector('#register-color');
    const colorPreview = registerForm.querySelector('.color-preview');
    
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Remove selected class from all
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        // Add to clicked
        option.classList.add('selected');
        // Update input and preview
        const color = option.dataset.color;
        if (colorInput) colorInput.value = color;
        if (colorPreview) colorPreview.style.background = color;
      });
    });
    
    // Select first color by default
    if (colorOptions.length > 0) {
      colorOptions[0].classList.add('selected');
    }
  }
  
  // Account dropdown
  const accountLogout = document.getElementById('account-logout');
  const accountDelete = document.getElementById('account-delete');
  const accountColor = document.getElementById('account-color');
  
  if (accountLogout) {
    accountLogout.addEventListener('click', handleLogout);
  }
  
  if (accountDelete) {
    accountDelete.addEventListener('click', handleDeleteAccount);
  }
  
  if (accountColor) {
    accountColor.addEventListener('click', openColorModal);
  }
  
  // Color modal
  const colorModal = document.getElementById('color-modal');
  const closeColor = document.getElementById('close-color');
  const saveColor = document.getElementById('save-color');
  const settingsColorPalette = document.getElementById('settings-color-palette');
  const settingsColorInput = document.getElementById('settings-color');
  const settingsColorPreview = document.getElementById('settings-color-preview');
  
  if (closeColor) {
    closeColor.addEventListener('click', () => {
      colorModal.style.display = 'none';
    });
  }
  
  if (colorModal) {
    window.addEventListener('click', (e) => {
      if (e.target === colorModal) {
        colorModal.style.display = 'none';
      }
    });
  }
  
  if (settingsColorPalette) {
    const colorOptions = settingsColorPalette.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const color = option.dataset.color;
        if (settingsColorInput) settingsColorInput.value = color;
        if (settingsColorPreview) settingsColorPreview.style.background = color;
      });
    });
  }
  
  if (settingsColorInput) {
    settingsColorInput.addEventListener('input', (e) => {
      if (settingsColorPreview) settingsColorPreview.style.background = e.target.value;
      // Remove selected from palette
      const colorOptions = settingsColorPalette?.querySelectorAll('.color-option');
      if (colorOptions) {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
      }
    });
  }
  
  if (saveColor) {
    saveColor.addEventListener('click', handleSaveColor);
  }
  
  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('account-menu');
    const accountBtn = document.getElementById('account-btn');
    if (dropdown && !dropdown.contains(e.target) && !accountBtn.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// ==========================================
// HANDLERS
// ==========================================

function clearLoginForm() {
  // Clear login form
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  
  if (loginUsername) loginUsername.value = '';
  if (loginPassword) loginPassword.value = '';
  if (loginError) loginError.style.display = 'none';
  
  // Clear register form
  const registerUsername = document.getElementById('register-username');
  const registerPassword = document.getElementById('register-password');
  const registerConfirm = document.getElementById('register-confirm');
  const registerError = document.getElementById('register-error');
  
  if (registerUsername) registerUsername.value = '';
  if (registerPassword) registerPassword.value = '';
  if (registerConfirm) registerConfirm.value = '';
  if (registerError) registerError.style.display = 'none';
}

async function handleAccountClick() {
  if (currentUser) {
    // Toggle dropdown
    const dropdown = document.getElementById('account-menu');
    if (dropdown) {
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    }
  } else {
    // Show login modal
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      loginModal.style.display = 'block';
      clearLoginForm();
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  
  if (!username || !password) {
    errorEl.textContent = 'Enter username and password';
    errorEl.style.display = 'block';
    return;
  }
  
  try {
    const result = await loginUser(username, password);
    currentSessionId = result.sessionId;
    currentUser = result.user;
    
    // Load user color
    const userColor = await getUserColor(currentUser.id);
    currentUser.color = userColor;
    
    // Save session
    localStorage.setItem('3lo_session', currentSessionId);
    
    // Close modal
    document.getElementById('login-modal').style.display = 'none';
    clearLoginForm();
    
    // Update UI
    updateUIForLoggedIn();
    
    // Reload projects (for visibility)
    window.dispatchEvent(new Event('projects-updated'));
    
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  const colorInput = document.getElementById('register-color');
  const color = colorInput ? colorInput.value : '#4CAF50';
  const errorEl = document.getElementById('register-error');
  
  if (!username || !password) {
    errorEl.textContent = 'Enter username and password';
    errorEl.style.display = 'block';
    return;
  }
  
  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    errorEl.style.display = 'block';
    return;
  }
  
  if (password.length < 4) {
    errorEl.textContent = 'Password must be at least 4 characters';
    errorEl.style.display = 'block';
    return;
  }
  
  try {
    await registerUser(username, password, color);
    
    // Auto-login after registration
    const result = await loginUser(username, password);
    currentSessionId = result.sessionId;
    currentUser = result.user;
    
    localStorage.setItem('3lo_session', currentSessionId);
    
    document.getElementById('login-modal').style.display = 'none';
    clearLoginForm();
    updateUIForLoggedIn();
    window.dispatchEvent(new Event('projects-updated'));
    
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

async function handleLogout() {
  if (currentSessionId) {
    try {
      await logoutUser(currentSessionId);
    } catch (e) {
      console.error('Logout error:', e);
    }
  }
  
  currentSessionId = null;
  currentUser = null;
  localStorage.removeItem('3lo_session');
  
  // Close dropdown
  const dropdown = document.getElementById('account-menu');
  if (dropdown) dropdown.style.display = 'none';
  
  updateUIForLoggedOut();
  window.dispatchEvent(new Event('projects-updated'));
}

async function handleDeleteAccount() {
  if (!currentUser || !currentSessionId) return;
  
  const confirmed = confirm(`⚠️ WARNING!\n\nYou are about to delete account "${currentUser.username}".\n\nYour private projects will be deleted.\nPublic projects will become orphaned.\n\nContinue?`);
  
  if (!confirmed) return;
  
  const action = prompt(`What to do with your projects?\n\n1. Delete all\n2. Make public\n3. Cancel\n\nEnter 1, 2, or 3:`);
  
  if (action === '3' || !action) return;
  
  const options = action === '1' ? 'delete' : 'make_public';
  
  try {
    await deleteUser(currentUser.id, currentSessionId, options);
    
    currentSessionId = null;
    currentUser = null;
    localStorage.removeItem('3lo_session');
    
    const dropdown = document.getElementById('account-menu');
    if (dropdown) dropdown.style.display = 'none';
    
    updateUIForLoggedOut();
    window.dispatchEvent(new Event('projects-updated'));
    
    alert('Account deleted successfully.');
    
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==========================================
// UI UPDATES
// ==========================================

function updateUIForLoggedIn() {
  console.log('🔧 updateUIForLoggedIn called, currentUser:', currentUser);
  
  const accountBtn = document.getElementById('account-btn');
  const accountText = document.querySelector('.account-text');
  const accountUsername = document.querySelector('.account-username');
  
  console.log('  accountBtn:', accountBtn);
  console.log('  accountText:', accountText);
  console.log('  accountUsername:', accountUsername);
  
  if (accountBtn) {
    accountBtn.classList.add('logged-in');
  }
  
  if (accountText) {
    accountText.textContent = currentUser ? currentUser.username : 'User';
  }
  
  if (accountUsername) {
    accountUsername.textContent = currentUser ? currentUser.username : 'User';
    // Apply user color as background
    const userColor = currentUser?.color || '#4CAF50';
    accountUsername.style.background = userColor;
    accountUsername.classList.add('user-color-badge');
  }
}

function updateUIForLoggedOut() {
  console.log('🔧 updateUIForLoggedOut called');
  
  const accountBtn = document.getElementById('account-btn');
  const accountText = document.querySelector('.account-text');
  
  if (accountBtn) {
    accountBtn.classList.remove('logged-in');
  }
  
  if (accountText) {
    accountText.textContent = 'Login';
  }
}

// ==========================================
// COLOR MODAL
// ==========================================

function openColorModal() {
  const colorModal = document.getElementById('color-modal');
  const settingsColorInput = document.getElementById('settings-color');
  const settingsColorPreview = document.getElementById('settings-color-preview');
  const settingsColorPalette = document.getElementById('settings-color-palette');
  
  if (!colorModal) return;
  
  // Set current color
  const currentColor = currentUser?.color || '#4CAF50';
  if (settingsColorInput) settingsColorInput.value = currentColor;
  if (settingsColorPreview) settingsColorPreview.style.background = currentColor;
  
  // Select matching palette color if exists
  if (settingsColorPalette) {
    const colorOptions = settingsColorPalette.querySelectorAll('.color-option');
    colorOptions.forEach(opt => {
      opt.classList.remove('selected');
      if (opt.dataset.color === currentColor) {
        opt.classList.add('selected');
      }
    });
  }
  
  // Close dropdown
  const dropdown = document.getElementById('account-menu');
  if (dropdown) dropdown.style.display = 'none';
  
  // Show modal
  colorModal.style.display = 'block';
}

async function handleSaveColor() {
  const settingsColorInput = document.getElementById('settings-color');
  const colorError = document.getElementById('color-error');
  const colorModal = document.getElementById('color-modal');
  
  if (!currentUser || !currentUser.id) {
    if (colorError) {
      colorError.textContent = 'Not logged in';
      colorError.style.display = 'block';
    }
    return;
  }
  
  const newColor = settingsColorInput ? settingsColorInput.value : '#4CAF50';
  
  try {
    await updateUserColor(currentUser.id, newColor);
    currentUser.color = newColor;
    
    // Update UI
    const accountUsername = document.querySelector('.account-username');
    if (accountUsername) {
      accountUsername.style.background = newColor;
    }
    
    // Close modal
    if (colorModal) colorModal.style.display = 'none';
    
  } catch (err) {
    if (colorError) {
      colorError.textContent = err.message;
      colorError.style.display = 'block';
    }
  }
}

// ==========================================
// EXPORTS
// ==========================================

export function isLoggedIn() {
  return currentUser !== null;
}

export function getCurrentUser() {
  return currentUser;
}

export function getSessionId() {
  return currentSessionId;
}