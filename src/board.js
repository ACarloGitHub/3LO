// Board Page - Kanban with localStorage

let columns = [];
let cardCounter = parseInt(localStorage.getItem('3lo_card_counter')) || 2;
let colCounter = parseInt(localStorage.getItem('3lo_col_counter')) || 4;
let currentProjectId = null;

function save() {
  localStorage.setItem('3lo_board_' + currentProjectId, JSON.stringify(columns));
  localStorage.setItem('3lo_card_counter', cardCounter);
  localStorage.setItem('3lo_col_counter', colCounter);
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
  column.cards.forEach(card => {
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
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.id = card.id;
  cardEl.innerHTML = `<div class="card-text" contenteditable="true">${card.text}</div>`;
  
  cardEl.querySelector('.card-text').addEventListener('blur', (e) => {
    card.text = e.target.textContent;
    save();
  });
  
  return cardEl;
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
      const column = columns.find(c => c.id === columnId);
      column.cards.push(card);
      container.appendChild(createCard(card));
      save();
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
    column.cards = Array.from(cardEls).map(el => ({
      id: el.dataset.id,
      text: el.querySelector('.card-text').textContent
    }));
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
          newOrder.push(columns.find(c => c.id === el.dataset.id));
        });
        columns = newOrder;
        save();
      }
    });
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
      board.appendChild(createColumn(column));
      save();
    }
  });
}

init();
