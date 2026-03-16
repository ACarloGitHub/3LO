// Home - Projects Management (con SQLite)
import { getAllProjects, saveProject, deleteProject, loadProject, initDB, renameProject, saveLastExportPath, saveProjectOrder } from './db_sqlite.js';
import { save, confirm } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import logger from './logger.js';
import { initAuth, isLoggedIn, getCurrentUser, getSessionId } from './auth_ui.js';
import { 
  claimProject, 
  toggleProjectVisibility, 
  toggleProjectLocked,
  getProjectShares,
  setProjectShare,
  removeProjectShare,
  getSharePermissions
} from './auth.js';

let projects = [];
let currentSortMode = 'custom';

// ==========================================
// INIT - Chiamato UNA VOLTA all'avvio
// ==========================================

async function init() {
  await initDB();
  await initAuth();
  await loadProjects();
  render();
  
  setupEventDelegation();
  
  window.addEventListener('projects-updated', async () => {
    logger.info('home', 'Aggiornamento lista progetti...');
    await loadProjects();
    render();
  });
}

// ==========================================
// LOAD & SORT
// ==========================================

async function loadProjects() {
  projects = await getAllProjects();
}

function sortProjects(list) {
  if (currentSortMode === 'custom') return list;
  const sorted = [...list];
  switch (currentSortMode) {
    case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
  }
  return sorted;
}

function formatDate(ts) {
  if (!ts) return 'Unknown';
  try {
    const date = new Date(Number(ts));
    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
  } catch (e) {
    return 'Unknown';
  }
}

// ==========================================
// RENDER
// ==========================================

