// Database SQLite per 3LO - VERSIONE PORTABLE
import Database from '@tauri-apps/plugin-sql';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { mkdir, exists } from '@tauri-apps/plugin-fs';

let db = null;
let dbPath = null;

// Inizializza database
export async function initDB() {
  if (db) return db;
  
  // OTTIENI IL PERCORSO BASE DALLA FUNZIONE RUST
  const basePath = await invoke('get_app_base_path');
  console.log('Base path from Rust:', basePath);
  
  // Crea la cartella data se non esiste
  const dataDir = await join(basePath, 'data');
  console.log('Data dir:', dataDir);
  const dataDirExists = await exists(dataDir);
  if (!dataDirExists) {
    await mkdir(dataDir, { recursive: true });
  }
  
  // Percorso del database
  dbPath = await join(dataDir, '3lo.db');
  
  // Apri/crea database SQLite
  db = await Database.load(`sqlite:${dbPath}`);
  
  // Crea tabelle se non esistono
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created INTEGER,
      sort_order INTEGER DEFAULT 0,
      last_modified INTEGER DEFAULT 0,
      data TEXT
    )
  `);
  
  // Migrazione: aggiungi sort_order se non esiste
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0`);
  } catch (e) {
    // Colonna già esistente
  }
  
  // Migrazione: aggiungi last_modified se non esiste
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN last_modified INTEGER DEFAULT 0`);
  } catch (e) {
    // Colonna già esistente
  }
  
  // Migrazione: aggiungi last_content_change se non esiste
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN last_content_change INTEGER DEFAULT 0`);
  } catch (e) {
    // Colonna già esistente
  }
  
  // Tabella per metadata
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_metadata (
      project_id TEXT PRIMARY KEY,
      last_export_path TEXT,
      json_path TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // === LOGIN SYSTEM ===
  // Tabella utenti
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_login INTEGER
    )
  `);

  // Tabella sessioni
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabella project_owners (many-to-many)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_owners (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      role TEXT DEFAULT 'owner',
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migrazioni: aggiungi visibility e created_by a projects
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN visibility TEXT DEFAULT 'public_rw'`);
  } catch (e) {
    // Colonna già esistente
  }
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN created_by TEXT REFERENCES users(id)`);
  } catch (e) {
    // Colonna già esistente
  }
  
  // === NUOVO SISTEMA VISIBILITÀ ===
  // Aggiungi is_visible (boolean, default true)
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN is_visible INTEGER DEFAULT 1`);
  } catch (e) {
    // Colonna già esistente
  }
  
  // Aggiungi is_locked (boolean, default 0)
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN is_locked INTEGER DEFAULT 0`);
  } catch (e) {
    // Colonna già esistente
  }
  
  // Migrazione: converti visibility (stringa) → is_visible + is_locked (solo se is_visible è NULL)
  const projectsToMigrate = await db.select(`SELECT id, visibility FROM projects WHERE visibility IS NOT NULL AND is_visible IS NULL`);
  for (const proj of projectsToMigrate) {
    let isVisible = 1;
    let isLocked = 0;
    
    switch (proj.visibility) {
      case 'public_rw':
        isVisible = 1;
        isLocked = 0;
        break;
      case 'public_ro':
        isVisible = 1;
        isLocked = 0;
        break;
      case 'locked':
        isVisible = 1;
        isLocked = 1;
        break;
      case 'private':
        isVisible = 0;
        isLocked = 1;
        break;
    }
    
    await db.execute(
      `UPDATE projects SET is_visible = ?, is_locked = ? WHERE id = ?`,
      [isVisible, isLocked, proj.id]
    );
  }
  
  // Migrazione: aggiungi json_path se non esiste
  try {
    await db.execute(`ALTER TABLE project_metadata ADD COLUMN json_path TEXT`);
  } catch (e) {
    // Colonna già esistente
  }
  
  // === SISTEMA CONDIVISIONE ===
  // Tabella project_shares per permessi granulari
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_shares (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      can_view INTEGER DEFAULT 0,
      can_open INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // === COLORE UTENTE ===
  // Aggiungi colonna color alla tabella users
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN color TEXT DEFAULT '#4CAF50'`);
  } catch (e) {
    // Colonna già esistente
  }

  // === COLORI PERSONALIZZATI — OVERRIDE SYSTEM ===
  // Tabella per colori specifici di colonne (liste)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS column_colors (
      project_id TEXT NOT NULL,
      column_id TEXT NOT NULL,
      bg_color TEXT,
      text_color TEXT,
      gradient TEXT,
      updated_at INTEGER DEFAULT 0,
      PRIMARY KEY (project_id, column_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Tabella per colori specifici di schede
  await db.execute(`
    CREATE TABLE IF NOT EXISTS card_colors (
      project_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      bg_color TEXT,
      text_color TEXT,
      updated_at INTEGER DEFAULT 0,
      PRIMARY KEY (project_id, card_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Tabella per colori specifici di progetti (override settings.json)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_colors (
      project_id TEXT PRIMARY KEY,
      bg_color TEXT,
      text_color TEXT,
      gradient TEXT,
      updated_at INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  return db;
}

// Ottieni tutti i progetti
export async function getAllProjects() {
  const db = await initDB();
  const result = await db.select('SELECT * FROM projects ORDER BY sort_order ASC, created DESC');
  return result.map(row => ({
    id: row.id,
    name: row.name,
    created: row.created,
    created_by: row.created_by || null,
    is_visible: row.is_visible !== 0, // Converti 0/1 → boolean
    is_locked: row.is_locked === 1    // Converti 0/1 → boolean
  }));
}

// Salva progetto
// contentChanged: true se i dati sono stati modificati dall'utente (default: true)
export async function saveProject(project, boardData = null, cardsData = null, contentChanged = true) {
  const db = await initDB();
  const data = JSON.stringify({ board: boardData, cards: cardsData });
  const now = Date.now();
  
  // Usa INSERT ... ON CONFLICT per NON cancellare la riga (evita CASCADE su project_metadata)
  if (contentChanged) {
    // Aggiorna sia last_modified che last_content_change
    await db.execute(
      `INSERT INTO projects (id, name, created, last_modified, last_content_change, data) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON CONFLICT(id) DO UPDATE SET 
         name = excluded.name,
         last_modified = excluded.last_modified,
         last_content_change = excluded.last_content_change,
         data = excluded.data`,
      [project.id, project.name, project.created || now, now, now, data]
    );
  } else {
    // Aggiorna solo last_modified (es. salvataggio automatico su blur)
    await db.execute(
      `INSERT INTO projects (id, name, created, last_modified, data) 
       VALUES (?, ?, ?, ?, ?) 
       ON CONFLICT(id) DO UPDATE SET 
         name = excluded.name,
         last_modified = excluded.last_modified,
         data = excluded.data`,
      [project.id, project.name, project.created || now, now, data]
    );
  }
}

// Carica progetto
export async function loadProject(projectId) {
  const db = await initDB();
  const result = await db.select('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (result.length === 0) return null;
  const row = result[0];
  const data = JSON.parse(row.data || '{}');
  return {
    project: { id: row.id, name: row.name, created: row.created },
    board: data.board || [],
    cards: data.cards || {}
  };
}

// Elimina progetto
export async function deleteProject(projectId) {
  const db = await initDB();
  // Elimina prima i colori associati (per evitare errori FK)
  await deleteAllProjectColors(projectId);
  await db.execute('DELETE FROM projects WHERE id = ?', [projectId]);
}

// Rinomina progetto
export async function renameProject(projectId, newName) {
  const db = await initDB();
  await db.execute('UPDATE projects SET name = ? WHERE id = ?', [newName, projectId]);
}

// Esporta tutto
export async function exportAll() {
  const db = await initDB();
  const projects = await db.select('SELECT * FROM projects');
  return projects.map(row => {
    const data = JSON.parse(row.data || '{}');
    return {
      version: '1.0',
      project: { id: row.id, name: row.name, created: row.created },
      board: data.board || [],
      cards: data.cards || {},
      exportedAt: new Date().toISOString()
    };
  });
}

// Importa progetto
export async function importProject(exportData) {
  const { project, board, cards } = exportData;
  await saveProject(project, board, cards);
}

// Salva ultimo path di export (preserva altre colonne)
export async function saveLastExportPath(projectId, filePath) {
  const db = await initDB();
  console.log('💾 [DB] saveLastExportPath:', { projectId, filePath });
  // Crea riga se non esiste
  await db.execute(
    `INSERT OR IGNORE INTO project_metadata (project_id) VALUES (?)`,
    [projectId]
  );
  // Aggiorna solo last_export_path
  await db.execute(
    `UPDATE project_metadata SET last_export_path = ? WHERE project_id = ?`,
    [filePath, projectId]
  );
  console.log('✅ [DB] saveLastExportPath completato');
}

// Carica ultimo path di export
export async function getLastExportPath(projectId) {
  const db = await initDB();
  const result = await db.select(
    'SELECT last_export_path FROM project_metadata WHERE project_id = ?',
    [projectId]
  );
  return result.length > 0 ? result[0].last_export_path : null;
}

// Salva path JSON per refresh (preserva altre colonne)
export async function saveJsonPath(projectId, jsonPath) {
  const db = await initDB();
  console.log('💾 [DB] saveJsonPath:', { projectId, jsonPath });
  // Crea riga se non esiste (INSERT OR IGNORE non sovrascrive)
  await db.execute(
    `INSERT OR IGNORE INTO project_metadata (project_id) VALUES (?)`,
    [projectId]
  );
  // Aggiorna solo json_path
  await db.execute(
    `UPDATE project_metadata SET json_path = ? WHERE project_id = ?`,
    [jsonPath, projectId]
  );
  console.log('✅ [DB] saveJsonPath completato');
}

// Carica path JSON (usa last_export_path come fallback)
export async function getJsonPath(projectId) {
  const db = await initDB();
  console.log('📖 [DB] getJsonPath:', projectId);
  const result = await db.select(
    'SELECT json_path, last_export_path FROM project_metadata WHERE project_id = ?',
    [projectId]
  );
  console.log('📖 [DB] getJsonPath result:', result);
  if (result.length > 0) {
    const path = result[0].json_path || result[0].last_export_path || null;
    console.log('📖 [DB] getJsonPath returning:', path);
    return path;
  }
  console.log('⚠️ [DB] getJsonPath: nessun risultato');
  return null;
}

// Carica last_modified di un progetto
export async function getProjectLastModified(projectId) {
  const db = await initDB();
  const result = await db.select(
    'SELECT last_modified FROM projects WHERE id = ?',
    [projectId]
  );
  return result.length > 0 ? result[0].last_modified : 0;
}

// Carica last_content_change di un progetto (per confronto sincronizzazione)
export async function getProjectLastContentChange(projectId) {
  const db = await initDB();
  const result = await db.select(
    'SELECT last_content_change FROM projects WHERE id = ?',
    [projectId]
  );
  return result.length > 0 ? result[0].last_content_change : 0;
}

// Salva ordine progetti
export async function saveProjectOrder(orderedProjects) {
  const db = await initDB();
  for (let i = 0; i < orderedProjects.length; i++) {
    await db.execute(
      'UPDATE projects SET sort_order = ? WHERE id = ?',
      [i, orderedProjects[i].id]
    );
  }
}

// === COLORI PERSONALIZZATI — GET/SET FUNCTIONS ===

// --- COLORI COLONNE (LISTE) ---
export async function getColumnColors(projectId, columnId) {
  const db = await initDB();
  const result = await db.select(
    'SELECT bg_color, text_color, gradient FROM column_colors WHERE project_id = ? AND column_id = ?',
    [projectId, columnId]
  );
  if (result.length === 0) return null;
  return {
    bg: result[0].bg_color,
    text: result[0].text_color,
    gradient: result[0].gradient
  };
}

export async function setColumnColors(projectId, columnId, colors) {
  const db = await initDB();
  const now = Date.now();
  await db.execute(
    `INSERT INTO column_colors (project_id, column_id, bg_color, text_color, gradient, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(project_id, column_id) DO UPDATE SET
       bg_color = excluded.bg_color,
       text_color = excluded.text_color,
       gradient = excluded.gradient,
       updated_at = excluded.updated_at`,
    [projectId, columnId, colors.bg || null, colors.text || null, colors.gradient || null, now]
  );
}

export async function deleteColumnColors(projectId, columnId) {
  const db = await initDB();
  await db.execute(
    'DELETE FROM column_colors WHERE project_id = ? AND column_id = ?',
    [projectId, columnId]
  );
}

// --- COLORI SCHEDE ---
export async function getCardColors(projectId, cardId) {
  const db = await initDB();
  const result = await db.select(
    'SELECT bg_color, text_color FROM card_colors WHERE project_id = ? AND card_id = ?',
    [projectId, cardId]
  );
  if (result.length === 0) return null;
  return {
    bg: result[0].bg_color,
    text: result[0].text_color
  };
}

export async function setCardColors(projectId, cardId, colors) {
  const db = await initDB();
  const now = Date.now();
  await db.execute(
    `INSERT INTO card_colors (project_id, card_id, bg_color, text_color, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id, card_id) DO UPDATE SET
       bg_color = excluded.bg_color,
       text_color = excluded.text_color,
       updated_at = excluded.updated_at`,
    [projectId, cardId, colors.bg || null, colors.text || null, now]
  );
}

export async function deleteCardColors(projectId, cardId) {
  const db = await initDB();
  await db.execute(
    'DELETE FROM card_colors WHERE project_id = ? AND card_id = ?',
    [projectId, cardId]
  );
}

// --- COLORI PROGETTI (OVERRIDE) ---
export async function getProjectColorsOverride(projectId) {
  const db = await initDB();
  const result = await db.select(
    'SELECT bg_color, text_color, gradient FROM project_colors WHERE project_id = ?',
    [projectId]
  );
  if (result.length === 0) return null;
  return {
    bg: result[0].bg_color,
    text: result[0].text_color,
    gradient: result[0].gradient
  };
}

export async function setProjectColorsOverride(projectId, colors) {
  const db = await initDB();
  const now = Date.now();
  await db.execute(
    `INSERT INTO project_colors (project_id, bg_color, text_color, gradient, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id) DO UPDATE SET
       bg_color = excluded.bg_color,
       text_color = excluded.text_color,
       gradient = excluded.gradient,
       updated_at = excluded.updated_at`,
    [projectId, colors.bg || null, colors.text || null, colors.gradient || null, now]
  );
}

export async function deleteProjectColorsOverride(projectId) {
  const db = await initDB();
  await db.execute(
    'DELETE FROM project_colors WHERE project_id = ?',
    [projectId]
  );
}

// --- CARICA TUTTI I COLORI DI UN PROGETTO (per inizializzazione UI) ---
export async function loadAllProjectColors(projectId) {
  const db = await initDB();
  
  // Colori progetto
  const projectColors = await getProjectColorsOverride(projectId);
  
  // Colori colonne
  const columnColorsResult = await db.select(
    'SELECT column_id, bg_color, text_color, gradient FROM column_colors WHERE project_id = ?',
    [projectId]
  );
  const columnColors = {};
  for (const row of columnColorsResult) {
    columnColors[row.column_id] = {
      bg: row.bg_color,
      text: row.text_color,
      gradient: row.gradient
    };
  }
  
  // Colori schede
  const cardColorsResult = await db.select(
    'SELECT card_id, bg_color, text_color FROM card_colors WHERE project_id = ?',
    [projectId]
  );
  const cardColors = {};
  for (const row of cardColorsResult) {
    cardColors[row.card_id] = {
      bg: row.bg_color,
      text: row.text_color
    };
  }
  
  return {
    project: projectColors,
    columns: columnColors,
    cards: cardColors
  };
}

// --- ELIMINA TUTTI I COLORI QUANDO SI ELIMINA UN PROGETTO ---
export async function deleteAllProjectColors(projectId) {
  const db = await initDB();
  await db.execute('DELETE FROM project_colors WHERE project_id = ?', [projectId]);
  await db.execute('DELETE FROM column_colors WHERE project_id = ?', [projectId]);
  await db.execute('DELETE FROM card_colors WHERE project_id = ?', [projectId]);
}

// Chiudi connessione
export async function closeDB() {
  if (db) {
    await db.close();
    db = null;
  }
}

// Ottieni percorso database (per debug)
export function getDBPath() {
  return dbPath;
}