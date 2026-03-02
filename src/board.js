// 3LO Board - No ES modules for Tauri compatibility
const projectId = localStorage.getItem('3lo_current_project');
const storageKey = '3lo_board_' + projectId;

let columns = JSON.parse(localStorage.getItem(storageKey)) || [
  { id: '1', title: 'To Do', cards: [{ id: '1', text: 'First task' }] },
  { id: '2', title: 'In Progress', cards: [] },
  { id: '3', title: 'Done', cards: [] }
];

function save() {
  localStorage.setItem(storageKey, JSON.stringify(columns));
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
    columns = columns.filter(c => c.id !== column.id);
    colEl.remove();
    save();
  });
  
  colEl.querySelector('.add-card').addEventListener('click', () => {
    addCard(colEl.querySelector('.cards'), column.id);
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
      onEnd: updateOrder
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
  
  addBtn.addEventListener('click', () => {
    if (textarea.value.trim()) {
      const card = { id: Date.now().toString(), text: textarea.value.trim() };
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

function updateOrder() {
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
  if (!projectId) {
    window.location.href = './index.html';
    return;
  }
  
  const projects = JSON.parse(localStorage.getItem('3lo_projects')) || [];
  const proj = projects.find(p => p.id === projectId);
  if (proj) {
    document.getElementById('board-title').textContent = '🌙 ' + proj.name;
  }
  
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
    const id = Date.now().toString();
    const column = { id, title: 'New List', cards: [] };
    columns.push(column);
    board.appendChild(createColumn(column));
    save();
  });
}

init();