async function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';

  const sortDiv = document.createElement('div');
  sortDiv.className = 'home-sort-controls';
  sortDiv.style.cssText = 'grid-column: 1 / -1;';
  sortDiv.innerHTML = `
    <label>Sort:</label>
    <select id="home-sort-select">
      <option value="custom">Custom</option>
      <option value="name-asc">Name ↑</option>
      <option value="name-desc">Name ↓</option>
    </select>
  `;
  container.appendChild(sortDiv);

  const sortSelect = document.getElementById('home-sort-select');
  sortSelect.value = currentSortMode;
  sortSelect.addEventListener('change', (e) => {
    currentSortMode = e.target.value;
    render();
  });

  const sorted = sortProjects(projects);
  const user = getCurrentUser();
  const isLogged = isLoggedIn();
  
  for (const proj of sorted) {
    const isVisible = proj.is_visible !== false; // default true
    const isLocked = proj.is_locked === true;
    const isOrphan = !proj.created_by;
    const canClaim = isOrphan && isLogged;
    const isOwner = isLogged && proj.created_by === user?.id;
    
    // Icone visibilità (solo owner può cliccare)
    const visibilityIcon = isVisible ? '🐵' : '🙈';
    const lockedIcon = isLocked ? '🔒' : '🔓';
    
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = proj.id;
    card.innerHTML = `
      <div class="project-card-left">
        <div class="project-drag-handle" title="Drag to reorder">⋮⋮</div>
        <div class="project-visibility-icons">
          <span class="vis-icon ${isOwner ? 'clickable' : ''}" data-id="${proj.id}" data-type="visibility" title="${isVisible ? 'Visible' : 'Invisible'}${isOwner ? ' (click to toggle)' : ''}">${visibilityIcon}</span>
          <span class="vis-icon ${isOwner ? 'clickable' : ''}" data-id="${proj.id}" data-type="locked" title="${isLocked ? 'Locked' : 'Unlocked'}${isOwner ? ' (click to toggle)' : ''}">${lockedIcon}</span>
          <span class="vis-icon ${isOwner ? 'clickable' : ''} shared-icon" data-id="${proj.id}" data-type="shared" title="Shared settings${isOwner ? ' (click to open)' : ''}">👥</span>
        </div>
      </div>
      <div class="project-card-right">
        <div class="project-icon">🌙</div>
        <div class="project-title">${proj.name}</div>
        <div class="project-meta">${formatDate(proj.created)}</div>
        ${canClaim ? '<button class="btn-claim" data-id="' + proj.id + '" title="Claim this project">🏷️ Claim</button>' : ''}
        <div class="project-actions">
          <button class="btn-open" data-id="${proj.id}">Open</button>
          <button class="btn-rename" data-id="${proj.id}">Ren</button>
          <button class="btn-export" data-id="${proj.id}">Exp</button>
          <button class="btn-delete" data-id="${proj.id}">Del</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  }
  
  if (currentSortMode === 'custom' && typeof Sortable !== 'undefined') {
    initProjectSortable();
  }
}

// ==========================================
// SORTABLE
// ==========================================

let projectSortable = null;

function initProjectSortable() {
  const container = document.getElementById('projects');
  if (!container) return;
  
  if (projectSortable) {
    projectSortable.destroy();
  }
  
  projectSortable = new Sortable(container, {
    animation: 150,
    handle: '.project-drag-handle',
    ghostClass: 'sortable-ghost-project',
    dragClass: 'sortable-drag-project',
    chosenClass: 'sortable-chosen-project',
    forceFallback: true,
    fallbackClass: 'sortable-fallback-project',
    onEnd: async (evt) => {
      const newOrder = [];
      container.querySelectorAll('.project-card').forEach(el => {
        const id = el.dataset.id;
        const proj = projects.find(p => String(p.id) === String(id));
        if (proj) newOrder.push(proj);
      });
      projects = newOrder;
      await saveProjectOrder(newOrder);
      logger.info('home', 'Ordine progetti aggiornato');
    }
  });
}

// ==========================================
// EVENT DELEGATION
// ==========================================

function setupEventDelegation() {
  const container = document.getElementById('projects');
  
  container.addEventListener('click', async (e) => {
    // ── VISIBILITY ICONS CLICK ───────────────────
    const visIcon = e.target.closest('.vis-icon');
    if (visIcon) {
      e.stopPropagation();
      
      if (!visIcon.classList.contains('clickable')) {
        return;
      }
      
      const projectId = visIcon.dataset.id;
      const iconType = visIcon.dataset.type;
      const sessionId = getSessionId();
      
      if (!sessionId) {
        alert('You must be logged in to change settings.');
        return;
      }
      
      try {
        if (iconType === 'visibility') {
          await toggleProjectVisibility(projectId, sessionId);
        } else if (iconType === 'locked') {
          await toggleProjectLocked(projectId, sessionId);
        } else if (iconType === 'shared') {
          // Open share dialog
          await openShareDialog(projectId);
          return;
        }
        await loadProjects();
        render();
      } catch (err) {
        console.error('Error:', err);
        alert('Error: ' + err.message);
      }
      return;
    }
    
    // ── BUTTON CLICKS ───────────────────────────
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const id = btn.dataset.id;
    const proj = projects.find(p => String(p.id) === String(id));
    
    // ── OPEN ────────────────────────────────────
    if (btn.classList.contains('btn-open')) {
      localStorage.setItem('3lo_current_project', id);
      window.location.href = './board.html';
      return;
    }
    
    // ── CLAIM ───────────────────────────────────
    if (btn.classList.contains('btn-claim')) {
      const sessionId = getSessionId();
      if (!sessionId) {
        alert('You must be logged in to claim a project.');
        return;
      }
      
      const confirmed = await confirm('Claim this orphan project?\n\nIt will become private and you will be the owner.', {
        title: 'Claim Project',
        okLabel: 'Claim',
        cancelLabel: 'Cancel'
      });
      
      if (!confirmed) return;
      
      try {
        await claimProject(id, sessionId);
        await loadProjects();
        render();
        alert('Project claimed successfully!');
      } catch (err) {
        alert('Error: ' + err.message);
      }
      return;
    }
    
    if (!proj) return;
    
    // ── RENAME ───────────────────────────────────
    if (btn.classList.contains('btn-rename')) {
      const newName = prompt('New name:', proj.name);
      if (newName && newName.trim() !== '' && newName !== proj.name) {
        await renameProject(id, newName.trim());
        await loadProjects();
        render();
      }
      return;
    }
    
    // ── EXPORT ───────────────────────────────────
    if (btn.classList.contains('btn-export')) {
      await handleExport(proj);
      return;
    }
    
    // ── DELETE ───────────────────────────────────
    if (btn.classList.contains('btn-delete')) {
      const confirmed = await confirm(`Delete project "${proj.name}"?`, {
        title: 'Confirm deletion',
        okLabel: 'Delete',
        cancelLabel: 'Cancel'
      });
      
      if (!confirmed) return;
      
      logger.info('home', `Deleting project: ${proj.name} (${id})`);
      await deleteProject(id);
      await loadProjects();
      render();
      return;
    }
  });
}

// Visibility icons handler

// ==========================================
// EXPORT
// ==========================================

async function handleExport(proj) {
  const id = proj.id;
  
  const boardJson = localStorage.getItem('3lo_board_' + id);
  const cardsJson = localStorage.getItem('3lo_cards_data_' + id);
  
  const fullData = {
    project: proj,
    board: boardJson ? JSON.parse(boardJson) : [],
    cards: cardsJson ? JSON.parse(cardsJson) : {}
  };
  
  const exportData = {
    "_documentation": {
      "format": "3LO Project Export v1.0",
      "description": "Struttura JSON per importazione in 3LO",
      "fields": {
        "version": "Versione formato (stringa, es: '1.0')",
        "project": {
          "id": "ID univoco progetto (stringa)",
          "name": "Nome visualizzato (stringa)",
          "created": "Timestamp creazione (numero, epoch ms)"
        },
        "board": "Array colonne, ognuna con {id, title, cards: [{id, text}]}",
        "cards": "Oggetto metadata card (può essere vuoto {})",
        "exportedAt": "ISO 8601 timestamp export"
      },
      "regole": [
        "board è array: [{id, title, cards: [...]}]",
        "cards dentro board ha solo {id, text}",
        "cards (root) metadata: {cardId: {created, modified, note}}",
        "id progetto univoco, senza spazi",
        "text supporta emoji e unicode"
      ]
    },
    version: '1.0',
    project: proj,
    board: fullData?.board || [],
    cards: fullData?.cards || {},
    exportedAt: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const filename = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;

  try {
    logger.info('home', `Export progetto: ${proj.name}`);
    
    const filePath = await save({
      title: 'Save project',
      defaultPath: filename,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (!filePath) {
      logger.info('home', 'Export cancelled');
      return;
    }
    
    await writeTextFile(filePath, jsonStr);
    await saveLastExportPath(proj.id, filePath);
    
    logger.info('home', `Export completed: ${filePath}`);
    alert('✅ Saved to:\n' + filePath);
    
  } catch (err) {
    logger.error('home', `Export error: ${err.message}`);
    alert('❌ Error saving:\n' + err.message);
  }
}

// ==========================================
// SHARE DIALOG
// ==========================================

let currentShareProjectId = null;

async function openShareDialog(projectId) {
  currentShareProjectId = projectId;
  const sessionId = getSessionId();
  
  if (!sessionId) {
    alert('You must be logged in to manage sharing.');
    return;
  }
  
  // Get current shares
  const shares = await getProjectShares(projectId);
  
  // Create modal HTML
  const modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.className = 'share-modal';
  modal.innerHTML = `
    <div class="share-modal-content">
      <div class="share-modal-header">
        <h3>Share Project</h3>
        <button class="share-modal-close">×</button>
      </div>
      <div class="share-modal-body">
        <div class="share-add-user">
          <input type="text" id="share-username" placeholder="Username to share with">
          <div class="share-permissions">
            <label><input type="checkbox" id="perm-view" checked> Can View</label>
            <label><input type="checkbox" id="perm-open"> Can Open</label>
            <label><input type="checkbox" id="perm-edit"> Can Edit</label>
          </div>
          <button id="btn-add-share">Add User</button>
        </div>
        <div class="share-list">
          <h4>Shared With:</h4>
          <div id="share-users-list">
            ${shares.length === 0 ? '<p class="share-empty">No users shared yet</p>' : shares.map(s => `
              <div class="share-user-row" data-userid="${s.userId}">
                <span class="share-username">${s.username}</span>
                <div class="share-user-perms">
                  <span class="perm-badge ${s.canView ? 'active' : ''}" title="Can View">👁️</span>
                  <span class="perm-badge ${s.canOpen ? 'active' : ''}" title="Can Open">🔓</span>
                  <span class="perm-badge ${s.canEdit ? 'active' : ''}" title="Can Edit">✏️</span>
                </div>
                <button class="btn-remove-share" data-userid="${s.userId}">Remove</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  modal.querySelector('.share-modal-close').addEventListener('click', closeShareDialog);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeShareDialog();
  });
  
  modal.querySelector('#btn-add-share').addEventListener('click', async () => {
    const username = document.getElementById('share-username').value.trim();
    if (!username) {
      alert('Please enter a username');
      return;
    }
    
    const permissions = {
      canView: document.getElementById('perm-view').checked,
      canOpen: document.getElementById('perm-open').checked,
      canEdit: document.getElementById('perm-edit').checked
    };
    
    try {
      await setProjectShare(projectId, username, permissions, sessionId);
      closeShareDialog();
      openShareDialog(projectId); // Refresh
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
  
  // Remove share buttons
  modal.querySelectorAll('.btn-remove-share').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = e.target.dataset.userid;
      try {
        await removeProjectShare(projectId, userId, sessionId);
        closeShareDialog();
        openShareDialog(projectId); // Refresh
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  });
}

function closeShareDialog() {
  const modal = document.getElementById('share-modal');
  if (modal) {
    modal.remove();
  }
  currentShareProjectId = null;
}

// ==========================================
// NEW PROJECT
// ==========================================

document.getElementById('new-project').addEventListener('click', async () => {
  const name = prompt('Project name:');
  if (name) {
    const id = Date.now().toString();
    const project = { id, name, created: Date.now() };
    await saveProject(project, [], {});
    await loadProjects();
    render();
  }
});

// ==========================================
// START
// ==========================================

init();