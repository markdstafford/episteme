mod commands;
mod context;
mod skill_loader;

use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::Emitter;

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

      let open_folder_item = MenuItem::with_id(app, "open_folder", "Open Folder...", true, Some("CmdOrCtrl+O"))?;
      let file_menu = Submenu::with_items(app, "File", true, &[&open_folder_item])?;
      let menu = Menu::with_items(app, &[&file_menu])?;
      app.set_menu(menu)?;

      app.on_menu_event(|app, event| {
        if event.id() == "open_folder" {
          let _ = app.emit("menu:open-folder", ());
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
