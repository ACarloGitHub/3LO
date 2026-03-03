// Tauri commands for 3LO export functionality
use std::sync::mpsc;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn export_json_file(
    window: tauri::Window,
    data: String,
    default_filename: String,
) -> Result<String, String> {
    // Create channel to get result from callback
    let (tx, rx) = mpsc::channel();
    
    // Open save dialog with callback
    window.dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&default_filename)
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });
    
    // Wait for result
    match rx.recv() {
        Ok(Some(file_path)) => {
            let path_str = file_path.to_string();
            match std::fs::write(&path_str, data) {
                Ok(_) => Ok(path_str),
                Err(e) => Err(format!("Failed to write file: {}", e)),
            }
        }
        Ok(None) => Err("User cancelled".to_string()),
        Err(e) => Err(format!("Dialog error: {}", e)),
    }
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![export_json_file])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
