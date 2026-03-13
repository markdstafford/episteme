use serde::Serialize;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
pub struct UpdateCheckResult {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
}

// App state to hold pending update (needed for install_update in the next task)
pub struct PendingUpdate(pub std::sync::Mutex<Option<tauri_plugin_updater::Update>>);

#[tauri::command]
pub async fn check_for_update(
    app: tauri::AppHandle,
    state: tauri::State<'_, PendingUpdate>,
) -> Result<UpdateCheckResult, String> {
    log::info!("Update check initiated");

    let updater = app.updater().map_err(|e| {
        log::error!("Failed to get updater: {}", e);
        e.to_string()
    })?;

    match updater.check().await {
        Ok(Some(update)) => {
            log::info!("Update found: version {}", update.version);
            let result = UpdateCheckResult {
                available: true,
                version: Some(update.version.clone()),
                notes: update.body.clone(),
            };
            *state.0.lock().unwrap() = Some(update);
            Ok(result)
        }
        Ok(None) => {
            log::info!("No update available");
            *state.0.lock().unwrap() = None;
            Ok(UpdateCheckResult {
                available: false,
                version: None,
                notes: None,
            })
        }
        Err(e) => {
            log::error!("Update check failed: {}", e);
            Err(e.to_string())
        }
    }
}
