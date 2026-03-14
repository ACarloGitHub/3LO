// Database SQLite per 3LO
import Database from '@tauri-apps/plugin-sql';

let db = null;

// Inizializza database
export async function initDB() {
  if (db) return db;
  
  // Apri/crea database SQLite in cartella app
  db = await Database.load('sqlite:3lo.db');
  
  // Crea tabelle se non esistono
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created INTEGER,
      sort_order INTEGER DEFAULT 0,
      data TEXT  -- JSON con board, cards, ecc.
    )
  `);
  
  // Migrazione: aggiungi sort_order se non esiste (per progetti esistenti)
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0`);
  } catch (e) {
    // Colonna già esistente, ignoriamo l'errore
  }
  
  // Tabella per metadata aggiuntivi (es. last_export_path)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_metadata (
      project_id TEXT PRIMARY KEY,
      last_export_path TEXT,
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
    created: row.created
  }));
}

// Salva progetto con tutti i dati
export async function saveProject(project, boardData = null, cardsData = null) {
  const db = await initDB();
  const data = JSON.stringify({ board: boardData, cards: cardsData });
  
  await db.execute(`
    INSERT OR REPLACE INTO projects (id, name, created, data)
    VALUES (?, ?, ?, ?)
  `, [project.id, project.name, project.created || Date.now(), data]);
}

// Carica progetto completo
export async function loadProject(projectId) {
  const db = await initDB();
  const result = await db.select('SELECT * FROM projects WHERE id = ?', [projectId]);
  
  if (result.length === 0) return null;
  
  const row = result[0];
  const data = JSON.parse(row.data || '{}');
  
  return {
    project: {
      id: row.id,
      name: row.name,
      created: row.created
    },
    board: data.board || [],
    cards: data.cards || {}
  };
}

// Elimina progetto
export async function deleteProject(projectId) {
  const db = await initDB();
  await db.execute('DELETE FROM projects WHERE id = ?', [projectId]);
}

// Rinomina progetto (solo nome, dati invariati)
export async function renameProject(projectId, newName) {
  const db = await initDB();
  await db.execute(
    'UPDATE projects SET name = ? WHERE id = ?',
    [newName, projectId]
  );
}

// Esporta tutto (per backup)
export async function exportAll() {
  const db = await initDB();
  const projects = await db.select('SELECT * FROM projects');
  
  return projects.map(row => {
    const data = JSON.parse(row.data || '{}');
    return {
      version: '1.0',
      project: {
        id: row.id,
        name: row.name,
        created: row.created
      },
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

// Salva ultimo path di export per un progetto
export async function saveLastExportPath(projectId, filePath) {
  const db = await initDB();
  await db.execute(`
    INSERT OR REPLACE INTO project_metadata (project_id, last_export_path)
    VALUES (?, ?)
  `, [projectId, filePath]);
}

// Carica ultimo path di export per un progetto
export async function getLastExportPath(projectId) {
  const db = await initDB();
  const result = await db.select(
    'SELECT last_export_path FROM project_metadata WHERE project_id = ?',
    [projectId]
  );
  return result.length > 0 ? result[0].last_export_path : null;
}

// Salva ordine dei progetti (dopo drag & drop)
export async function saveProjectOrder(orderedProjects) {
  const db = await initDB();
  
  // Aggiorna sort_order per ogni progetto
  for (let i = 0; i < orderedProjects.length; i++) {
    await db.execute(
      'UPDATE projects SET sort_order = ? WHERE id = ?',
      [i, orderedProjects[i].id]
    );
  }
}

// Chiudi connessione (chiamare all'uscita)
export async function closeDB() {
  if (db) {
    await db.close();
    db = null;
  }
}
