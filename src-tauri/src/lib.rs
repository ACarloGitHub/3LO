#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::time::UNIX_EPOCH;

// Comando per ottenere il percorso base dell'applicazione (dove risiede 3lo)
// Restituisce il percorso alla cartella principale del progetto 3lo
#[tauri::command]
fn get_app_base_path() -> Result<String, String> {
    // Ottieni il percorso dell'eseguibile corrente
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Impossibile ottenere il percorso dell'eseguibile: {}", e))?;
    
    // Risali fino a trovare la cartella principale del progetto (quella che contiene src-tauri)
    let mut current = exe_path.parent();
    
    // Cerca la cartella principale risalendo dalla posizione dell'eseguibile
    // In dev: src-tauri/target/debug/ -> risali fino a trovare src-tauri
    // In produzione: cerchiamo un marker o risaliamo fino a trovare la struttura corretta
    while let Some(parent) = current {
        // Controlla se questa cartella contiene src-tauri (siamo nella root del progetto)
        let src_tauri = parent.join("src-tauri");
        if src_tauri.exists() {
            return Ok(parent.to_string_lossy().to_string());
        }
        
        // Se siamo arrivati alla root del filesystem, fermati
        if parent.parent().is_none() {
            break;
        }
        
        current = parent.parent();
    }
    
    // Fallback: se non troviamo src-tauri, usiamo la cartella dell'eseguibile
    // Questo può succedere in produzione se l'app è installata in modo diverso
    let exe_dir = exe_path.parent()
        .ok_or("Impossibile determinare la cartella dell'eseguibile")?;
    
    Ok(exe_dir.to_string_lossy().to_string())
}

// Comando per ottenere la data di modifica di un file (timestamp in millisecondi)
#[tauri::command]
fn get_file_modified_time(path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Impossibile leggere i metadata del file: {}", e))?;
    
    let modified = metadata.modified()
        .map_err(|e| format!("Impossibile ottenere la data di modifica: {}", e))?;
    
    let duration = modified.duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Errore nel calcolo del timestamp: {}", e))?;
    
    Ok(duration.as_millis() as u64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_app_base_path, get_file_modified_time])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}