// Board Page - Kanban with SQLite

let columns = [];
let currentProjectId = null;

async function init() {
  await initDB();
  currentProjectId = localStorage.getItem('3lo_current_project');
  
  if (!currentProjectId) {
    window.location.href = './index.html';
    return;
  }
  
  const projects = await getAllProjects();
  const proj = projects.find(p => p.id === currentProjectId);
  if (proj) {
    document.getElementById('board-title').textContent = '🌙 ' + proj.name;
  }
  
  await loadBoard();
}

async function loadBoard() {
  columns = await getBoard(currentProjectId);
  
  // Se board vuota, crea colonne default
  if (columns.length === 0) {
    await createColumn(currentProjectId, 'To Do', 0);
    await createColumn(currentProjectId, 'In Progress', 1);
    await createColumn(currentProjectId, 'Done', 2);
    columns = await getBoard(currentProjectId);
  }
  
  render();
}

function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  
  columns.forEach(column => {
    board.appendChild(createColumnEl(column));
  });
  
  if (typeof Sortable !== 'undefined') {
    new Sortable(board, {
      animation: 150,
      handle: '.column-header',
      ghostClass: 'sortable-ghost',
      onEnd: async () => {
        const newOrder = [];
        document.querySelectorAll('.column').forEach((el, idx) => {
          const colId = el.dataset.id;
          newOrder.push({ id: colId, position: idx });
        });
        for (const item of newOrder) {
          await updateColumnPosition(item.id, item.position);
        }
        await loadBoard();
      }
    });
  }
}

function createColumnEl(column) {
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
  
  colEl.querySelector('.column-title').addEventListener('blur', async (e) => {
    await updateColumnTitle(column.id, e.target.textContent);
  });
  
  colEl.querySelector('.column-delete').addEventListener('click', async () => {
    if (confirm('Delete this list?')) {
      await deleteColumn(column.id);
      await loadBoard();
    }
  });
  
  colEl.querySelector('.add-card').addEventListener('click', () => {
    addCardUI(colEl.querySelector('.cards'), column.id);
  });
  
  const cardsContainer = colEl.querySelector('.cards');
  (column.cards || []).forEach(card => {
    cardsContainer.appendChild(createCardEl(card));
  });
  
  if (typeof Sortable !== 'undefined') {
    new Sortable(cardsContainer, {
      group: 'cards',
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: async () => {
        await updateCardPositions();
      }
    });
  }
  
  return colEl;
}

function createCardEl(card) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.id = card.id;
  cardEl.innerHTML = `<div class="card-text" contenteditable="true">${card.text}</div>`;
  
  cardEl.querySelector('.card-text').addEventListener('blur', async (e) => {
    await updateCardText(card.id, e.target.textContent);
  });
  
  return cardEl;
}

async function updateCardPositions() {
  const colElements = document.querySelectorAll('.column');
  for (const colEl of colElements) {
    const colId = colEl.dataset.id;
    const cardEls = colEl.querySelectorAll('.card');
    for (let i = 0; i < cardEls.length; i++) {
      const cardId = cardEls[i].dataset.id;
      await updateCardPosition(cardId, colId, i);
    }
  }
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
  
  addBtn.addEventListener('click', async () => {
    if (textarea.value.trim()) {
      const cards = container.querySelectorAll('.card');
      await createCard(columnId, textarea.value.trim(), cards.length);
      await loadBoard();
    }
    wrapper.remove();
    btn.style.display = 'block';
  });
  
  cancelBtn.addEventListener('click', () => {
    wrapper.remove();
    btn.style.display = 'block';
  });
}

document.getElementById('back').addEventListener('click', () => {
  window.location.href = './index.html';
});

document.getElementById('add-list').addEventListener('click', async () => {
  const title = prompt('List name:');
  if (title) {
    const position = columns.length;
    await createColumn(currentProjectId, title, position);
    await loadBoard();
  }
});

init();
