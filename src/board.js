// Board Page - Kanban with Notes & Sorting

let columns = [];
let cardsData = {}; // Per tracciare metadati (createDate, modifiedDate, notes)
let currentProjectId = null;
let sortMode = 'manual'; // manual, name-asc, name-desc, created-asc, created-desc, modified-asc, modified-desc

function save() {
  localStorage.setItem('3lo_board_' + currentProjectId, JSON.stringify(columns));
  localStorage.setItem('3lo_cards_data_' + currentProjectId, JSON.stringify(cardsData));
}

function initCardData(cardId) {
  if (!cardsData[cardId]) {
    cardsData[cardId] = {
      created: Date.now(),
      modified: Date.now(),
      note: ''
    };
  }
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
    addCardUI(colEl.querySelector('.cards'), column.id);
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
      onEnd: () => {
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
    <div class="card-text" contenteditable="true">${card.text}</div>
    <div class="card-actions">
      <button class="card-note-btn">📝 Note</button>
    </div>
  `;
  
  cardEl.querySelector('.card-text').addEventListener('blur', (e) => {
    card.text = e.target.textContent;
    cardsData[card.id].modified = Date.now();
    save();
  });
  
  cardEl.querySelector('.card-note-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openNoteModal(card.id);
  });
  
  return cardEl;
}

function openNoteModal(cardId) {
  initCardData(cardId);
  const modal = document.createElement('div');
  modal.className = 'card-note-modal active';
  modal.innerHTML = `
    <div class="card-note-content">
      <div class="card-note-header">
        <h3>Card Note</h3>
        <button class="btn-secondary" onclick="this.closest('.card-note-modal').remove()">Close</button>
      </div>
      <textarea class="card-note-textarea" placeholder="Add notes about this card...">${cardsData[cardId].note}</textarea>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <span style="font-size: 0.8rem; color: rgba(255,255,255,0.5)">Created: ${new Date(cardsData[cardId].created).toLocaleString()}</span>
        <button class="btn-primary" id="save-note">Save Note</button>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  modal.querySelector('#save-note').addEventListener('click', () => {
    cardsData[cardId].note = modal.querySelector('.card-note-textarea').value;
    cardsData[cardId].modified = Date.now();
    save();
    modal.remove();
  });
  
  document.body.appendChild(modal);
}

function sortCards(columnId, cards) {
  if (sortMode === 'manual') return cards;
  
  const sorted = [...cards];
  sorted.forEach(c => initCardData(c.id));
  
  switch(sortMode) {
    case 'name-asc':
      sorted.sort((a, b) => a.text.localeCompare(b.text));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.text.localeCompare(a.text));
      break;
    case 'created-asc':
      sorted.sort((a, b) => cardsData[a.id].created - cardsData[b.id].created);
      break;
    case 'created-desc':
      sorted.sort((a, b) => cardsData[b.id].created - cardsData[a.id].created);
      break;
    case 'modified-asc':
      sorted.sort((a, b) => cardsData[a.id].modified - cardsData[b.id].modified);
      break;
    case 'modified-desc':
      sorted.sort((a, b) => cardsData[b.id].modified - cardsData[a.id].modified);
      break;
  }
  return sorted;
}

function addCardUI(container, columnId) {
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
  
  addBtn.addEventListener('click', () => {
    if (textarea.value.trim()) {
      const cardId = Date.now().toString();
      const card = { id: cardId, text: textarea.value.trim() };
      initCardData(cardId);
      cardsData[cardId].created = Date.now();
      cardsData[cardId].modified = Date.now();
      
      const column = columns.find(c => c.id === columnId);
      column.cards.push(card);
      
      if (sortMode !== 'manual') {
        column.cards = sortCards(columnId, column.cards);
      }
      
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
      const text = el.querySelector('.card-text').textContent;
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
  const proj = projects.find(p => p.id === currentProjectId);
  if (proj) {
    document.getElementById('board-title').textContent = '🌙 ' + proj.name;
  }
  
  columns = JSON.parse(localStorage.getItem('3lo_board_' + currentProjectId) || JSON.stringify([
    { id: '1', title: 'To Do', cards: [{ id: '1', text: 'First task' }] },
    { id: '2', title: 'In Progress', cards: [] },
    { id: '3', title: 'Done', cards: [] }
  ]));
  
  cardsData = JSON.parse(localStorage.getItem('3lo_cards_data_' + currentProjectId) || '{}');
  
  // Inizializza dati per card esistenti
  columns.forEach(col => {
    col.cards.forEach(card => initCardData(card.id));
  });
  
  render();
}

function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  
  // Sort controls
  const sortDiv = document.createElement('div');
  sortDiv.className = 'note-sort-controls';
  sortDiv.innerHTML = `
    <label>Sort by:</label>
    <select id="sort-select">
      <option value="manual">Manual (drag)</option>
      <option value="name-asc">Name ↑</option>
      <option value="name-desc">Name ↓</option>
      <option value="created-asc">Created ↑</option>
      <option value="created-desc">Created ↓</option>
      <option value="modified-asc">Modified ↑</option>
      <option value="modified-desc">Modified ↓</option>
    </select>
  `;
  board.appendChild(sortDiv);
  
  sortDiv.querySelector('#sort-select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
  });
  
  columns.forEach(column => {
    // Sort cards se non in modalità manuale
    if (sortMode !== 'manual') {
      column.cards = sortCards(column.id, column.cards);
    }
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
          if (colId) {
            newOrder.push(columns.find(c => c.id === colId));
          }
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

document.getElementById('add-list').addEventListener('click', () => {
  const title = prompt('List name:');
  if (title) {
    const colId = Date.now().toString();
    const column = { id: colId, title, cards: [] };
    columns.push(column);
    render();
    save();
  }
});

init();
