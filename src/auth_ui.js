// Login System UI for 3LO
import { registerUser, loginUser, logoutUser, verifySession, deleteUser } from './auth.js';

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
  
  // Load saved session
  const savedSession = localStorage.getItem('3lo_session');
  console.log('🔧 initAuth - savedSession:', savedSession ? 'exists' : 'none');
  
  if (savedSession) {
    try {
      const session = await verifySession(savedSession);
      console.log('🔧 initAuth - session verified:', session);
      if (session) {
        currentSessionId = savedSession;
        currentUser = { id: session.userId, username: session.username };
        updateUIForLoggedIn();
      } else {
        // Session expired
        console.log('🔧 initAuth - session expired');
        localStorage.removeItem('3lo_session');
        updateUIForLoggedOut();
      }
    } catch (e) {
      console.error('🔧 initAuth - error:', e);
      localStorage.removeItem('3lo_session');
      updateUIForLoggedOut();
    }
  } else {
    console.log('🔧 initAuth - no session, showing logged out');
    updateUIForLoggedOut();
  }
  
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
  }
  
  // Account dropdown
  const accountLogout = document.getElementById('account-logout');
  const accountDelete = document.getElementById('account-delete');
  
  if (accountLogout) {
    accountLogout.addEventListener('click', handleLogout);
  }
  
  if (accountDelete) {
    accountDelete.addEventListener('click', handleDeleteAccount);
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
    await registerUser(username, password);
    
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