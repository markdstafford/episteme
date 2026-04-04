use serde_json::Value;
use tauri::Manager;

pub struct CommentAiLogLock(pub std::sync::Mutex<()>);

const MAX_ENTRIES: usize = 100;

fn log_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data.join("comment-ai-log.json"))
}

#[tauri::command]
pub async fn log_comment_ai(
    app: tauri::AppHandle,
    state: tauri::State<'_, CommentAiLogLock>,
    entry: Value,
) -> Result<(), String> {
    let path = log_path(&app)?;
    let _guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let mut entries: Vec<Value> = if path.exists() {
        let contents = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        vec![]
    };

    entries.push(entry);

    if entries.len() > MAX_ENTRIES {
        let drain = entries.len() - MAX_ENTRIES;
        entries.drain(0..drain);
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let json = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write log: {}", e))
}
