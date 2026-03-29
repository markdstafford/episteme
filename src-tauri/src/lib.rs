mod commands;
mod comments_types;
mod context;
mod db;
mod frontmatter;
mod manifest_loader;
mod session;
mod tool_catalog;

use manifest_loader::LoadedManifests;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::Emitter;
use tauri::Manager;

pub struct ManifestState(pub std::sync::Mutex<Option<LoadedManifests>>);
pub struct WatcherState(pub std::sync::Mutex<Option<notify::RecommendedWatcher>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      commands::folder::open_folder,
      commands::preferences::save_preferences,
      commands::preferences::load_preferences,
      commands::files::list_files,
      commands::files::read_file,
      commands::ai::ai_sso_login,
      commands::ai::ai_check_auth,
      commands::ai::ai_chat,
      commands::ai::ai_suggest_session_name,
      commands::skills::count_documents_by_type,
      commands::manifests::load_manifests,
      commands::updater::check_for_update,
      commands::updater::install_update,
      commands::sessions::load_sessions,
      commands::sessions::save_session,
      commands::sessions::delete_session,
      commands::sessions::pin_session,
      commands::comments::init_workspace_db,
      commands::comments::get_doc_id_for_file,
      commands::comments::ensure_doc_id_for_file,
      commands::comments::load_threads,
      commands::comments::commit_comment,
      commands::comments::update_thread_status,
      commands::comments::toggle_blocking,
      commands::comments::toggle_pinned,
      commands::comments::queue_comment,
      commands::comments::toggle_queued_body,
      commands::comments::cancel_queued_comment,
      commands::comments::load_queued_comments,
      commands::comments::update_thread_anchors,
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
      let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;
      let file_menu = Submenu::with_items(app, "File", true, &[&open_folder_item, &settings_item])?;
      let menu = Menu::with_items(app, &[&file_menu])?;
      app.set_menu(menu)?;

      app.on_menu_event(|app, event| {
        if event.id() == "open_folder" {
          let _ = app.emit("menu:open-folder", ());
        }
        if event.id() == "settings" {
          app.emit("menu:open-settings", ()).ok();
        }
      });

      app.manage(commands::updater::PendingUpdate(std::sync::Mutex::new(None)));
      app.manage(commands::sessions::SessionsLock(std::sync::Mutex::new(())));
      app.manage(ManifestState(std::sync::Mutex::new(None)));
      app.manage(WatcherState(std::sync::Mutex::new(None)));
      app.manage(db::DbState(std::sync::Mutex::new(None)));

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
