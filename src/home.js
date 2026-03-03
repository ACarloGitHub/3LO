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
      <option value="custom">Custom</option>
      <option value="name-asc">Name ↑</option>
      <option value="name-desc">Name ↓</option>
    </select>
  `;
  container.appendChild(sortDiv);
  
  sortDiv.querySelector('select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
    saveProjects();
  });
  
  const sortedProjects = sortMode === 'custom' ? [...projects] : projects.sort((a, b) => a.name.localeCompare(b.name));
  
  if (sortedProjects.length === 0) {
    container.innerHTML += '<div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">No projects yet</div>';
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
  
  // Export con Tauri v1 Save As
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', async (e) => {
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
        exportedAt: new Date().toISOString(),
        _ai_prompt: 'Questa è una board 3LO. Ogni card ha: id, text, e dati in cards con note e date.'
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const filename = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;
      
      // Tauri v1 Save As
      if (window.__TAURI__ && window.__TAURI__.dialog) {
        try {
          const filePath = await window.__TAURI__.dialog.save({
            title: 'Salva progetto come...',
            defaultPath: filename,
            filters: [{ name: 'JSON', extensions: ['json'] }]
          });
          
          if (filePath) {
            await window.__TAURI__.fs.writeFile({ path: filePath, contents: jsonStr });
            alert('✅ Progetto esportato con successo!');
            return;
          }
        } catch (err) {
          console.error('Tauri v1 export error:', err);
        }
      }
      
      // Fallback clipboard
      const modal = document.createElement('div');
      modal.className = 'card-note-modal active';
      modal.innerHTML = `
        <div class="card-note-content" style="max-width: 600px;">
          <div class="card-note-header">
            <h3>📤 Export: ${proj.name}</h3>
            <button class="btn-secondary" onclick="this.closest('.card-note-modal').remove()">Close</button>
          </div>
          <textarea class="card-note-textarea" style="min-height: 200px; font-family: monospace;" readonly>${jsonStr}</textarea>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end;">
            <button class="btn-secondary" id="export-copy">📋 Copy JSON</button>
            <button class="btn-primary" onclick="this.closest('.card-note-modal').remove()">Done</button>
          </div>
        </div>
      `;
      modal.querySelector('#export-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(jsonStr).then(() => {
          modal.querySelector('#export-copy').textContent = '✓ Copied!';
        });
      });
      document.body.appendChild(modal);
    });
  });
  
  // Delete
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
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

console.log('Home loaded. Tauri available:', typeof window.__TAURI__);
