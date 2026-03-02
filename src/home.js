// Home - Projects Management (Compact View)

let projects = JSON.parse(localStorage.getItem('3lo_projects')) || [];

function save() {
  localStorage.setItem('3lo_projects', JSON.stringify(projects));
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString();
}

function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';
  
  if (projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No projects yet</h3>
        <p>Create your first project to get started</p>
      </div>
    `;
    return;
  }
  
  projects.forEach(proj => {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.innerHTML = `
      <div class="project-icon">🌙</div>
      <div class="project-info">
        <div class="project-title">${proj.name}</div>
        <div class="project-meta">Created ${formatDate(proj.created)} · Click to open</div>
      </div>
      <div class="project-actions">
        <button class="btn-open" data-id="${proj.id}">Open</button>
        <button class="btn-export" data-id="${proj.id}">Export</button>
        <button class="btn-delete" data-id="${proj.id}">Delete</button>
      </div>
    `;
    container.appendChild(item);
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
      e.stopPropagation();
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
      e.stopPropagation();
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
  
  // Click on item opens project
  document.querySelectorAll('.project-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const id = item.querySelector('.btn-open').dataset.id;
        localStorage.setItem('3lo_current_project', id);
        window.location.href = './board.html';
      }
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
