import { saveProject, getAllProjects, initDB } from './db_sqlite.js';

// Inizializza DB
initDB().then(() => console.log('DB ready'));

// Click import -> apre file picker HTML
document.getElementById('import-project')?.addEventListener('click', () => {
  document.getElementById('import-file')?.click();
});

// Quando selezioni file
document.getElementById('import-file')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (data.project && data.project.id && data.project.name) {
      const existing = await getAllProjects();
      const found = existing.find(p => p.id === data.project.id);
      
      if (found) {
        if (!confirm('Progetto "' + data.project.name + '" esiste già. Sovrascrivere?')) {
          e.target.value = '';
          return;
        }
      }
      
      await saveProject(data.project, data.board || [], data.cards || {});
      alert('✅ Progetto importato: ' + data.project.name);
      window.location.reload();
    } else {
      alert('❌ File non valido');
    }
  } catch (err) {
    alert('❌ Errore: ' + err.message);
  } finally {
    e.target.value = '';
  }
});
