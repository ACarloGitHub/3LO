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

// Toggle project visibility (is_visible)
export async function toggleProjectVisibility(projectId, sessionId) {
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
  
  // Toggle is_visible
  await db.execute(
    'UPDATE projects SET is_visible = CASE WHEN is_visible = 1 THEN 0 ELSE 1 END WHERE id = ?',
    [projectId]
  );
}

// Toggle project locked status
export async function toggleProjectLocked(projectId, sessionId) {
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
  
  // Toggle is_locked
  await db.execute(
    'UPDATE projects SET is_locked = CASE WHEN is_locked = 1 THEN 0 ELSE 1 END WHERE id = ?',
    [projectId]
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

// Get visible projects for user
export async function getVisibleProjects(userId = null) {
  const db = await initDB();
  
  if (!userId) {
    // Not logged in: only visible projects (is_visible = 1)
    return db.select(
      "SELECT id, name, created, is_visible, is_locked, created_by FROM projects WHERE is_visible = 1 ORDER BY sort_order ASC, created DESC"
    );
  }
  
  // Logged in: visible projects + owned projects (even if not visible) + shared projects
  return db.select(`
    SELECT DISTINCT p.id, p.name, p.created, p.is_visible, p.is_locked, p.created_by
    FROM projects p
    LEFT JOIN project_owners po ON p.id = po.project_id
    LEFT JOIN project_shares ps ON p.id = ps.project_id AND ps.user_id = ?
    WHERE p.is_visible = 1
       OR po.user_id = ?
       OR p.created_by = ?
       OR ps.can_view = 1
    ORDER BY p.sort_order ASC, p.created DESC
  `, [userId, userId, userId, userId]);
}

// === PROJECT SHARING ===

// Get all shares for a project
export async function getProjectShares(projectId) {
  const db = await initDB();
  
  const result = await db.select(`
    SELECT u.id, u.username, ps.can_view, ps.can_open, ps.can_edit, ps.added_at
    FROM project_shares ps
    JOIN users u ON ps.user_id = u.id
    WHERE ps.project_id = ?
    ORDER BY ps.added_at ASC
  `, [projectId]);
  
  return result.map(row => ({
    userId: row.id,
    username: row.username,
    canView: row.can_view === 1,
    canOpen: row.can_open === 1,
    canEdit: row.can_edit === 1,
    addedAt: row.added_at
  }));
}

// Add or update share for a project
export async function setProjectShare(projectId, username, permissions, sessionId) {
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
  
  // Find user to share with
  const user = await db.select('SELECT id FROM users WHERE username = ?', [username]);
  if (user.length === 0) {
    throw new Error('User not found');
  }
  
  const targetUserId = user[0].id;
  const now = Date.now();
  
  // Insert or update share
  await db.execute(`
    INSERT INTO project_shares (project_id, user_id, can_view, can_open, can_edit, added_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, user_id) DO UPDATE SET
      can_view = excluded.can_view,
      can_open = excluded.can_open,
      can_edit = excluded.can_edit
  `, [
    projectId,
    targetUserId,
    permissions.canView ? 1 : 0,
    permissions.canOpen ? 1 : 0,
    permissions.canEdit ? 1 : 0,
    now
  ]);
}

// Remove share from a project
export async function removeProjectShare(projectId, targetUserId, sessionId) {
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
  
  await db.execute(
    'DELETE FROM project_shares WHERE project_id = ? AND user_id = ?',
    [projectId, targetUserId]
  );
}

// Get share permissions for a specific user on a project
export async function getSharePermissions(projectId, userId) {
  if (!userId) return null;
  
  const db = await initDB();
  const result = await db.select(
    'SELECT can_view, can_open, can_edit FROM project_shares WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  
  if (result.length === 0) {
    return null;
  }
  
  return {
    canView: result[0].can_view === 1,
    canOpen: result[0].can_open === 1,
    canEdit: result[0].can_edit === 1
  };
}

// Check if user can open a project (considering locked status and shares)
export async function canOpenProject(projectId, userId = null) {
  const db = await initDB();
  
  const result = await db.select(
    'SELECT is_locked, created_by FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (result.length === 0) {
    return false;
  }
  
  const project = result[0];
  
  // If not locked, everyone can open
  if (project.is_locked !== 1) {
    return true;
  }
  
  // If locked, only owner or shared users with can_open can open
  if (!userId) return false;
  
  const isOwner = await isProjectOwner(projectId, userId);
  if (isOwner) return true;
  
  const sharePerms = await getSharePermissions(projectId, userId);
  if (sharePerms && sharePerms.canOpen) return true;
  
  return false;
}

// Update canModifyProject to consider shares
export async function canModifyProject(projectId, userId = null) {
  const db = await initDB();
  
  const result = await db.select(
    'SELECT is_visible, is_locked, created_by FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (result.length === 0) {
    return false;
  }
  
  // If not logged in, can't modify
  if (!userId) return false;
  
  // Check if user is owner
  const isOwner = await isProjectOwner(projectId, userId);
  if (isOwner) return true;
  
  // Check shared permissions
  const sharePerms = await getSharePermissions(projectId, userId);
  if (sharePerms && sharePerms.canEdit) return true;
  
  return false;
}

// Update canViewProject to consider shares
export async function canViewProject(projectId, userId = null) {
  const db = await initDB();
  
  const result = await db.select(
    'SELECT is_visible, is_locked, created_by FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (result.length === 0) {
    return false;
  }
  
  const project = result[0];
  
  // If project is visible, everyone can see it
  if (project.is_visible === 1) {
    return true;
  }
  
  // If project is not visible, only owner or shared users with can_view can see it
  if (!userId) return false;
  
  const isOwner = await isProjectOwner(projectId, userId);
  if (isOwner) return true;
  
  const sharePerms = await getSharePermissions(projectId, userId);
  if (sharePerms && sharePerms.canView) return true;
  
  return false;
}