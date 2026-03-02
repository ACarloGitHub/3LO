// 3LO Database - SQLite via Tauri

import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "sqlite:3lo.db";
let db = null;

export async function initDB() {
  db = await Database.load(DB_NAME);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    )
  `);
}

export async function getAllProjects() {
  return await db.select("SELECT * FROM projects ORDER BY created_at DESC");
}

export async function createProject(name) {
  const result = await db.execute("INSERT INTO projects (name, created_at) VALUES (?, ?)", [name, Date.now()]);
  return result.lastInsertId;
}

export async function deleteProject(id) {
  await db.execute("DELETE FROM projects WHERE id = ?", [id]);
}

export async function getBoard(projectId) {
  const columns = await db.select("SELECT * FROM columns WHERE project_id = ? ORDER BY position", [projectId]);
  for (const col of columns) {
    col.cards = await db.select("SELECT * FROM cards WHERE column_id = ? ORDER BY position", [col.id]);
  }
  return columns;
}

export async function createColumn(projectId, title, position) {
  const result = await db.execute("INSERT INTO columns (project_id, title, position) VALUES (?, ?, ?)", [projectId, title, position]);
  return result.lastInsertId;
}

export async function updateColumnTitle(id, title) {
  await db.execute("UPDATE columns SET title = ? WHERE id = ?", [title, id]);
}

export async function deleteColumn(id) {
  await db.execute("DELETE FROM columns WHERE id = ?", [id]);
}

export async function createCard(columnId, text, position) {
  const result = await db.execute("INSERT INTO cards (column_id, text, position) VALUES (?, ?, ?)", [columnId, text, position]);
  return result.lastInsertId;
}

export async function updateCardText(id, text) {
  await db.execute("UPDATE cards SET text = ? WHERE id = ?", [text, id]);
}

export async function deleteCard(id) {
  await db.execute("DELETE FROM cards WHERE id = ?", [id]);
}

export async function updateCardPosition(id, columnId, position) {
  await db.execute("UPDATE cards SET column_id = ?, position = ? WHERE id = ?", [columnId, position, id]);
}

export async function updateColumnPosition(id, position) {
  await db.execute("UPDATE columns SET position = ? WHERE id = ?", [position, id]);
}
,
