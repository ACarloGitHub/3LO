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
      data TEXT  -- JSON con board, cards, ecc.
    )
  `);
  
  return db;
}

// Ottieni tutti i progetti
export async function getAllProjects() {
  const db = await initDB();
  const result = await db.select('SELECT * FROM projects ORDER BY created DESC');
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

// Chiudi connessione (chiamare all'uscita)
export async function closeDB() {
  if (db) {
    await db.close();
    db = null;
  }
}
