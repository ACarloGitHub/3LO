// Board - Kanban (No Sort, drag only)

let columns = [];
let cardsData = {};
let currentProjectId = null;

// Zoom state per zoom fluido
let zoomLevel = 1.0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

function save() {
  localStorage.setItem('3lo_board_' + currentProjectId, JSON.stringify(columns));
  localStorage.setItem('3lo_cards_data_' + currentProjectId, JSON.stringify(cardsData));
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
  modal.querySelector('#save-note').addEventListener('click', () => {
    cardsData[cardId].note = modal.querySelector('.card-note-textarea').value;
    cardsData[cardId].modified = Date.now();
    save();
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
      <div class="column-title" contenteditable="true">${column.title}</div>
      <button class="column-delete">&times;</button>
    </div>
    <div class="cards" data-column-id="${column.id}"></div>
    <button class="add-card">+ Add Card</button>
  `;
  
  colEl.querySelector('.column-title').addEventListener('blur', (e) => {
    column.title = e.target.textContent;
    save();
  });
  
  colEl.querySelector('.column-delete').addEventListener('click', () => {
    if (confirm('Delete this list?')) {
      columns = columns.filter(c => c.id !== column.id);
      colEl.remove();
      save();
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
      ghostClass: 'sortable-ghost',
      onEnd: updateCardOrder
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
    <div class="card-text" contenteditable="true">${card.text}</div>
    <div class="card-actions">
      <button class="card-note-btn">📝 Note</button>
      <button class="card-delete-btn" title="Elimina scheda">🗑️</button>
    </div>
  `;
  
  const textEl = cardEl.querySelector('.card-text');
  textEl.addEventListener('blur', () => {
    card.text = textEl.textContent.trim();
    cardsData[card.id].modified = Date.now();
    save();
  });
  
  cardEl.querySelector('.card-note-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openNote(card.id);
  
  // Elimina scheda
  cardEl.querySelector(".card-delete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Eliminare questa scheda?")) {
      // Trova la colonna e rimuovi la scheda
      const colEl = cardEl.closest(".column");
      const colId = colEl.dataset.id;
      const column = columns.find(c => c.id === colId);
      if (column) {
        column.cards = column.cards.filter(c => c.id !== card.id);
        delete cardsData[card.id];
        save();
        cardEl.remove();
      }
    }
  });
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
  
  addBtn.addEventListener('click', () => {
    if (textarea.value.trim()) {
      const cardId = Date.now().toString();
      const card = { id: cardId, text: textarea.value.trim() };
      initCardData(cardId);
      cardsData[cardId].created = Date.now();
      cardsData[cardId].modified = Date.now();
      
      const column = columns.find(c => c.id === columnId);
      column.cards.push(card);
      
      save();
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

function updateCardOrder() {
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
  save();
}

function init() {
  currentProjectId = localStorage.getItem('3lo_current_project');
  if (!currentProjectId) {
    window.location.href = './index.html';
    return;
  }
  
  const projects = JSON.parse(localStorage.getItem('3lo_projects') || '[]');
  const proj = projects.find(p => String(p.id) === String(currentProjectId));
  if (proj) {
    const titleEl = document.getElementById('board-title');
    titleEl.textContent = '🌙 ' + proj.name;
    
    // Aggiungi listener per edit titolo
    titleEl.addEventListener('blur', () => {
      const newName = titleEl.textContent.replace(/^🌙\s*/, '').trim();
      if (newName && newName !== proj.name) {
        proj.name = newName;
        localStorage.setItem('3lo_projects', JSON.stringify(projects));
        save();
      }
    });
    
    // Salva su Enter
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });
  }
  
  columns = JSON.parse(localStorage.getItem('3lo_board_' + currentProjectId) || '[]');
  
  cardsData = JSON.parse(localStorage.getItem('3lo_cards_data_' + currentProjectId) || '{}');
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
      handle: '.column-header',
      ghostClass: 'sortable-ghost',
      onEnd: () => {
        const newOrder = [];
        document.querySelectorAll('.column').forEach(el => {
          const colId = el.dataset.id;
          const col = columns.find(c => c.id === colId);
          if (col) newOrder.push(col);
        });
        columns = newOrder;
        save();
      }
    });
  }
}

document.getElementById('back').addEventListener('click', () => {
  window.location.href = './index.html';
});

// Salva immediatamente su evento beforeunload (per chiusura finestra Ctrl+Q o X)
window.addEventListener('beforeunload', () => {
  save();
});

// Per Tauri: gestione chiusura finestra
if (window.__TAURI__) {
  window.addEventListener('blur', save); // Salva quando perde focus
}

document.getElementById('add-list').addEventListener('click', () => {
  const title = prompt('List name:');
  if (title) {
    const colId = Date.now().toString();
    columns.push({ id: colId, title, cards: [] });
    render();
    save();
  }
});

// Event listener per pulsanti zoom
document.getElementById("zoom-in").addEventListener("click", zoomIn);
document.getElementById("zoom-out").addEventListener("click", zoomOut);
document.getElementById("zoom-reset").addEventListener("click", resetZoom);

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


// DRAG-TO-SCROLL ORIZZONTALE
let isDraggingScroll = false;
let startXScroll = 0;
let scrollLeftStart = 0;
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
  if (e.target.closest(".card") || e.target.closest(".column") || e.target.closest("button")) return;
  isDraggingScroll = true;
  const container = document.querySelector(".board-container");
  startXScroll = e.pageX - container.offsetLeft;
  scrollLeftStart = container.scrollLeft;
  container.style.cursor = "grabbing";
}

function handleDragMove(e) {
  if (!isDraggingScroll) return;
  e.preventDefault();
  const container = document.querySelector(".board-container");
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const distLeft = mouseX;
  const distRight = rect.width - mouseX;
  if (distLeft < EDGE_MARGIN) {
    const speed = Math.max(3, MAX_SPEED * (1 - distLeft / EDGE_MARGIN));
    startAutoScroll(-speed);
  } else if (distRight < EDGE_MARGIN) {
    const speed = Math.max(3, MAX_SPEED * (1 - distRight / EDGE_MARGIN));
    startAutoScroll(speed);
  } else {
    stopAutoScroll();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXScroll) * 1.5;
    container.scrollLeft = scrollLeftStart - walk;
  }
}

function handleDragEnd() {
  if (!isDraggingScroll) return;
  isDraggingScroll = false;
  stopAutoScroll();
  const container = document.querySelector(".board-container");
  if (container) container.style.cursor = "grab";
}

function startAutoScroll(speed) {
  if (autoScrollTimer) clearInterval(autoScrollTimer);
  const container = document.querySelector(".board-container");
  if (!container) return;
  autoScrollTimer = setInterval(() => {
    container.scrollLeft += speed;
  }, 16);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }
}
