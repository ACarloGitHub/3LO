import { saveProject, loadProject, getAllProjects, initDB } from './db_sqlite.js';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';

// Inizializza DB
initDB().then(() => console.log('DB ready'));

// Protezione: usa attributo sul bottone invece di flag globale
const importBtn = document.getElementById('import-project');
if (importBtn && !importBtn.hasAttribute('data-listener')) {
  importBtn.setAttribute('data-listener', 'true');
  
  importBtn.addEventListener('click', async () => {
    try {
      const filePath = await open({
        title: 'Importa progetto',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false
      });
      
      if (!filePath) return;
      
      console.log('📂 File selezionato:', filePath);
      
      const text = await readTextFile(filePath);
      console.log('📄 Contenuto letto:', text.substring(0, 500));
      
      const data = JSON.parse(text);
      console.log('📦 JSON parsato:', data);
      
      // Validazione struttura
      if (!data.project || !data.project.id || !data.project.name) {
        alert('❌ File non valido: mancano dati progetto');
        return;
      }
      
      if (!Array.isArray(data.board)) {
        alert('❌ File non valido: board non è un array');
        return;
      }
      
      console.log('✅ Validazione passata. Board:', data.board);
      
      // Controllo esistente
      const existing = await getAllProjects();
      const found = existing.find(p => p.id === data.project.id);
      
      if (found) {
        const ok = confirm('Progetto "' + data.project.name + '" esiste già. Sovrascrivere?');
        if (!ok) return;
      }
      
      // Salva su DB
      await saveProject(data.project, data.board, data.cards || {});
      console.log('💾 Salvataggio DB completato');
      
      // Salva anche su localStorage (per board.js)
      localStorage.setItem('3lo_board_' + data.project.id, JSON.stringify(data.board));
      localStorage.setItem('3lo_cards_data_' + data.project.id, JSON.stringify(data.cards || {}));
      console.log('💾 Salvataggio localStorage completato');
      
      // Verifica
      const saved = await loadProject(data.project.id);
      console.log('🔍 Dati salvati:', saved);
      
      if (saved && Array.isArray(saved.board) && saved.board.length === data.board.length) {
        console.log('✅ Verifica OK');
        alert('✅ Progetto importato: ' + data.project.name);
        window.location.reload();
      } else {
        console.error('❌ Discrepanza dati:', { atteso: data.board.length, salvato: saved?.board?.length });
        alert('⚠️ Salvataggio incoerente. Controlla console.');
      }
      
    } catch (err) {
      console.error('❌ Import error:', err);
      alert('❌ Errore: ' + err.message);
    }
  });
}

// Rimuovi input HTML (non serve più)
const oldInput = document.getElementById('import-file');
if (oldInput) oldInput.remove();
