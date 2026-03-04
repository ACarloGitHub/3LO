// Home - Projects Management (con SQLite)
import { getAllProjects, saveProject, deleteProject, loadProject, initDB } from './db_sqlite.js';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

let projects = [];
let currentSortMode = 'custom';
let isImporting = false;

// Inizializza all'avvio
async function init() {
  await initDB();
  await loadProjects();
  render();
}

async function loadProjects() {
  projects = await getAllProjects();
}

function sortProjects(list) {
  if (currentSortMode === 'custom') return list;
  const sorted = [...list];
  switch (currentSortMode) {
    case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
  }
  return sorted;
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

async function render() {
  const container = document.getElementById('projects');
  container.innerHTML = '';

  // Controlli ordinamento
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
    currentSortMode = e.target.value;
    render();
  });

  // Mostra progetti
  const sorted = sortProjects(projects);
  
  for (const proj of sorted) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = proj.id;
    card.innerHTML = `
      <div class="project-icon">🌙</div>
      <div class="project-title">${proj.name}</div>
      <div class="project-meta">${formatDate(proj.created)}</div>
      <div class="project-actions">
        <button class="btn-open" data-id="${proj.id}">Open</button>
        <button class="btn-export" data-id="${proj.id}">Exp</button>
        <button class="btn-delete" data-id="${proj.id}">Del</button>
      </div>
    `;
    container.appendChild(card);
  }

  // Event listeners
  document.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      localStorage.setItem('3lo_current_project', id);
      window.location.href = './board.html';
    });
  });

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const proj = projects.find(p => String(p.id) === String(id));
      if (!proj) return;

      // Carica dati completi
      const fullData = await loadProject(id);
      const exportData = {
        version: '1.0',
        project: proj,
        board: fullData?.board || [],
        cards: fullData?.cards || {},
        exportedAt: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const filename = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;

      // Tauri Save Dialog
      try {
        const filePath = await save({
          title: 'Salva progetto',
          defaultPath: filename,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (filePath) {
          await writeTextFile(filePath, jsonStr);
          alert('✅ Salvato!');
        }
      } catch (err) {
        console.error('Export error:', err);
        // Fallback
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete?')) {
        await deleteProject(id);
        await loadProjects();
        render();
      }
    });
  });

  // Drag se custom
  if (currentSortMode === 'custom' && typeof Sortable !== 'undefined') {
    // TODO: implementare riordinamento drag con SQLite
    // Per ora disabilitato, serve aggiornare posizione nel DB
  }
}

// New Project
document.getElementById('new-project').addEventListener('click', async () => {
  const name = prompt('Project name:');
  if (name) {
    const id = Date.now().toString();
    const project = { id, name, created: Date.now() };
    await saveProject(project, [], {});
    await loadProjects();
    render();
  }
});

// Import Project - usa dialog Tauri (una sola finestra)
document.getElementById('import-project')?.addEventListener('click', async () => {
  if (isImporting) return;
  isImporting = true;
  
  try {
    const filePath = await open({
      title: 'Importa progetto',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false
    });
    
    if (!filePath) {
      isImporting = false;
      return;
    }
    
    const content = await readTextFile(filePath);
    const data = JSON.parse(content);
    
    if (data.project && data.project.id && data.project.name) {
      const existing = await getAllProjects();
      const found = existing.find(p => p.id === data.project.id);
      
      if (found) {
        if (!confirm('Progetto "' + data.project.name + '" esiste già. Sovrascrivere?')) {
          isImporting = false;
          return;
        }
      }
      
      await saveProject(data.project, data.board || [], data.cards || {});
      alert('✅ Progetto importato: ' + data.project.name);
      await loadProjects();
      render();
    } else {
      alert('❌ File non valido');
    }
  } catch (err) {
    alert('❌ Errore: ' + err.message);
    console.error(err);
  } finally {
    isImporting = false;
  }
});

// Avvia
init();
