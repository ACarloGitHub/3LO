// Home - Projects Management

let projects = JSON.parse(localStorage.getItem('3lo_projects')) || [
  { id: '1', name: 'My First Board', created: Date.now() }
];

function save() {
  localStorage.setItem('3lo_projects', JSON.stringify(projects));
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString();
}

function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';
  
  projects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h3>${proj.name}</h3>
      <p>Created: ${formatDate(proj.created)}</p>
      <div class="project-actions">
        <button class="btn-open" data-id="${proj.id}">Open</button>
        <button class="btn-export" data-id="${proj.id}">Export</button>
        <button class="btn-delete" data-id="${proj.id}">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  document.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      localStorage.setItem('3lo_current_project', id);
      window.location.href = './board.html';
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete this project?')) {
        projects = projects.filter(p => p.id !== id);
        save();
        render();
      }
    });
  });
  
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const proj = projects.find(p => p.id === id);
      const board = JSON.parse(localStorage.getItem('3lo_board_' + id) || '[]');
      const data = { project: proj, board: board };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proj.name}.json`;
      a.click();
    });
  });
}

document.getElementById('new-project').addEventListener('click', () => {
  const name = prompt('Project name:');
  if (name) {
    const id = Date.now().toString();
    projects.push({ id, name, created: Date.now() });
    save();
    render();
  }
});

render();
