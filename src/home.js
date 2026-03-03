// Home - Projects Management
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
  if (!ts) return 'Unknown';
  try {
    const date = new Date(Number(ts));
    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
  } catch (e) {
    return 'Unknown';
  }
}

function sortProjects(list) {
  if (sortMode === 'custom') return list;
  const sorted = [...list];
  switch (sortMode) {
    case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
  }
  return sorted;
}

function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';

  const sortDiv = document.createElement('div');
  sortDiv.className = 'home-sort-controls';
  sortDiv.innerHTML = `
    <label>Sort:</label>
    <select id="home-sort-select">
      <option value="custom">Custom</option>
      <option value="name-asc">Name ↑</option>
      <option value="name-desc">Name ↓</option>
    </select>
  `;
  container.appendChild(sortDiv);

  document.getElementById('home-sort-select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
    saveProjects();
  });

  const sorted = sortProjects(projects);
  sorted.forEach(proj => {
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
      localStorage.setItem('3lo_current_project', e.target.dataset.id);
      window.location.href = './board.html';
    });
  });

  // Export - Tauri v1 Save As
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', async (e) => {
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
        exportedAt: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const filename = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;

      // Tauri v1 Save Dialog
      if (window.__TAURI__ && window.__TAURI__.dialog) {
        try {
          const filePath = await window.__TAURI__.dialog.save({
            title: 'Salva progetto',
            defaultPath: filename,
            filters: [{ name: 'JSON', extensions: ['json'] }]
          });
          
          if (filePath) {
            await window.__TAURI__.fs.writeTextFile(filePath, jsonStr);
            alert('✅ Salvato!');
            return;
          }
        } catch (err) {
          console.error('Export error:', err);
        }
      }

      // Fallback
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    });
  });

  // Delete
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete?')) {
        projects = projects.filter(p => String(p.id) !== String(id));
        delete projectsData[id];
        localStorage.removeItem('3lo_board_' + id);
        localStorage.removeItem('3lo_cards_data_' + id);
        saveProjects();
        render();
      }
    });
  });

  // Drag
  if (sortMode === 'custom' && typeof Sortable !== 'undefined') {
    new Sortable(container, {
      animation: 150,
      handle: '.project-card',
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
