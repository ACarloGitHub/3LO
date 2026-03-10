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
  if (header) header.style.backgroundColor = currentColors.header;

  const body = document.body;
  if (body) body.style.background = `linear-gradient(135deg, ${currentColors.background} 0%, ${adjustColor(currentColors.background, -20)} 100%)`;

  const footer = document.querySelector('.app-footer');
  if (footer) footer.style.backgroundColor = currentColors.footer;

  // Apply to project cards
  document.querySelectorAll('.project-card').forEach(card => {
    card.style.borderLeft = `3px solid ${currentColors.projects}`;
  });

  // Apply to columns
  document.querySelectorAll('.column').forEach(col => {
    col.style.backgroundColor = currentColors.columns;
  });

  // Apply to cards
  document.querySelectorAll('.card').forEach(card => {
    card.style.backgroundColor = currentColors.cards;
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

// Helper: Adjust color brightness
function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x00FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
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
