// Home - Projects Management (con SQLite)
import { getAllProjects, saveProject, deleteProject, loadProject, initDB, renameProject, saveLastExportPath, saveProjectOrder } from './db_sqlite.js';
import { save, confirm } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import logger from './logger.js';

let projects = [];
let currentSortMode = 'custom';

// ==========================================
// INIT - Chiamato UNA VOLTA all'avvio
// ==========================================

async function init() {
  await initDB();
  await loadProjects();
  render();
  
  // Registra listener UNA SOLA VOLTA
  setupEventDelegation();
  
  // Ascolta evento di aggiornamento progetti (da import)
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
// RENDER - Aggiorna SOLO il DOM
// ==========================================

async function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';

  // Controlli ordinamento
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

  // Gestione cambio ordinamento
  const sortSelect = document.getElementById('home-sort-select');
  sortSelect.value = currentSortMode;
  sortSelect.addEventListener('change', (e) => {
    currentSortMode = e.target.value;
    render();
  });

  // Mostra progetti
  const sorted = sortProjects(projects);
  
  for (const proj of sorted) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = proj.id;
    card.innerHTML = `
      <div class="project-card-left">
        <div class="project-drag-handle" title="Drag to reorder">⋮⋮</div>
      </div>
      <div class="project-card-right">
        <div class="project-icon">🌙</div>
        <div class="project-title">${proj.name}</div>
        <div class="project-meta">${formatDate(proj.created)}</div>
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
  
  // Inizializza Sortable per i progetti (solo in modalità custom)
  if (currentSortMode === 'custom' && typeof Sortable !== 'undefined') {
    initProjectSortable();
  }
}

// ==========================================
// DRAG & DROP - Progetti
// ==========================================

let projectSortable = null;

function initProjectSortable() {
  const container = document.getElementById('projects');
  if (!container) return;
  
  // Distruggi Sortable esistente se c'è
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
      // Aggiorna l'ordine dei progetti
      const newOrder = [];
      container.querySelectorAll('.project-card').forEach(el => {
        const id = el.dataset.id;
        const proj = projects.find(p => String(p.id) === String(id));
        if (proj) newOrder.push(proj);
      });
      
      // Salva il nuovo ordine
      projects = newOrder;
      await saveProjectOrder(newOrder);
      logger.info('home', 'Ordine progetti aggiornato');
    }
  });
}

// ==========================================
// EVENT DELEGATION - Registrato UNA VOLTA
// ==========================================

function setupEventDelegation() {
  const container = document.getElementById('projects');
  
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const id = btn.dataset.id;
    const proj = projects.find(p => String(p.id) === String(id));
    
    // ── OPEN ──────────────────────────────────────
    if (btn.classList.contains('btn-open')) {
      localStorage.setItem('3lo_current_project', id);
      window.location.href = './board.html';
      return;
    }
    
    // Progetto necessario per le azioni seguenti
    if (!proj) return;
    
    // ── RENAME ─────────────────────────────────────
    if (btn.classList.contains('btn-rename')) {
      const newName = prompt('Nuovo nome:', proj.name);
      if (newName && newName.trim() !== '' && newName !== proj.name) {
        await renameProject(id, newName.trim());
        await loadProjects();
        render();
      }
      return;
    }
    
    // ── EXPORT ─────────────────────────────────────
    if (btn.classList.contains('btn-export')) {
      await handleExport(proj);
      return;
    }
    
    // ── DELETE ─────────────────────────────────────
    if (btn.classList.contains('btn-delete')) {
      console.log('🔍 [DELETE] Click rilevato - id:', id, 'proj:', proj?.name);
      
      // Usa confirm asincrono di Tauri con await
      const confirmed = await confirm(`Eliminare il progetto "${proj.name}"?`, {
        title: 'Conferma eliminazione',
        okLabel: 'Elimina',
        cancelLabel: 'Annulla'
      });
      
      console.log('🔍 [DELETE] Conferma:', confirmed);
      
      if (!confirmed) {
        console.log('🔍 [DELETE] Annullato - ESCO senza eliminare');
        return;
      }
      
      console.log('🔍 [DELETE] Confermato - chiamo deleteProject');
      logger.info('home', `Eliminazione progetto: ${proj.name} (${id})`);
      await deleteProject(id);
      await loadProjects();
      render();
      console.log('🔍 [DELETE] Completato');
      return;
    }
  });
}

// ==========================================
// EXPORT - Funzione separata
// ==========================================

async function handleExport(proj) {
  const id = proj.id;
  
  // Carica dati da localStorage
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
        "cards (root) è oggetto metadata: {cardId: {created, modified, note}}",
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
      title: 'Salva progetto',
      defaultPath: filename,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (!filePath) {
      logger.info('home', 'Export annullato dall\'utente');
      return;
    }
    
    await writeTextFile(filePath, jsonStr);
    
    // Salva il path per future esportazioni rapide
    await saveLastExportPath(proj.id, filePath);
    
    logger.info('home', `Export completato: ${filePath}`);
    alert('✅ Salvato in:\n' + filePath);
    
  } catch (err) {
    logger.error('home', `Errore export: ${err.message}`);
    alert('❌ Errore salvataggio:\n' + err.message);
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
// AVVIA
// ==========================================

init();