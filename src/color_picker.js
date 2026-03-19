// Color Picker Module - Gestisce colori personalizzati per progetti, colonne e schede
// Integra con db_sqlite.js per salvare override nel database

import { 
  getProjectColorsOverride, setProjectColorsOverride, deleteProjectColorsOverride,
  getColumnColors, setColumnColors, deleteColumnColors,
  getCardColors, setCardColors, deleteCardColors,
  loadAllProjectColors
} from './db_sqlite.js';

// Colori predefiniti per il picker
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#1a1a2e', '#16213e', '#ffffff'
];

// Gradienti predefiniti
const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
];

// Cache colori per evitare query ripetute
const colorCache = {
  projects: {},
  columns: {},
  cards: {}
};

// === APRI COLOR PICKER ===
export async function openColorPicker(options) {
  const { 
    type,           // 'project' | 'column' | 'card'
    projectId,      // ID progetto (sempre richiesto)
    itemId,         // ID colonna o scheda (per type column/card)
    currentColors,  // Colori attuali { bg, text, gradient }
    onSave,         // Callback dopo salvataggio
    onReset         // Callback dopo reset
  } = options;

  // Carica colori esistenti se non forniti
  let colors = currentColors;
  if (!colors) {
    colors = await loadColors(type, projectId, itemId);
  }

  // Crea modale
  const modal = document.createElement('div');
  modal.className = 'color-picker-modal active';
  modal.innerHTML = `
    <div class="color-picker-content">
      <div class="color-picker-header">
        <h3>🎨 Colori ${getTypeLabel(type)}</h3>
        <button class="btn-secondary" id="close-picker">×</button>
      </div>
      
      <div class="color-picker-section">
        <label>Sfondo</label>
        <div class="color-presets">
          ${PRESET_COLORS.map(c => `
            <button class="color-swatch ${colors?.bg === c ? 'selected' : ''}" 
                    data-color="${c}" data-type="bg" 
                    style="background: ${c}"></button>
          `).join('')}
        </div>
        <input type="color" id="custom-bg" value="${colors?.bg || '#6366f1'}" class="color-input">
      </div>

      ${type !== 'card' ? `
      <div class="color-picker-section">
        <label>Gradiente (opzionale)</label>
        <div class="gradient-presets">
          ${PRESET_GRADIENTS.map((g, i) => `
            <button class="gradient-swatch ${colors?.gradient === g ? 'selected' : ''}" 
                    data-gradient="${g}" data-type="gradient"
                    style="background: ${g}"></button>
          `).join('')}
        </div>
        <button class="btn-secondary ${!colors?.gradient ? 'selected' : ''}" id="no-gradient">
          Nessun gradiente
        </button>
      </div>
      ` : ''}

      <div class="color-picker-section">
        <label>Testo</label>
        <div class="color-presets">
          ${['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6'].map(c => `
            <button class="color-swatch ${colors?.text === c ? 'selected' : ''}" 
                    data-color="${c}" data-type="text"
                    style="background: ${c}; border: 1px solid ${c === '#ffffff' ? '#333' : c}"></button>
          `).join('')}
        </div>
        <input type="color" id="custom-text" value="${colors?.text || '#ffffff'}" class="color-input">
      </div>

      <div class="color-picker-preview">
        <label>Anteprima</label>
        <div class="preview-box" id="preview-box" style="${getPreviewStyle(colors, type)}">
          Esempio testo
        </div>
      </div>

      <div class="color-picker-actions">
        <button class="btn-secondary" id="reset-colors">Ripristina default</button>
        <button class="btn-primary" id="save-colors">Salva</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Stato corrente
  let selectedColors = { ...colors };

  // Event listeners
  modal.querySelector('#close-picker').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // Color swatches
  modal.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      const type = btn.dataset.type;
      selectedColors[type] = color;
      if (type === 'bg') {
        delete selectedColors.gradient; // Rimuovi gradiente se selezionato colore solido
      }
      updatePreview();
      updateSelection(modal, btn);
    });
  });

  // Gradient swatches
  modal.querySelectorAll('.gradient-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColors.gradient = btn.dataset.gradient;
      delete selectedColors.bg; // Rimuovi bg se selezionato gradiente
      updatePreview();
      updateSelection(modal, btn);
    });
  });

  // No gradient button
  const noGradientBtn = modal.querySelector('#no-gradient');
  if (noGradientBtn) {
    noGradientBtn.addEventListener('click', () => {
      delete selectedColors.gradient;
      if (!selectedColors.bg) selectedColors.bg = '#6366f1';
      updatePreview();
      modal.querySelectorAll('.gradient-swatch').forEach(b => b.classList.remove('selected'));
      noGradientBtn.classList.add('selected');
    });
  }

  // Custom color inputs
  const customBg = modal.querySelector('#custom-bg');
  if (customBg) {
    customBg.addEventListener('input', (e) => {
      selectedColors.bg = e.target.value;
      delete selectedColors.gradient;
      updatePreview();
    });
  }

  const customText = modal.querySelector('#custom-text');
  if (customText) {
    customText.addEventListener('input', (e) => {
      selectedColors.text = e.target.value;
      updatePreview();
    });
  }

  // Reset
  modal.querySelector('#reset-colors').addEventListener('click', async () => {
    await deleteColors(type, projectId, itemId);
    delete colorCache[type === 'project' ? 'projects' : type === 'column' ? 'columns' : 'cards'][itemId || projectId];
    if (onReset) onReset();
    modal.remove();
  });

  // Save
  modal.querySelector('#save-colors').addEventListener('click', async () => {
    await saveColors(type, projectId, itemId, selectedColors);
    // Aggiorna cache
    const cacheKey = type === 'project' ? 'projects' : type === 'column' ? 'columns' : 'cards';
    colorCache[cacheKey][itemId || projectId] = selectedColors;
    if (onSave) onSave(selectedColors);
    modal.remove();
  });

  function updatePreview() {
    const preview = modal.querySelector('#preview-box');
    preview.style.cssText = getPreviewStyle(selectedColors, type);
  }

  function updateSelection(modal, selectedBtn) {
    const type = selectedBtn.dataset.type;
    modal.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.remove('selected'));
    selectedBtn.classList.add('selected');
  }
}

// === CARICA COLORI ===
export async function loadColors(type, projectId, itemId) {
  const cacheKey = type === 'project' ? 'projects' : type === 'column' ? 'columns' : 'cards';
  const id = itemId || projectId;
  
  // Controlla cache
  if (colorCache[cacheKey][id]) {
    return colorCache[cacheKey][id];
  }

  let colors = null;
  try {
    switch (type) {
      case 'project':
        colors = await getProjectColorsOverride(projectId);
        break;
      case 'column':
        colors = await getColumnColors(projectId, itemId);
        break;
      case 'card':
        colors = await getCardColors(projectId, itemId);
        break;
    }
  } catch (err) {
    console.error('Errore caricamento colori:', err);
  }

  if (colors) {
    colorCache[cacheKey][id] = colors;
  }
  return colors;
}

// === SALVA COLORI ===
async function saveColors(type, projectId, itemId, colors) {
  try {
    switch (type) {
      case 'project':
        await setProjectColorsOverride(projectId, colors);
        break;
      case 'column':
        await setColumnColors(projectId, itemId, colors);
        break;
      case 'card':
        await setCardColors(projectId, itemId, colors);
        break;
    }
  } catch (err) {
    console.error('Errore salvataggio colori:', err);
    throw err;
  }
}

// === ELIMINA COLORI ===
async function deleteColors(type, projectId, itemId) {
  try {
    switch (type) {
      case 'project':
        await deleteProjectColorsOverride(projectId);
        break;
      case 'column':
        await deleteColumnColors(projectId, itemId);
        break;
      case 'card':
        await deleteCardColors(projectId, itemId);
        break;
    }
  } catch (err) {
    console.error('Errore eliminazione colori:', err);
  }
}

// === APPLICA COLORI AGLI ELEMENTI DOM ===
export function applyElementColors(element, colors, type) {
  if (!colors) return;

  // Applica il colore base come variabile CSS per i figli
  if (colors.bg && !colors.gradient) {
    const baseColor = colors.bg;
    const rgbaColor = hexToRgba(baseColor, getColorAlpha(type));
    element.style.background = rgbaColor;
    
    // Imposta variabili CSS per elementi figli (maniglie, hover, ecc.)
    element.style.setProperty('--custom-bg', baseColor);
    // Estrai RGB per le regole CSS rgba()
    const rgb = hexToRgb(baseColor);
    element.style.setProperty('--custom-bg-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  } else if (colors.gradient) {
    element.style.background = colors.gradient;
    element.style.removeProperty('--custom-bg');
    element.style.removeProperty('--custom-bg-rgb');
  }

  if (colors.text) {
    element.style.color = colors.text;
  }

  // Aggiungi classe per identificare che ha colori custom
  element.classList.add('has-custom-colors');
  element.dataset.customColors = JSON.stringify(colors);
}

// Converti hex in oggetto RGB
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

// Converti hex in rgba
export function hexToRgba(hex, alpha) {
  // Rimuovi # se presente
  hex = hex.replace('#', '');
  
  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Alpha appropriato per tipo di elemento
export function getColorAlpha(type) {
  switch (type) {
    case 'project': return 0.15;  // Più trasparente per card grandi
    case 'column': return 0.12;    // Medio
    case 'card': return 0.18;     // Più visibile per schede piccole
    default: return 0.15;
  }
}

// === GET PREVIEW STYLE (per anteprima nel modal) ===
function getPreviewStyle(colors, type) {
  // Handle null/undefined colors
  if (!colors) {
    colors = {};
  }

  // Background con alpha appropriato
  let bg;
  if (colors.gradient) {
    bg = colors.gradient;
  } else if (colors.bg) {
    bg = hexToRgba(colors.bg, getColorAlpha(type));
  } else {
    bg = hexToRgba(getDefaultColor(type), getColorAlpha(type));
  }

  const text = colors.text || '#ffffff';

  // Stile compatto solo per anteprima
  return `background: ${bg}; color: ${text}; padding: 0.5rem 1rem; border-radius: 6px;`;
}

// === GET DEFAULT COLOR ===
function getDefaultColor(type) {
  switch (type) {
    case 'project': return '#6366f1';
    case 'column': return '#6366f1';
    case 'card': return '#4c51bf';
    default: return '#6366f1';
  }
}

// === GET TYPE LABEL ===
function getTypeLabel(type) {
  switch (type) {
    case 'project': return 'Progetto';
    case 'column': return 'Lista';
    case 'card': return 'Scheda';
    default: return '';
  }
}

// === CARICA TUTTI I COLORI DI UN PROGETTO ===
export async function loadProjectColors(projectId) {
  try {
    const allColors = await loadAllProjectColors(projectId);
    
    // Popola cache
    if (allColors.project) {
      colorCache.projects[projectId] = allColors.project;
    }
    Object.entries(allColors.columns).forEach(([id, colors]) => {
      colorCache.columns[id] = colors;
    });
    Object.entries(allColors.cards).forEach(([id, colors]) => {
      colorCache.cards[id] = colors;
    });
    
    return allColors;
  } catch (err) {
    console.error('Errore caricamento colori progetto:', err);
    return { project: null, columns: {}, cards: {} };
  }
}

// === INVALIDA CACHE ===
export function invalidateColorCache(type, id) {
  const cacheKey = type === 'project' ? 'projects' : type === 'column' ? 'columns' : 'cards';
  delete colorCache[cacheKey][id];
}

console.log('✅ Color Picker module loaded');
