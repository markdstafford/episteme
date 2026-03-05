mod commands;
mod context;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      commands::folder::open_folder,
      commands::preferences::save_preferences,
      commands::preferences::load_preferences,
      commands::files::list_files,
      commands::files::read_file,
      commands::ai::ai_sso_login,
      commands::ai::ai_check_auth,
      commands::ai::ai_chat,
    ])
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
