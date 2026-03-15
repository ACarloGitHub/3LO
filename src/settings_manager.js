// Settings Manager - Gestisce settings.json per colori e preferenze UI
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';

const SETTINGS_FILE = 'settings.json';
const SETTINGS_DIR = 'settings';

// Default settings
const DEFAULT_SETTINGS = {
  version: '1.0',
  colors: {
    projects: {},      // { projectId: { bg, text, gradient } }
    cards: {},       // { cardId: { bg, text } }
    columns: {}      // { columnId: { bg, text } }
  },
  ui: {
    zoomLevel: 1.0,
    lastExportPath: null,
    theme: 'default'
  },
  updatedAt: null
};

let settings = null;
let settingsPath = null;

// Inizializza settings
export async function initSettings() {
  if (settings) return settings;
  
  try {
    // OTTIENI IL PERCORSO BASE DALLA FUNZIONE RUST
    const basePath = await invoke('get_app_base_path');
    
    // Crea la cartella settings se non esiste
    const settingsDir = await join(basePath, SETTINGS_DIR);
    const settingsDirExists = await exists(settingsDir);
    if (!settingsDirExists) {
      await mkdir(settingsDir, { recursive: true });
    }
    
    settingsPath = await join(settingsDir, SETTINGS_FILE);
    
    // Controlla se il file esiste
    const fileExists = await exists(settingsPath);
    
    if (fileExists) {
      // Carica settings esistenti
      const content = await readTextFile(settingsPath);
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    } else {
      // Crea settings default
      settings = { ...DEFAULT_SETTINGS };
      await saveSettings();
    }
    
    return settings;
  } catch (err) {
    console.error('Errore inizializzazione settings:', err);
    settings = { ...DEFAULT_SETTINGS };
    return settings;
  }
}

// Salva settings su file
export async function saveSettings() {
  if (!settings) return;
  
  try {
    settings.updatedAt = new Date().toISOString();
    const content = JSON.stringify(settings, null, 2);
    
    if (!settingsPath) {
      const basePath = await invoke('get_app_base_path');
      const settingsDir = await join(basePath, SETTINGS_DIR);
      settingsPath = await join(settingsDir, SETTINGS_FILE);
    }
    
    await writeTextFile(settingsPath, content);
  } catch (err) {
    console.error('Errore salvataggio settings:', err);
  }
}

// Get/Set colori progetto
export async function getProjectColors(projectId) {
  await initSettings();
  return settings.colors.projects[projectId] || null;
}

export async function setProjectColors(projectId, colors) {
  await initSettings();
  settings.colors.projects[projectId] = colors;
  await saveSettings();
}

// Get/Set colori scheda
export async function getCardColors(cardId) {
  await initSettings();
  return settings.colors.cards[cardId] || null;
}

export async function setCardColors(cardId, colors) {
  await initSettings();
  settings.colors.cards[cardId] = colors;
  await saveSettings();
}

// Get/Set colori colonna
export async function getColumnColors(columnId) {
  await initSettings();
  return settings.colors.columns[columnId] || null;
}

export async function setColumnColors(columnId, colors) {
  await initSettings();
  settings.colors.columns[columnId] = colors;
  await saveSettings();
}

// Get/Set UI settings
export async function getUISetting(key) {
  await initSettings();
  return settings.ui[key];
}

export async function setUISetting(key, value) {
  await initSettings();
  settings.ui[key] = value;
  await saveSettings();
}

// Esporta tutti i settings (per backup)
export async function exportSettings() {
  await initSettings();
  return JSON.parse(JSON.stringify(settings));
}

// Importa settings (da backup)
export async function importSettings(newSettings) {
  settings = { ...DEFAULT_SETTINGS, ...newSettings };
  await saveSettings();
}