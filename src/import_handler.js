import { saveProject, loadProject, getAllProjects, initDB } from './db_sqlite.js';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import logger from './logger.js';

// ==========================================
// IMPORT DIALOG - Separazione logica
// ==========================================

/**
 * Mostra la dialog di conferma per sovrascrittura (async)
 * @param {string} projectName - Nome del progetto
 * @returns {Promise<boolean>} - true se l'utente conferma, false altrimenti
 */
async function showOverwriteDialog(projectName) {
  return await confirm(`Il progetto "${projectName}" esiste già. Sovrascrivere?`, {
    title: 'Conferma sovrascrittura',
    okLabel: 'Sovrascrivi',
    cancelLabel: 'Annulla'
  });
}

/**
 * Importa un progetto senza conferma
 */
async function importProject(data) {
  logger.info('import', `Importazione progetto: ${data.project.name}`);
  
  // Salva su DB
  await saveProject(data.project, data.board, data.cards || {});
  logger.info('import', 'Salvataggio DB completato');
  
  // Salva anche su localStorage
  localStorage.setItem('3lo_board_' + data.project.id, JSON.stringify(data.board));
  localStorage.setItem('3lo_cards_data_' + data.project.id, JSON.stringify(data.cards || {}));
  
  // Verifica
  const saved = await loadProject(data.project.id);
  if (saved && Array.isArray(saved.board) && saved.board.length === data.board.length) {
    logger.info('import', 'Importazione completata con successo');
    return true;
  } else {
    logger.error('import', 'Errore durante la verifica dei dati');
    return false;
  }
}

// ==========================================
// MAIN
// ==========================================

// Inizializza DB
initDB().then(() => logger.info('db', 'Database pronto'));

// Protezione globale
if (window._3loImportHandlerLoaded) {
  logger.debug('import', 'Handler già caricato, salto');
} else {
  window._3loImportHandlerLoaded = true;
  logger.info('import', 'Handler registrato');

  const importBtn = document.getElementById('import-project');
  
  if (importBtn) {
    logger.info('import', 'Listener registrato');
    
    importBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      
      // Protezione doppio click
      if (importBtn.getAttribute('data-importing') === 'true') {
        logger.warn('import', 'Import già in corso');
        return;
      }
      importBtn.setAttribute('data-importing', 'true');
      importBtn.setAttribute('disabled', 'true');
      
      try {
        const filePath = await open({
          title: 'Importa progetto',
          filters: [{ name: 'JSON', extensions: ['json'] }],
          multiple: false
        });
        
        if (!filePath) {
          return;
        }
        
        logger.info('import', `File selezionato: ${filePath}`);
        
        const text = await readTextFile(filePath);
        const data = JSON.parse(text);
        
        // Validazione struttura
        if (!data.project || !data.project.id || !data.project.name) {
          alert('❌ File non valido: mancano dati progetto');
          return;
        }
        
        if (!Array.isArray(data.board)) {
          alert('❌ File non valido: board non è un array');
          return;
        }
        
        logger.info('import', `Validazione OK. Board: ${data.board.length} colonne`);
        
        // Controllo esistente
        const existing = await getAllProjects();
        const found = existing.find(p => p.id === data.project.id);
        
        // Se esiste, mostra dialog di conferma (async)
        if (found) {
          const confirmed = await showOverwriteDialog(data.project.name);
          if (!confirmed) {
            logger.info('import', 'Importazione annullata dall\'utente');
            return;
          }
        }
        
        // Importa (con o senza conferma precedente)
        const success = await importProject(data);
        
        if (success) {
          alert('✅ Progetto importato: ' + data.project.name);
          window.dispatchEvent(new CustomEvent('projects-updated'));
        } else {
          alert('❌ Errore durante l\'importazione');
        }
        
      } catch (err) {
        logger.error('import', `Errore: ${err.message}`);
        alert('❌ Errore: ' + err.message);
      } finally {
        // Rilascia il lock
        importBtn.removeAttribute('data-importing');
        importBtn.removeAttribute('disabled');
      }
    });
  }
}

// Rimuovi input HTML (non serve più)
const oldInput = document.getElementById('import-file');
if (oldInput) oldInput.remove();