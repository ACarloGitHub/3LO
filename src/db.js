// 3LO Database Layer - SQLite via Tauri SQL Plugin
// Wraps localStorage with SQLite persistence

const DB_PATH = 'sqlite:3lo.db';
let db = null;
let useSQLite = false;

// Initialize database connection
async function initDB() {
  // Check if Tauri SQL plugin is available
  if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.sql) {
    try {
      const { Database } = window.__TAURI__.sql;
      db = await Database.load(DB_PATH);
      await initSchema();
      useSQLite = true;
      console.log('SQLite connected');
      
      // Load data from SQLite to localStorage (sync)
      await syncFromSQLite();
    } catch (err) {
      console.error('SQLite error, using localStorage:', err);
      useSQLite = false;
    }
  } else {
    console.log('Tauri SQL not available, using localStorage only');
    useSQLite = false;
  }
}

// Initialize schema
async function initSchema() {
  if (!db) return;
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL,
      note TEXT DEFAULT '',
      icon TEXT DEFAULT '🌙',
      archived INTEGER DEFAULT 0
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      color TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      text TEXT NOT NULL,
      position INTEGER NOT NULL,
      color TEXT DEFAULT '',
      due_date INTEGER,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL,
      note TEXT DEFAULT ''
    );
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_columns_project ON columns(project_id);
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
    CREATE INDEX IF NOT EXISTS idx_cards_project ON cards(project_id);
  `);
}

// Sync SQLite data to localStorage (for UI compatibility)
async function syncFromSQLite() {
  if (!db) return;
  
  try {
    // Load projects
    const projects = await db.select('SELECT * FROM projects WHERE archived = 0 ORDER BY modified_at DESC');
    localStorage.setItem('3lo_projects', JSON.stringify(projects.map(p => ({
      id: p.id,
      name: p.name,
      created: Number(p.created_at),
      icon: p.icon
    }))));
    
    // Load settings for each project
    const projectsData = {};
    for (const p of projects) {
      projectsData[p.id] = {
        created: Number(p.created_at),
        modified: Number(p.modified_at),
        note: p.note || ''
      };
      
      // Load board for this project
      const columns = await db.select('SELECT * FROM columns WHERE project_id = ? ORDER BY position', [p.id]);
      const board = [];
      
      for (const col of columns) {
        const cards = await db.select('SELECT * FROM cards WHERE column_id = ? ORDER BY position', [col.id]);
        board.push({
          id: col.id,
          title: col.title,
          cards: cards.map(c => ({
            id: c.id,
            text: c.text
          }))
        });
        
        // Save card data
        const cardsData = {};
        for (const c of cards) {
          cardsData[c.id] = {
            created: Number(c.created_at),
            modified: Number(c.modified_at),
            note: c.note || ''
          };
        }
        localStorage.setItem('3lo_cards_data_' + p.id, JSON.stringify(cardsData));
      }
      
      localStorage.setItem('3lo_board_' + p.id, JSON.stringify(board));
    }
    
    localStorage.setItem('3lo_projects_data', JSON.stringify(projectsData));
    console.log('Synced from SQLite to localStorage');
  } catch (err) {
    console.error('Sync error:', err);
  }
}

// Save projects to SQLite
async function saveProjectsToSQLite() {
  if (!db) return;
  
  try {
    const projects = JSON.parse(localStorage.getItem('3lo_projects') || '[]');
    const projectsData = JSON.parse(localStorage.getItem('3lo_projects_data') || '{}');
    
    for (const proj of projects) {
      const data = projectsData[proj.id] || {};
      const now = Date.now();
      
      await db.execute(`
        INSERT OR REPLACE INTO projects (id, name, created_at, modified_at, note, icon)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        String(proj.id),
        proj.name,
        data.created || proj.created || now,
        data.modified || now,
        data.note || '',
        proj.icon || '🌙'
      ]);
      
      // Save board/columns
      const board = JSON.parse(localStorage.getItem('3lo_board_' + proj.id) || '[]');
      const cardsData = JSON.parse(localStorage.getItem('3lo_cards_data_' + proj.id) || '{}');
      
      for (let i = 0; i < board.length; i++) {
        const col = board[i];
        await db.execute(`
          INSERT OR REPLACE INTO columns (id, project_id, title, position, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          String(col.id),
          String(proj.id),
          col.title,
          i,
          now
        ]);
        
        // Save cards
        for (let j = 0; j < (col.cards || []).length; j++) {
          const card = col.cards[j];
          const cardMeta = cardsData[card.id] || {};
          
          await db.execute(`
            INSERT OR REPLACE INTO cards 
            (id, column_id, project_id, text, position, created_at, modified_at, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(card.id),
            String(col.id),
            String(proj.id),
            card.text,
            j,
            cardMeta.created || now,
            cardMeta.modified || now,
            cardMeta.note || ''
          ]);
        }
      }
    }
    
    console.log('Saved to SQLite');
  } catch (err) {
    console.error('Save to SQLite error:', err);
  }
}

// Hook into localStorage to auto-sync
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  originalSetItem(key, value);
  
  // Auto-sync to SQLite on relevant changes
  if (key === '3lo_projects' || key.startsWith('3lo_board_') || key.startsWith('3lo_cards_data_')) {
    if (useSQLite && db) {
      saveProjectsToSQLite();
    }
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initDB().then(() => {
    console.log('DB initialized, SQLite:', useSQLite);
  });
});

// Export for manual sync
window.db3LO = {
  sync: saveProjectsToSQLite,
  reload: syncFromSQLite,
  hasSQLite: () => useSQLite
};