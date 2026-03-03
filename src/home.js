// Home - Projects Management with Sorting

let projects = JSON.parse(localStorage.getItem('3lo_projects')) || [];
let projectsData = JSON.parse(localStorage.getItem('3lo_projects_data')) || {};
let sortMode = localStorage.getItem('3lo_home_sort') || 'custom';

function save() {
  localStorage.setItem('3lo_projects', JSON.stringify(projects));
  localStorage.setItem('3lo_projects_data', JSON.stringify(projectsData));
  localStorage.setItem('3lo_home_sort', sortMode);
}

function initProjectData(projId) {
  if (!projectsData[projId]) {
    projectsData[projId] = {
      created: Date.now(),
      modified: Date.now(),
      note: ''
    };
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

function sortProjects(projList) {
  projList.forEach(p => initProjectData(p.id));
  if (sortMode === 'custom') return projList;
  
  const sorted = [...projList];
  switch(sortMode) {
    case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
    case 'created-asc': sorted.sort((a, b) => projectsData[a.id].created - projectsData[b.id].created); break;
    case 'created-desc': sorted.sort((a, b) => projectsData[b.id].created - projectsData[a.id].created); break;
    case 'modified-asc': sorted.sort((a, b) => projectsData[a.id].modified - projectsData[b.id].modified); break;
    case 'modified-desc': sorted.sort((a, b) => projectsData[b.id].modified - projectsData[a.id].modified); break;
  }
  return sorted;
}

function openNote(projId) {
  initProjectData(projId);
  const modal = document.createElement('div');
  modal.className = 'card-note-modal active';
  modal.innerHTML = `
    <div class="card-note-content">
      <div class="card-note-header">
        <h3>🌙 Project Note</h3>
        <button class="btn-secondary" onclick="this.closest('.card-note-modal').remove()">Close</button>
      </div>
      <textarea class="card-note-textarea" placeholder="Add notes...">${projectsData[projId].note}</textarea>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <span style="font-size: 0.8rem; color: rgba(255,255,255,0.5)">${formatDate(projectsData[projId].created)}</span>
        <button class="btn-primary" id="save-note">Save</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#save-note').addEventListener('click', () => {
    projectsData[projId].note = modal.querySelector('.card-note-textarea').value;
    projectsData[projId].modified = Date.now();
    save();
    modal.remove();
  });
  document.body.appendChild(modal);
}

function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';
  
  // Sort controls
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
      <option value="modified-asc">Modified ↑</option>
      <option value="modified-desc">Modified ↓</option>
    </select>
  `;
  container.appendChild(sortDiv);
  sortDiv.querySelector('select').value = sortMode;
  sortDiv.querySelector('select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
    save();
  });
  
  const sortedProjects = sortMode === 'custom' ? [...projects] : sortProjects(projects);
  
  if (sortedProjects.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = `
      <div class="empty-state-icon">📋</div>
      <h3>No projects yet</h3>
      <p>Create your first project to get started</p>
    `;
    container.appendChild(empty);
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
        <button class="btn-note" data-id="${proj.id}">Note</button>
        <button class="btn-export" data-id="${proj.id}">Exp</button>
        <button class="btn-delete" data-id="${proj.id}">Del</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  // Events
  document.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.setItem('3lo_current_project', e.target.dataset.id);
      window.location.href = './board.html';
    });
  });
  
  document.querySelectorAll('.btn-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openNote(e.target.dataset.id);
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      if (confirm('Delete?')) {
        projects = projects.filter(p => String(p.id) !== String(id));
        delete projectsData[id];
        // Pulizia dati orfani del progetto cancellato
        localStorage.removeItem('3lo_board_' + id);
        localStorage.removeItem('3lo_cards_data_' + id);
        save();
        render();
      }
    });
  });
  
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      const proj = projects.find(p => String(p.id) === String(id));
      if (!proj) return;
      const board = JSON.parse(localStorage.getItem('3lo_board_' + id) || '[]');
      const blob = new Blob([JSON.stringify({project: proj, board, metadata: projectsData[id]}, null, 2)], {type: 'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${proj.name}.json`;
      a.click();
    });
  });
  
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        localStorage.setItem('3lo_current_project', card.dataset.id);
        window.location.href = './board.html';
      }
    });
  });
  
  // Drag only in custom mode
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
        save();
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
    save();
    render();
  }
});

projects.forEach(p => initProjectData(p.id));
render();

// Salva immediatamente su evento beforeunload (per chiusura finestra Ctrl+Q o X)
window.addEventListener('beforeunload', () => {
  save();
});

// Per Tauri: gestione chiusura finestra
if (window.__TAURI__) {
  window.addEventListener('blur', save); // Salva quando perde focus
}
