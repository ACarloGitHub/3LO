// Home - Projects Management with SQLite

let projects = [];
let currentProjectId = null;

async function init() {
  await initDB();
  await loadProjects();
}

async function loadProjects() {
  projects = await getAllProjects();
  render();
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
      <p>Created: ${formatDate(proj.created_at)}</p>
      <div class="project-actions">
        <button class="btn-open" data-id="${proj.id}">Open</button>
        <button class="btn-export" data-id="${proj.id}">Export</button>
        <button class="btn-delete" data-id="${proj.id}">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  document.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      localStorage.setItem('3lo_current_project', id);
      window.location.href = './board.html';
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete this project?')) {
        await deleteProject(id);
        await loadProjects();
      }
    });
  });
  
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const proj = projects.find(p => p.id == id);
      const board = await getBoard(id);
      const data = { project: { id: proj.id, name: proj.name, created_at: proj.created_at }, board: board };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proj.name}.json`;
      a.click();
    });
  });
}

document.getElementById('new-project').addEventListener('click', async () => {
  const name = prompt('Project name:');
  if (name) {
    await createProject(name);
    await loadProjects();
  }
});

init();
