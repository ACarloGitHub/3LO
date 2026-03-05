// Home - Projects Management (con SQLite)
import { getAllProjects, saveProject, deleteProject, loadProject, initDB, renameProject } from './db_sqlite.js';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

let projects = [];
let currentSortMode = 'custom';

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
        <button class="btn-rename" data-id="${proj.id}">Ren</button>
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

      // Carica dati da localStorage (dove li salva board.js)
      const boardJson = localStorage.getItem('3lo_board_' + id);
      const cardsJson = localStorage.getItem('3lo_cards_data_' + id);
      
      const fullData = {
        project: proj,
        board: boardJson ? JSON.parse(boardJson) : [],
        cards: cardsJson ? JSON.parse(cardsJson) : {}
      };
      const exportData = {
        "_documentation": {
          "format": "3LO Project Export v1.0",
          "description": "Struttura JSON per importazione in 3LO",
          "fields": {
            "version": "Versione formato (stringa, es: '1.0')",
            "project": {
              "id": "ID univoco progetto (stringa)",
              "name": "Nome visualizzato (stringa)",
              "created": "Timestamp creazione (numero, epoch ms)"
            },
            "board": "Array colonne, ognuna con {id, title, cards: [{id, text}]}",
            "cards": "Oggetto metadata card (può essere vuoto {})",
            "exportedAt": "ISO 8601 timestamp export"
          },
          "regole": [
            "board è array: [{id, title, cards: [...]}]",
            "cards dentro board ha solo {id, text}",
            "cards (root) è oggetto metadata: {cardId: {created, modified, note}}",
            "id progetto univoco, senza spazi",
            "text supporta emoji e unicode"
          ]
        },
        version: '1.0',
        project: proj,
        board: fullData?.board || [],
        cards: fullData?.cards || {},
        exportedAt: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const filename = `${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3lo.json`;

      // SALVATAGGIO FILE
      try {
        console.log('🔄 [1/5] Apertura dialog save...');
        console.log('   Filename suggerito:', filename);
        
        const filePath = await save({
          title: 'Salva progetto',
          defaultPath: filename,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        console.log('📂 [2/5] Dialog chiuso. Percorso:', filePath);
        
        if (!filePath) {
          console.log('❌ [3/5] Percorso vuoto - utente ha annullato?');
          return;
        }
        
        console.log('📝 [3/5] Scrittura file con writeTextFile...');
        console.log('   Lunghezza JSON:', jsonStr.length, 'caratteri');
        
        await writeTextFile(filePath, jsonStr);
        
        console.log('✅ [4/5] writeTextFile completato!');
        console.log('   File salvato in:', filePath);
        
        alert('✅ Salvato in:\n' + filePath);
        
      } catch (err) {
        console.error('❌ [5/5] ERRORE:', err);
        console.error('   Messaggio:', err.message);
        console.error('   Stack:', err.stack);
        alert('❌ Errore salvataggio:\n' + err.message);
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

  // RENAME
  document.querySelectorAll('.btn-rename').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const proj = projects.find(p => String(p.id) === String(id));
      if (!proj) return;
      
      const newName = prompt('Nuovo nome:', proj.name);
      if (newName && newName.trim() !== '' && newName !== proj.name) {
        await renameProject(id, newName.trim());
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

// Avvia
init();
