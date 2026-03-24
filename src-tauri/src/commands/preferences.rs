use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Preferences {
    pub last_opened_folder: Option<String>,
    #[serde(default)]
    pub aws_profile: Option<String>,
    #[serde(default)]
    pub recently_used_skill_types: Vec<String>,
    #[serde(default = "default_preview_width")]
    pub preview_width: String,
    #[serde(default = "default_preview_height")]
    pub preview_height: String,
}

fn default_preview_width() -> String { "50%".to_string() }
fn default_preview_height() -> String { "75%".to_string() }

impl Default for Preferences {
    fn default() -> Self {
        Preferences {
            last_opened_folder: None,
            aws_profile: None,
            recently_used_skill_types: Vec::new(),
            preview_width: default_preview_width(),
            preview_height: default_preview_height(),
        }
    }
}

fn preferences_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data.join("preferences.json"))
}

#[tauri::command]
pub async fn save_preferences(
    app: tauri::AppHandle,
    preferences: Preferences,
) -> Result<(), String> {
    let path = preferences_path(&app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create preferences directory: {}", e))?;
    }

    let json =
        serde_json::to_string_pretty(&preferences).map_err(|e| format!("Serialize error: {}", e))?;

    fs::write(&path, json).map_err(|e| format!("Failed to write preferences: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_preferences(app: tauri::AppHandle) -> Result<Preferences, String> {
    let path = preferences_path(&app)?;

    if !path.exists() {
        return Ok(Preferences::default());
    }

    let contents =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read preferences: {}", e))?;

    Ok(serde_json::from_str(&contents).unwrap_or_else(|_| Preferences::default()))
}
