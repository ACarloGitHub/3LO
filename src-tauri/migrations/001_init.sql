-- 3LO Database Schema v1.0
-- SQLite migration for project management

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    note TEXT DEFAULT '',
    icon TEXT DEFAULT '🌙',
    archived INTEGER DEFAULT 0
);

-- Columns (lists) within projects
CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Cards within columns
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
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Card additional data (metadata, notes)
CREATE TABLE IF NOT EXISTS card_data (
    card_id TEXT PRIMARY KEY,
    note TEXT DEFAULT '',
    attachments TEXT DEFAULT '[]', -- JSON array of file paths
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Settings per project
CREATE TABLE IF NOT EXISTS project_settings (
    project_id TEXT PRIMARY KEY,
    anxiety_mode INTEGER DEFAULT 0,
    header_color TEXT DEFAULT '',
    background_type TEXT DEFAULT 'gradient', -- gradient, solid, image
    background_value TEXT DEFAULT '',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_columns_project ON columns(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_project ON cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_modified ON cards(modified_at);

-- Initial data: default columns structure template
INSERT OR IGNORE INTO projects (id, name, created_at, modified_at, note) 
VALUES ('template_kanban', '_TEMPLATE_KANBAN_', 0, 0, 'Template for new Kanban projects');

INSERT OR IGNORE INTO columns (id, project_id, title, position, created_at) VALUES
('col_todo', 'template_kanban', 'To Do', 0, 0),
('col_progress', 'template_kanban', 'In Progress', 1, 0),
('col_done', 'template_kanban', 'Done', 2, 0);