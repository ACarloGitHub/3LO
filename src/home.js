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
      const cards = JSON.parse(localStorage.getItem('3lo_cards_data_' + id) || '{}');
      const exportData = {
        version: '1.0',
        project: proj,
        board: board,
        cards: cards,
        metadata: projectsData[id],
        exportedAt: new Date().toISOString(),
        _ai_prompt: 'Questa è una board 3LO. Ogni card ha: id, text, e dati in cards{} con note e date.'
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const filename = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;
      
      // Modal con testo selezionabile (funziona in Tauri)
      const modal = document.createElement('div');
      modal.className = 'card-note-modal active';
      modal.innerHTML = `
        <div class="card-note-content" style="max-width: 600px;">
          <div class="card-note-header">
            <h3>📤 Export: ${proj.name}</h3>
            <button class="btn-secondary" onclick="this.closest('.card-note-modal').remove()">Close</button>
          </div>
          <p style="margin-bottom: 0.5rem; font-size: 0.85rem; opacity: 0.7;">
            File: <b>${filename}</b><br>
            Copia il JSON qui sotto e salvalo manualmente, o usa "Copy JSON"
          </p>
          <textarea class="card-note-textarea" style="min-height: 200px; font-family: monospace; font-size: 0.75rem;" readonly>${jsonStr}</textarea>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end;">
            <button class="btn-secondary" id="export-copy">📋 Copy JSON</button>
            <button class="btn-primary" onclick="this.closest('.card-note-modal').remove()">Done</button>
          </div>
        </div>
      `;
      modal.querySelector('#export-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(jsonStr).then(() => {
          const btn = modal.querySelector('#export-copy');
          const orig = btn.textContent;
          btn.textContent = '✓ Copied!';
          setTimeout(() => btn.textContent = orig, 2000);
        });
      });
      modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
      document.body.appendChild(modal);
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

// Import project
const importBtn = document.getElementById('import-project');
const importInput = document.getElementById('import-file');

if (importBtn && importInput) {
  importBtn.addEventListener('click', () => importInput.click());
  
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Validazione base
        if (!data.project || !data.project.name) {
          alert('File JSON non valido: manca project.name');
          return;
        }
        
        // Crea nuovo progetto con ID fresh (non sovrascrive esistente)
        const newId = Date.now().toString();
        const importedProj = {
          id: newId,
          name: data.project.name + ' (imported)',
          created: Date.now()
        };
        
        projects.push(importedProj);
        
        // Copia dati con nuovo ID
        if (data.board) {
          localStorage.setItem('3lo_board_' + newId, JSON.stringify(data.board));
        }
        if (data.cards) {
          localStorage.setItem('3lo_cards_data_' + newId, JSON.stringify(data.cards));
        }
        
        // Metadati
        initProjectData(newId);
        if (data.metadata) {
          projectsData[newId] = { ...projectsData[newId], ...data.metadata, importedAt: Date.now() };
        }
        
        save();
        render();
        alert(`Progetto "${importedProj.name}" importato con successo!`);
        
      } catch (err) {
        alert('Errore durante l\'import: ' + err.message);
      }
      importInput.value = ''; // Reset per permettere re-import
    };
    reader.readAsText(file);
  });
}

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
