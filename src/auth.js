// Login System for 3LO
import { initDB } from './db_sqlite.js';

// Utility: genera ID univoco
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Utility: hash password (SHA-256)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// === UTENTI ===

// Register new user
export async function registerUser(username, password) {
  const db = await initDB();
  
  // Verifica se username esiste già
  const existing = await db.select('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    throw new Error('Username already exists');
  }
  
  const userId = generateId();
  const passwordHash = await hashPassword(password);
  const now = Date.now();
  
  await db.execute(
    'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
    [userId, username, passwordHash, now]
  );
  
  return { id: userId, username, createdAt: now };
}

// Login user
export async function loginUser(username, password) {
  const db = await initDB();
  
  const passwordHash = await hashPassword(password);
  const result = await db.select(
    'SELECT id, username, created_at FROM users WHERE username = ? AND password_hash = ?',
    [username, passwordHash]
  );
  
  if (result.length === 0) {
    throw new Error('Invalid credentials');
  }
  
  const user = result[0];
  
  // Create session
  const sessionId = generateId();
  const now = Date.now();
  const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days
  
  await db.execute(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [sessionId, user.id, now, expiresAt]
  );
  
  // Update last_login
  await db.execute('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);
  
  return { 
    sessionId, 
    user: { id: user.id, username: user.username } 
  };
}

// Logout (delete session)
export async function logoutUser(sessionId) {
  const db = await initDB();
  await db.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

// Verifica sessione
export async function verifySession(sessionId) {
  const db = await initDB();
  const now = Date.now();
  
  const result = await db.select(`
    SELECT s.id as session_id, s.user_id, u.username, s.expires_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `, [sessionId, now]);
  
  if (result.length === 0) {
    return null;
  }
  
  return { 
    sessionId: result[0].session_id, 
    userId: result[0].user_id, 
    username: result[0].username 
  };
}

// Get current user (from session)
export async function getCurrentUser(sessionId) {
  return verifySession(sessionId);
}

// Delete user (with options for projects)
// options: 'delete' | 'backup' | 'make_public'
export async function deleteUser(userId, sessionId, options = 'make_public') {
  const db = await initDB();
  
  // Verify session belongs to user
  const session = await verifySession(sessionId);
  if (!session || session.userId !== userId) {
    throw new Error('Unauthorized');
  }
  
  // Handle user's projects
  if (options === 'delete') {
    // Delete all user's projects
    await db.execute('DELETE FROM projects WHERE created_by = ?', [userId]);
  } else if (options === 'make_public') {
    // Make all user's projects public
    await db.execute(
      'UPDATE projects SET visibility = ?, created_by = NULL WHERE created_by = ?',
      ['public_rw', userId]
    );
  }
  // 'backup' is handled externally (save to folder)
  
  // Delete user's sessions
  await db.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
  
  // Delete from project_owners
  await db.execute('DELETE FROM project_owners WHERE user_id = ?', [userId]);
  
  // Delete user
  await db.execute('DELETE FROM users WHERE id = ?', [userId]);
}

// === PROJECT VISIBILITY ===

// Change project visibility
export async function setProjectVisibility(projectId, visibility, sessionId) {
  const db = await initDB();
  
  // Verify session
  const session = await verifySession(sessionId);
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  // Verify ownership
  const isOwner = await isProjectOwner(projectId, session.userId);
  if (!isOwner) {
    throw new Error('You are not the owner of this project');
  }
  
  const validVisibilities = ['public_rw', 'public_ro', 'locked', 'private'];
  if (!validVisibilities.includes(visibility)) {
    throw new Error('Invalid visibility');
  }
  
  await db.execute(
    'UPDATE projects SET visibility = ? WHERE id = ?',
    [visibility, projectId]
  );
}

// Claim orphan project
export async function claimProject(projectId, sessionId) {
  const db = await initDB();
  
  const session = await verifySession(sessionId);
  if (!session) {
    throw new Error('You must be logged in to claim a project');
  }
  
  // Verify project is orphan
  const project = await db.select(
    'SELECT created_by FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (project.length === 0) {
    throw new Error('Project not found');
  }
  
  if (project[0].created_by !== null) {
    throw new Error('This project already has an owner');
  }
  
  const now = Date.now();
  
  // Set ownership
  await db.execute(
    'UPDATE projects SET created_by = ?, visibility = ? WHERE id = ?',
    [session.userId, 'private', projectId]
  );
  
  // Add to project_owners
  await db.execute(
    'INSERT INTO project_owners (project_id, user_id, added_at) VALUES (?, ?, ?)',
    [projectId, session.userId, now]
  );
}

// Add co-owner to project
export async function addProjectOwner(projectId, newOwnerUsername, sessionId) {
  const db = await initDB();
  
  const session = await verifySession(sessionId);
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  // Verify ownership
  const isOwner = await isProjectOwner(projectId, session.userId);
  if (!isOwner) {
    throw new Error('You are not the owner of this project');
  }
  
  // Find user to add
  const user = await db.select('SELECT id FROM users WHERE username = ?', [newOwnerUsername]);
  if (user.length === 0) {
    throw new Error('User not found');
  }
  
  const now = Date.now();
  
  // Add to project_owners (ignore if already present)
  await db.execute(
    'INSERT OR IGNORE INTO project_owners (project_id, user_id, added_at) VALUES (?, ?, ?)',
    [projectId, user[0].id, now]
  );
}

// === UTILITIES ===

// Verify if user is owner of project
export async function isProjectOwner(projectId, userId) {
  const db = await initDB();
  
  const result = await db.select(
    'SELECT 1 FROM project_owners WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  
  return result.length > 0;
}

// Get all owners of a project
export async function getProjectOwners(projectId) {
  const db = await initDB();
  
  const result = await db.select(`
    SELECT u.id, u.username, po.added_at, po.role
    FROM project_owners po
    JOIN users u ON po.user_id = u.id
    WHERE po.project_id = ?
    ORDER BY po.added_at ASC
  `, [projectId]);
  
  return result;
}

// Verify if user can modify project
export async function canModifyProject(projectId, userId = null) {
  const db = await initDB();
  
  const result = await db.select(
    'SELECT visibility, created_by FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (result.length === 0) {
    return false;
  }
  
  const project = result[0];
  
  switch (project.visibility) {
    case 'public_rw':
      return true; // Everyone can modify
    case 'public_ro':
    case 'locked':
    case 'private':
      // Only owner can modify
      if (!userId) return false;
      return isProjectOwner(projectId, userId);
    default:
      return false;
  }
}

// Verify if user can view project
export async function canViewProject(projectId, userId = null) {
  const db = await initDB();
  
  const result = await db.select(
    'SELECT visibility, created_by FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (result.length === 0) {
    return false;
  }
  
  const project = result[0];
  
  switch (project.visibility) {
    case 'public_rw':
    case 'public_ro':
      return true; // Everyone can view
    case 'locked':
      // Visible only name in list, but only owner sees content
      return true; // List shows it, content filtered elsewhere
    case 'private':
      // Only owner can view
      if (!userId) return false;
      return isProjectOwner(projectId, userId);
    default:
      return false;
  }
}

// Get visible projects for user
export async function getVisibleProjects(userId = null) {
  const db = await initDB();
  
  if (!userId) {
    // Not logged in: only public projects
    return db.select(
      "SELECT id, name, created, visibility FROM projects WHERE visibility IN ('public_rw', 'public_ro') ORDER BY sort_order ASC, created DESC"
    );
  }
  
  // Logged in: public projects + owned projects
  return db.select(`
    SELECT DISTINCT p.id, p.name, p.created, p.visibility, p.created_by
    FROM projects p
    LEFT JOIN project_owners po ON p.id = po.project_id
    WHERE p.visibility IN ('public_rw', 'public_ro', 'locked')
       OR po.user_id = ?
       OR p.created_by = ?
    ORDER BY p.sort_order ASC, p.created DESC
  `, [userId, userId]);
}