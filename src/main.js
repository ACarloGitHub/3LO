import Sortable from 'sortablejs';

const board = document.getElementById('board');

let columns = JSON.parse(localStorage.getItem('3lo_columns')) || [
  { id: '1', title: 'To Do', cards: [{ id: '1', text: 'Welcome to 3LO!' }] },
  { id: '2', title: 'In Progress', cards: [] },
  { id: '3', title: 'Done', cards: [] }
];

function save() {
  localStorage.setItem('3lo_columns', JSON.stringify(columns));
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
    addCardUI(colEl.querySelector('.cards'), column.id);
  });
  
  const cardsContainer = colEl.querySelector('.cards');
  column.cards.forEach(card => {
    cardsContainer.appendChild(createCard(card));
  });
  
  new Sortable(cardsContainer, {
    group: 'cards',
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: updateCardOrder
  });
  
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
  textarea.placeholder = 'Type here...';
  textarea.rows = 2;
  
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-primary';
  addBtn.textContent = 'Add';
  addBtn.style.marginTop = '0.5rem';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'add-card';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.marginLeft = '0.5rem';
  
  const wrapper = document.createElement('div');
  wrapper.appendChild(textarea);
  wrapper.appendChild(addBtn);
  wrapper.appendChild(cancelBtn);
  
  const addCardBtn = container.parentElement.querySelector('.add-card');
  addCardBtn.style.display = 'none';
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
    addCardBtn.style.display = 'block';
  });
  
  cancelBtn.addEventListener('click', () => {
    wrapper.remove();
    addCardBtn.style.display = 'block';
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

function addColumn() {
  const colId = Date.now().toString();
  const column = { id: colId, title: 'New List', cards: [] };
  columns.push(column);
  document.getElementById('board').appendChild(createColumn(column));
  save();
}

function init() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  columns.forEach(column => {
    board.appendChild(createColumn(column));
  });
  
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
  
  document.getElementById('add-column').textContent = '+ New List';
  document.getElementById('add-column').addEventListener('click', addColumn);
}

init();
