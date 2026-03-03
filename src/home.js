// Home - Projects Management with Sorting

let projects = JSON.parse(localStorage.getItem('3lo_projects')) || [];
let projectsData = JSON.parse(localStorage.getItem('3lo_projects_data')) || {};
let sortMode = localStorage.getItem('3lo_home_sort') || 'custom';

function saveProjects() {
  localStorage.setItem('3lo_projects', JSON.stringify(projects));
  localStorage.setItem('3lo_projects_data', JSON.stringify(projectsData));
  localStorage.setItem('3lo_home_sort', sortMode);
}

function initProjectData(projId) {
  if (!projectsData[projId]) {
    projectsData[projId] = { created: Date.now(), modified: Date.now(), note: '' };
  }
}

function formatDate(ts) {
  if (!ts || ts === 'Invalid Date' || isNaN(ts)) return 'Unknown';
  try {
    const date = new Date(Number(ts));
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString();
  } catch (e) {
    return 'Unknown';
  }
}

function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';

  const sortDiv = document.createElement('div');
  sortDiv.className = 'home-sort-controls';
  sortDiv.style.cssText = 'grid-column: 1 / -1;';
  sortDiv.innerHTML = `
    <label>Sort:</label>
    <select id="home-sort-select">
      <option value="custom">Custom (drag)</option>
      <option value="name-asc">Name ↑</option>
      <option value="name-desc">Name ↓</option>
      <option value="created-asc">Created ↑</option>
      <option value="created-desc">Created ↓</option>
    </select>
  `;
  container.appendChild(sortDiv);

  sortDiv.querySelector('select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
    saveProjects();
  });

  const sortedProjects = sortProjects([...projects]);

  if (sortedProjects.length === 0) {
    container.innerHTML += '<div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: rgba(255,255,255,0.4);"><div style="font-size: 4rem; margin-bottom: 1rem;">📋</div><h3>No projects yet</h3><p>Create your first project</p></div>';
    return;
  }

  sortedProjects.forEach(proj => {
    initProjectData(proj.id);
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = proj.id;
    card.innerHTML = `
      <div class="project-icon">🌙</div>
      <div class="project-title">${proj.name}</div>
      <div class="project-meta">${formatDate(projectsData[proj.id].created)}</div>
      <div class="project-actions">
        <button class="btn-open" data-id="${proj.id}">Open</button>
        <button class="btn-export" data-id="${proj.id}">Exp</button>
        <button class="btn-delete" data-id="${proj.id}">Del</button>
      </div>
    `;
    container.appendChild(card);
  });

  // Open
  document.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.setItem('3lo_current_project', e.target.dataset.id);
      window.location.href = './board.html';
    });
  });

  // Export - DOWNLOAD NATIVO FUNZIONA OVUNQUE
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      const proj = projects.find(p => String(p.id) === String(id));
      if (!proj) return;

      const board = JSON.parse(localStorage.getItem('3lo_board_' + id) || '[]');
      const cards = JSON.parse(localStorage.getItem('3lo_cards_data_' + id) || '{}');
      const exportData = {
        version: '1.0',
        project: proj,
        board: board,
        cards: cards,
        metadata: projectsData[id],
        exportedAt: new Date().toISOString(),
        _ai_prompt: 'Questa è una board 3LO. Ogni card ha: id, text, e dati in cards con note e date.'
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // DOWNLOAD AUTOMATICO - funziona in browser e Tauri!
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Export downloaded:', a.download);
    });
  });

  // Delete
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      if (confirm('Delete this project?')) {
        projects = projects.filter(p => String(p.id) !== String(id));
        delete projectsData[id];
        localStorage.removeItem('3lo_board_' + id);
        localStorage.removeItem('3lo_cards_data_' + id);
        saveProjects();
        render();
      }
    });
  });

  // Drag & Drop solo in custom mode
  if (sortMode === 'custom' && typeof Sortable !== 'undefined') {
    new Sortable(container, {
      animation: 150,
      handle: '.project-card',
      ghostClass: 'sortable-ghost',
      onEnd: () => {
        const newOrder = [];
        document.querySelectorAll('.project-card').forEach(el => {
          const proj = projects.find(p => String(p.id) === String(el.dataset.id));
          if (proj) newOrder.push(proj);
        });
        projects = newOrder;
        saveProjects();
      }
    });
  }
}

function sortProjects(projList) {
  projList.forEach(p => initProjectData(p.id));
  if (sortMode === 'custom') return projList;

  const sorted = [...projList];
  switch (sortMode) {
    case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
    case 'created-asc': sorted.sort((a, b) => (projectsData[a.id]?.created || 0) - (projectsData[b.id]?.created || 0)); break;
    case 'created-desc': sorted.sort((a, b) => (projectsData[b.id]?.created || 0) - (projectsData[a.id]?.created || 0)); break;
  }
  return sorted;
}

document.getElementById('new-project').addEventListener('click', () => {
  const name = prompt('Project name:');
  if (name) {
    const id = Date.now().toString();
    projects.push({ id: String(id), name, created: Date.now() });
    initProjectData(String(id));
    saveProjects();
    render();
  }
});

projects.forEach(p => initProjectData(p.id));
render();

console.log('3LO Home loaded');
