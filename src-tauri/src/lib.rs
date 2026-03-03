// Tauri commands for 3LO export functionality
use tauri_plugin_dialog::DialogExt;
use tauri::Manager;

#[tauri::command]
async fn export_json_file(
    window: tauri::Window,
    data: String,
    default_filename: String,
) -> Result<String, String> {
    // Use tauri dialog to let user choose where to save
    if let Some(path) = window
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&default_filename)
        .save_file()
        .await
    {
        // Write the file using fs plugin
        match window.fs().write(&path, data) {
            Ok(_) => Ok(path.to_string_lossy().to_string()),
            Err(e) => Err(format!("Failed to write file: {}", e)),
        }
    } else {
        Err("User cancelled".to_string())
    }
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
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
