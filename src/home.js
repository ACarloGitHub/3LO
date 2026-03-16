// Home - Projects Management (con SQLite)
import { getAllProjects, saveProject, deleteProject, loadProject, initDB, renameProject, saveLastExportPath, saveProjectOrder } from './db_sqlite.js';
import { save, confirm } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import logger from './logger.js';
import { initAuth, isLoggedIn, getCurrentUser, getSessionId } from './auth_ui.js';
import { claimProject, toggleProjectVisibility, toggleProjectLocked } from './auth.js';

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
          // TODO: Apri dialogo condivisione (punto 4)
          alert('Shared settings - coming soon!');
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