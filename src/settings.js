// Settings - Sidebar and Color Management
// Handles settings panel, color picker, and live preview

// Default colors
const DEFAULT_COLORS = {
  header: '#1a1a2e',
  background: '#16213e',
  footer: '#0f0f23',
  projects: '#6366f1',
  columns: '#6366f1',
  cards: '#4c51bf'
};

// Current colors (loaded from localStorage or defaults)
let currentColors = { ...DEFAULT_COLORS };

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
  loadColors();
  initSettingsPanel();
  initColorPickers();
  applyColors();
});

function initSettingsPanel() {
  const settingsBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('close-settings');
  const sidebar = document.getElementById('settings-sidebar');
  const overlay = document.getElementById('settings-overlay');
  const resetBtn = document.getElementById('reset-colors');

  if (!settingsBtn || !sidebar) return;

  // Open sidebar
  settingsBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  });

  // Close sidebar
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSettings);
  }

  if (overlay) {
    overlay.addEventListener('click', closeSettings);
  }

  // Reset colors
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentColors = { ...DEFAULT_COLORS };
      updateColorInputs();
      applyColors();
      saveColors();
    });
  }
}

function closeSettings() {
  const sidebar = document.getElementById('settings-sidebar');
  const overlay = document.getElementById('settings-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function initColorPickers() {
  const colorIds = ['color-header', 'color-background', 'color-footer', 
                   'color-projects', 'color-columns', 'color-cards'];

  colorIds.forEach(id => {
    const picker = document.getElementById(id);
    if (!picker) return;

    // Set initial value
    const colorKey = id.replace('color-', '');
    picker.value = currentColors[colorKey];

    // Live preview on change
    picker.addEventListener('input', (e) => {
      currentColors[colorKey] = e.target.value;
      applyColors();
    });

    // Save on change complete
    picker.addEventListener('change', () => {
      saveColors();
    });
  });
}

function updateColorInputs() {
  Object.keys(currentColors).forEach(key => {
    const picker = document.getElementById(`color-${key}`);
    if (picker) picker.value = currentColors[key];
  });
}

// Convert hex to rgba with alpha
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyColors() {
  // Apply CSS custom properties
  const root = document.documentElement;
  root.style.setProperty('--color-header', currentColors.header);
  root.style.setProperty('--color-background', currentColors.background);
  root.style.setProperty('--color-footer', currentColors.footer);
  root.style.setProperty('--color-projects', currentColors.projects);
  root.style.setProperty('--color-columns', currentColors.columns);
  root.style.setProperty('--color-cards', currentColors.cards);

  // Apply to specific elements
  const header = document.querySelector('.header');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${currentColors.header} 0%, ${hexToRgba(currentColors.header, 0.8)} 100%)`;
  }

  const body = document.body;
  if (body) {
    body.style.background = `linear-gradient(135deg, ${currentColors.background} 0%, ${hexToRgba(currentColors.background, 0.7)} 100%)`;
  }

  const footer = document.querySelector('.app-footer');
  if (footer) {
    footer.style.backgroundColor = currentColors.footer;
  }

  // Apply to project cards - colored background with transparency
  document.querySelectorAll('.project-card').forEach(card => {
    card.style.background = hexToRgba(currentColors.projects, 0.15);
    card.style.border = `1px solid ${hexToRgba(currentColors.projects, 0.3)}`;
    card.style.boxShadow = `0 2px 8px ${hexToRgba(currentColors.projects, 0.2)}`;
  });

  // Apply to columns
  document.querySelectorAll('.column').forEach(col => {
    col.style.background = hexToRgba(currentColors.columns, 0.1);
    col.style.border = `1px solid ${hexToRgba(currentColors.columns, 0.2)}`;
  });

  // Apply to cards
  document.querySelectorAll('.card').forEach(card => {
    card.style.background = hexToRgba(currentColors.cards, 0.2);
    card.style.border = `1px solid ${hexToRgba(currentColors.cards, 0.3)}`;
  });
}

function saveColors() {
  try {
    localStorage.setItem('3lo_colors', JSON.stringify(currentColors));
  } catch (e) {
    console.error('Failed to save colors:', e);
  }
}

function loadColors() {
  try {
    const saved = localStorage.getItem('3lo_colors');
    if (saved) {
      currentColors = { ...DEFAULT_COLORS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load colors:', e);
  }
}

// Listen for storage changes (sync across tabs/pages)
window.addEventListener('storage', (e) => {
  if (e.key === '3lo_colors') {
    loadColors();
    applyColors();
    updateColorInputs();
  }
});

console.log('✅ Settings module loaded');
