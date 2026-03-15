// Board - Kanban (No Sort, drag only)
import { getLastExportPath, saveLastExportPath, loadProject, renameProject, saveProject, getJsonPath, saveJsonPath, getProjectLastContentChange } from './db_sqlite.js';
import { open as openDialog, save as saveDialog, confirm } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

let columns = [];
let cardsData = {};
let currentProjectId = null;
let currentProject = null;  // Oggetto progetto completo per salvataggio DB

// Zoom state per zoom fluido
let zoomLevel = 1.0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

async function save(contentChanged = true) {
  // Salva su localStorage (backup)
  localStorage.setItem('3lo_board_' + currentProjectId, JSON.stringify(columns));
  localStorage.setItem('3lo_cards_data_' + currentProjectId, JSON.stringify(cardsData));
  
  // Salva su database SQLite (primario)
  if (currentProject) {
    try {
      await saveProject(currentProject, columns, cardsData, contentChanged);
    } catch (err) {
      console.error('Errore salvataggio DB:', err);
    }
  }
}

// Quick Export - Salva nel file JSON precedente o chiede dove salvare
async function handleQuickExport() {
  if (!currentProjectId) {
    alert('❌ Nessun progetto caricato');
    return;
  }
  
  console.log('📤 [EXPORT] Start - Project ID:', currentProjectId);
  
  // Carica dati dal database SQLite
  const projectData = await loadProject(currentProjectId);
  
  if (!projectData) {
    alert('❌ Progetto non trovato nel database');
    return;
  }
  
  const proj = projectData.project;
  const boardData = projectData.board || [];
  const cardsData = projectData.cards || {};
  
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
    board: boardData,
    cards: cardsData,
    exportedAt: new Date().toISOString()
  };
  
  const jsonStr = JSON.stringify(exportData, null, 2);
  
  try {
    // Controlla se c'è un path precedente
    const lastPath = await getLastExportPath(currentProjectId);
    console.log('📁 [EXPORT] Last path:', lastPath);
    
    if (lastPath) {
      // Sovrascrivi il file esistente
      await writeTextFile(lastPath, jsonStr);
      // Salva anche come json_path per il refresh
      await saveJsonPath(currentProjectId, lastPath);
      console.log('✅ [EXPORT] File aggiornato:', lastPath);
      alert('✅ File aggiornato:\n' + lastPath);
    } else {
      // Nessun path precedente, chiedi dove salvare
      const filename = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;
      const filePath = await saveDialog({
        title: 'Salva progetto',
        defaultPath: filename,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      
      if (!filePath) {
        console.log('❌ [EXPORT] Salvataggio annullato');
        return; // Annullato
      }
      
      await writeTextFile(filePath, jsonStr);
      await saveLastExportPath(currentProjectId, filePath);
      await saveJsonPath(currentProjectId, filePath);
      console.log('✅ [EXPORT] Salvato in:', filePath);
      alert('✅ Salvato in:\n' + filePath);
    }
  } catch (err) {
    console.error('❌ [EXPORT] Errore:', err);
    alert('❌ Errore: ' + err.message);
  }
}

// REFRESH - Confronta timestamp e sincronizza (VERSIONE CORRETTA)
async function handleRefresh() {
  if (!currentProjectId) {
    alert('❌ Nessun progetto caricato');
    return;
  }
  
  try {
    console.log('🔄 [REFRESH] Start - Project ID:', currentProjectId);
    
    // 1. Controlla se c'è un file JSON associato (CON RETRY)
    let jsonPath = await getJsonPath(currentProjectId);
    console.log('📁 [REFRESH] JSON Path from DB:', jsonPath);
    
    // Se non c'è, chiedi all'utente di selezionarlo
    if (!jsonPath) {
      console.log('⚠️ [REFRESH] Nessun path salvato, apro dialog selezione file');
      
      try {
        const selected = await openDialog({
          title: 'Seleziona file JSON del progetto',
          multiple: false,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (!selected) {
          console.log('❌ [REFRESH] Selezione annullata dall\'utente');
          return; // Annullato correttamente
        }
        
        jsonPath = selected;
        await saveJsonPath(currentProjectId, jsonPath);
        console.log('✅ [REFRESH] Path salvato:', jsonPath);
      } catch (dialogErr) {
        console.error('❌ [REFRESH] Errore dialog:', dialogErr);
        alert('❌ Errore apertura dialog: ' + dialogErr.message);
        return;
      }
    }

    // 2. Verifica che il file esista e leggi contenuto
    let fileContent = null;
    let fileModifiedTime = 0;

    try {
      console.log('📖 [REFRESH] Leggo file:', jsonPath);
      fileContent = await readTextFile(jsonPath);
      
      // Ottieni timestamp reale del file tramite Rust
      try {
        fileModifiedTime = await invoke('get_file_modified_time', { path: jsonPath });
        console.log('📅 [REFRESH] File modified:', new Date(fileModifiedTime).toLocaleString());
      } catch (tsErr) {
        console.warn('⚠️ [REFRESH] Non posso leggere timestamp file, uso exportedAt:', tsErr);
        // Fallback: usa exportedAt dal JSON stesso
        const tempData = JSON.parse(fileContent);
        fileModifiedTime = new Date(tempData.exportedAt || Date.now()).getTime();
      }
    } catch (e) {
      console.error('❌ [REFRESH] Errore lettura file:', e);
      const resetPath = confirm('❌ File non trovato:\n' + jsonPath + '\n\nVuoi selezionare un nuovo file?');
      if (resetPath) {
        await saveJsonPath(currentProjectId, null); // Reset path
        return handleRefresh(); // Ricomincia
      }
      return;
    }

    // 3. Ottieni last_content_change del database (ignora salvataggi automatici)
    const dbContentChange = await getProjectLastContentChange(currentProjectId);
    const dbContentChangeTime = dbContentChange || 0;
    console.log('📅 [REFRESH] DB Content Change:', new Date(dbContentChangeTime).toLocaleString());
    
    // 4. CONFRONTA TIMESTAMP
    const fileDate = new Date(fileModifiedTime).toLocaleString('it-IT');
    const dbDate = new Date(dbContentChangeTime).toLocaleString('it-IT');
    const timeDiff = Math.abs(fileModifiedTime - dbContentChangeTime);
    const fileIsNewer = fileModifiedTime > dbContentChangeTime;
    
    console.log('⚖️ [REFRESH] Confronto:', { 
      file: fileDate, 
      db: dbDate, 
      fileIsNewer: fileIsNewer,
      diffMs: timeDiff
    });

    // 5. Mostra all'utente quale versione è più recente
    const newerSource = fileIsNewer ? 'FILE JSON' : 'PROGETTO 3LO';
    const timeDiffText = timeDiff < 5000 ? 
      '(⚠️ file appena esportato!)' : 
      `(differenza: ${Math.round(timeDiff/1000)} secondi)`;
    
    const action = await confirm(
      `🔄 SINCRONIZZAZIONE\n\n` +
      `📁 File JSON: ${fileDate}\n` +
      `💾 Database 3LO: ${dbDate}\n` +
      `⏱️ ${timeDiffText}\n\n` +
      `✅ La versione più recente è: ${newerSource}\n\n` +
      `OK = IMPORTA dal file JSON (sovrascrive 3LO)\n` +
      `Annulla = ESPORTA su file JSON (sovrascrive file)`,
      {
        title: 'Sincronizzazione',
        okLabel: 'IMPORTA da JSON',
        cancelLabel: 'ESPORTA su JSON'
      }
    );

    // 6. Esegui l'azione scelta
    if (action === true) {
      console.log('📥 [REFRESH] Importazione da file JSON');
      const importData = JSON.parse(fileContent);
      
      if (importData.project && importData.board) {
        // Aggiorna dati in memoria
        columns = importData.board || [];
        cardsData = importData.cards || {};
        
        // Aggiorna currentProject se necessario
        if (importData.project.id === currentProjectId) {
          currentProject = importData.project;
        }
        
        // Salva nel DB (aggiorna last_modified)
        await saveProject(importData.project, columns, cardsData);
        
        // Ricarica la board
        render();
        
        alert('✅ Importato dal file JSON!');
        console.log('✅ [REFRESH] Import completato');
      } else {
        alert('❌ Formato file non valido');
        console.error('❌ [REFRESH] Formato non valido');
      }
    } else {
      console.log('📤 [REFRESH] Esportazione su file JSON');
      // ESPORTA su file JSON (usa handleQuickExport)
      await handleQuickExport();
    }
  } catch (err) {
    console.error('❌ [REFRESH] Errore critico:', err);
    alert('❌ Errore refresh: ' + err.message + '\n\nControlla la console per dettagli.');
  }
}

function initCardData(cardId) {
  if (!cardsData[cardId]) {
    cardsData[cardId] = { created: Date.now(), modified: Date.now(), note: '' };
  }
}

function openNote(cardId) {
  initCardData(cardId);
  const modal = document.createElement('div');
  modal.className = 'card-note-modal active';
  modal.innerHTML = `
    <div class="card-note-content">
      <div class="card-note-header">
        <h3>Card Note</h3>
        <button class="btn-secondary" onclick="this.closest('.card-note-modal').remove()">Close</button>
      </div>
      <textarea class="card-note-textarea" placeholder="Add notes...">${cardsData[cardId].note}</textarea>
      <button class="btn-primary" id="save-note" style="margin-top: 1rem; float: right;">Save</button>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#save-note').addEventListener('click', async () => {
    cardsData[cardId].note = modal.querySelector('.card-note-textarea').value;
    cardsData[cardId].modified = Date.now();
    await save();
    modal.remove();
  });
  document.body.appendChild(modal);
}

function createColumn(column) {
  const colEl = document.createElement('div');
  colEl.className = 'column';
  colEl.dataset.id = column.id;
  colEl.innerHTML = `
    <div class="column-header">
      <div class="column-drag-handle" title="Drag to move list">⋮⋮</div>
      <div class="column-title" contenteditable="true">${column.title}</div>
      <button class="column-delete">×</button>
    </div>
    <div class="cards" data-column-id="${column.id}"></div>
    <button class="add-card">+ Add Card</button>
  `;
  
  colEl.querySelector('.column-title').addEventListener('blur', async (e) => {
    column.title = e.target.textContent;
    await save();
  });
  
  colEl.querySelector('.column-delete').addEventListener('click', async () => {
    if (confirm('Delete this list?')) {
      columns = columns.filter(c => c.id !== column.id);
      colEl.remove();
      await save();
    }
  });
  
  colEl.querySelector('.add-card').addEventListener('click', () => {
    addCard(colEl.querySelector('.cards'), column.id);
  });
  
  const cardsContainer = colEl.querySelector('.cards');
  (column.cards || []).forEach(card => {
    cardsContainer.appendChild(createCard(card));
  });
  
  if (typeof Sortable !== 'undefined') {
    new Sortable(cardsContainer, {
      group: 'cards',
      animation: 150,
      handle: '.card-drag-handle',
      ghostClass: 'sortable-ghost-card',
      dragClass: 'sortable-drag-card',
      chosenClass: 'sortable-chosen-card',
      forceFallback: true,
      fallbackClass: 'sortable-fallback-card',
      onStart: function() {
        isSortableDragging = true;
      },
      onEnd: function() {
        isSortableDragging = false;
        updateCardOrder();
      }
    });
  }
  
  return colEl;
}

function createCard(card) {
  initCardData(card.id);
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.id = card.id;
  cardEl.innerHTML = `
    <div class="card-left">
      <div class="card-drag-handle" title="Drag to move card">⋮⋮</div>
    </div>
    <div class="card-right">
      <div class="card-text" contenteditable="true">${card.text}</div>
      <div class="card-actions">
        <button class="card-note-btn">📝 Note</button>
        <button class="card-delete-btn" title="Elimina scheda">🗑️</button>
      </div>
    </div>
  `;
  
  const textEl = cardEl.querySelector('.card-text');
  textEl.addEventListener('blur', async () => {
    card.text = textEl.textContent.trim();
    cardsData[card.id].modified = Date.now();
    await save();
  });
  
  cardEl.querySelector('.card-note-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openNote(card.id);
  });
  
  // Elimina scheda
  cardEl.querySelector(".card-delete-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (await confirm("Eliminare questa scheda?", { title: 'Elimina scheda', okLabel: 'Elimina', cancelLabel: 'Annulla' })) {
      // Trova la colonna e rimuovi la scheda
      const colEl = cardEl.closest(".column");
      const colId = colEl.dataset.id;
      const column = columns.find(c => c.id === colId);
      if (column) {
        column.cards = column.cards.filter(c => c.id !== card.id);
        delete cardsData[card.id];
        await save();
        cardEl.remove();
      }
    }
  });
  
  return cardEl;
}

function addCard(container, columnId) {
  const textarea = document.createElement('textarea');
  textarea.className = 'card-input';
  textarea.placeholder = 'Enter card text...';
  textarea.rows = 2;
  
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-primary';
  addBtn.textContent = 'Add';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'add-card';
  cancelBtn.textContent = 'Cancel';
  
  const wrapper = document.createElement('div');
  wrapper.appendChild(textarea);
  wrapper.appendChild(addBtn);
  wrapper.appendChild(cancelBtn);
  
  const btn = container.parentElement.querySelector('.add-card');
  btn.style.display = 'none';
  container.parentElement.appendChild(wrapper);
  textarea.focus();
  // Tasti scorciatoia per textarea
  textarea.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Maiusc+Invio = a capo, comportamento default
        return;
      } else {
        // Solo Invio = crea scheda
        e.preventDefault();
        addBtn.click();
      }
    }
  });
  
  addBtn.addEventListener('click', async () => {
    if (textarea.value.trim()) {
      const cardId = Date.now().toString();
      const card = { id: cardId, text: textarea.value.trim() };
      initCardData(cardId);
      cardsData[cardId].created = Date.now();
      cardsData[cardId].modified = Date.now();
      
      const column = columns.find(c => c.id === columnId);
      column.cards.push(card);
      
      await save();
      render();
    }
    wrapper.remove();
    btn.style.display = 'block';
  });
  
  cancelBtn.addEventListener('click', () => {
    wrapper.remove();
    btn.style.display = 'block';
  });
}

async function updateCardOrder() {
  const colElements = document.querySelectorAll('.column');
  colElements.forEach(colEl => {
    const colId = colEl.dataset.id;
    const column = columns.find(c => c.id === colId);
    const cardEls = colEl.querySelectorAll('.card');
    column.cards = Array.from(cardEls).map(el => {
      const id = el.dataset.id;
      const textEl = el.querySelector('.card-text');
      const text = textEl ? textEl.textContent.trim() : '';
      return { id, text };
    });
  });
  await save();
}

async function init() {
  currentProjectId = localStorage.getItem('3lo_current_project');
  if (!currentProjectId) {
    window.location.href = './index.html';
    return;
  }
  
  // Carica progetto dal database SQLite
  const projectData = await loadProject(currentProjectId);
  
  if (projectData && projectData.project) {
    currentProject = projectData.project;
    const proj = currentProject;
    const titleEl = document.getElementById('board-title');
    titleEl.textContent = proj.name;
    
    // Aggiungi listener per edit titolo
    titleEl.addEventListener('blur', async () => {
      const newName = titleEl.textContent.trim();
      if (newName && newName !== proj.name) {
        await renameProject(currentProjectId, newName);
        proj.name = newName;
      }
    });
    
    // Salva su Enter
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });
    
    // Carica dati dal database
    columns = projectData.board || [];
    cardsData = projectData.cards || {};
  } else {
    // Fallback a localStorage se non trovato nel DB
    columns = JSON.parse(localStorage.getItem('3lo_board_' + currentProjectId) || '[]');
    cardsData = JSON.parse(localStorage.getItem('3lo_cards_data_' + currentProjectId) || '{}');
  }
  
  columns.forEach(col => col.cards.forEach(c => initCardData(c.id)));
  
  render();
}

function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  
  columns.forEach(column => {
    board.appendChild(createColumn(column));
  });
  
  if (typeof Sortable !== 'undefined') {
    new Sortable(board, {
      animation: 150,
      handle: '.column-drag-handle',
      ghostClass: 'sortable-ghost-column',
      dragClass: 'sortable-drag-column',
      chosenClass: 'sortable-chosen-column',
      forceFallback: true,
      fallbackClass: 'sortable-fallback-column',
      onStart: function() {
        isSortableDragging = true;
      },
      onEnd: async function() {
        isSortableDragging = false;
        const newOrder = [];
        document.querySelectorAll('.column').forEach(el => {
          const colId = el.dataset.id;
          const col = columns.find(c => c.id === colId);
          if (col) newOrder.push(col);
        });
        columns = newOrder;
        await save();
      }
    });
  }
}

document.getElementById('back').addEventListener('click', async () => {
  await save(); // Salva prima di uscire
  window.location.href = './index.html';
});

// Salva immediatamente su evento beforeunload (per chiusura finestra Ctrl+Q o X)
// Nota: beforeunload non supporta async, quindi salviamo solo su localStorage
window.addEventListener('beforeunload', () => {
  localStorage.setItem('3lo_board_' + currentProjectId, JSON.stringify(columns));
  localStorage.setItem('3lo_cards_data_' + currentProjectId, JSON.stringify(cardsData));
});

// Per Tauri: gestione chiusura finestra - SALVA SENZA AGGIORNARE last_content_change
if (window.__TAURI__) {
  window.addEventListener('blur', () => save(false)); // Salva ma contentChanged = false
}

document.getElementById('add-list').addEventListener('click', async () => {
  const title = prompt('List name:');
  if (title) {
    const colId = Date.now().toString();
    columns.push({ id: colId, title, cards: [] });
    render();
    await save();
  }
});

// Event listener per pulsanti zoom
document.getElementById("zoom-in").addEventListener("click", zoomIn);
document.getElementById("zoom-out").addEventListener("click", zoomOut);
document.getElementById("zoom-reset").addEventListener("click", resetZoom);

// Event listener per quick export (🔄 Aggiorna)
document.getElementById('quick-export').addEventListener('click', handleRefresh);

init();
  // Inizializza zoom dopo aver caricato il progetto
  setTimeout(applyZoom, 100);
  setTimeout(initDragToScroll, 200);
// ZOOM FLUIDO

function applyZoom() {
  const board = document.getElementById("board");
  if (board) {
    board.style.transformOrigin = "top left";
    board.style.transition = "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)";
    board.style.transform = "scale(" + zoomLevel + ")";
  }

  // Aggiorna il pulsante percentuale
  const zoomResetBtn = document.getElementById("zoom-reset");
  if (zoomResetBtn) {
    zoomResetBtn.textContent = Math.round(zoomLevel * 100) + "%";
  }
  
  // Esporta zoom level come variabile CSS per i fallback Sortable
  document.documentElement.style.setProperty('--zoom-level', zoomLevel);
}

function zoomIn() { if (zoomLevel < ZOOM_MAX) { zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP); applyZoom(); } }
function zoomOut() { if (zoomLevel > ZOOM_MIN) { zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP); applyZoom(); } }
function resetZoom() { zoomLevel = 1.0; applyZoom(); }

document.addEventListener("wheel", function(e) {
  if (e.ctrlKey) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  }
}, { passive: false });


// DRAG-TO-SCROLL BIDIREZIONALE
let isDraggingScroll = false;
let isSortableDragging = false;  // Flag per disabilitare drag-to-scroll durante Sortable
let startXScroll = 0;
let startYScroll = 0;
let scrollLeftStart = 0;
let scrollTopStart = 0;
let autoScrollTimer = null;
const EDGE_MARGIN = 80;
const MAX_SPEED = 25;

function initDragToScroll() {
  const container = document.querySelector(".board-container");
  if (!container) return;
  container.style.cursor = "grab";
  container.addEventListener("mousedown", handleDragStart);
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
}

function handleDragStart(e) {
  // Escludi se Sortable sta già draggando
  if (isSortableDragging) return;
  // Escludi handle di Sortable (colonne e schede)
  if (e.target.closest(".column-drag-handle") || e.target.closest(".card-drag-handle")) return;
  // Escludi elementi interattivi
  if (e.target.closest(".card") || e.target.closest(".column") || e.target.closest("button")) return;
  
  isDraggingScroll = true;
  const container = document.querySelector(".board-container");
  startXScroll = e.pageX - container.offsetLeft;
  startYScroll = e.pageY - container.offsetTop;
  scrollLeftStart = container.scrollLeft;
  scrollTopStart = container.scrollTop;
  container.style.cursor = "grabbing";
}

function handleDragMove(e) {
  if (!isDraggingScroll) return;
  e.preventDefault();
  const container = document.querySelector(".board-container");
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const distLeft = mouseX;
  const distRight = rect.width - mouseX;
  const distTop = mouseY;
  const distBottom = rect.height - mouseY;
  
  // Auto-scroll ai bordi
  let autoScrollX = 0;
  let autoScrollY = 0;
  
  if (distLeft < EDGE_MARGIN) {
    autoScrollX = -Math.max(3, MAX_SPEED * (1 - distLeft / EDGE_MARGIN));
  } else if (distRight < EDGE_MARGIN) {
    autoScrollX = Math.max(3, MAX_SPEED * (1 - distRight / EDGE_MARGIN));
  }
  
  if (distTop < EDGE_MARGIN) {
    autoScrollY = -Math.max(3, MAX_SPEED * (1 - distTop / EDGE_MARGIN));
  } else if (distBottom < EDGE_MARGIN) {
    autoScrollY = Math.max(3, MAX_SPEED * (1 - distBottom / EDGE_MARGIN));
  }
  
  if (autoScrollX !== 0 || autoScrollY !== 0) {
    startAutoScroll(autoScrollX, autoScrollY);
  } else {
    stopAutoScroll();
    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;
    const walkX = (x - startXScroll) * 1.5;
    const walkY = (y - startYScroll) * 1.5;
    container.scrollLeft = scrollLeftStart - walkX;
    container.scrollTop = scrollTopStart - walkY;
  }
}

function handleDragEnd() {
  if (!isDraggingScroll) return;
  isDraggingScroll = false;
  stopAutoScroll();
  const container = document.querySelector(".board-container");
  if (container) container.style.cursor = "grab";
}

function startAutoScroll(speedX, speedY) {
  if (autoScrollTimer) clearInterval(autoScrollTimer);
  const container = document.querySelector(".board-container");
  if (!container) return;
  autoScrollTimer = setInterval(() => {
    if (speedX !== 0) container.scrollLeft += speedX;
    if (speedY !== 0) container.scrollTop += speedY;
  }, 16);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }
}
