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
  
  // Migrazione: aggiungi json_path se non esiste
  try {
    await db.execute(`ALTER TABLE project_metadata ADD COLUMN json_path TEXT`);
  } catch (e) {
    // Colonna già esistente
  }
  
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
    visibility: row.visibility || 'public_rw'
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