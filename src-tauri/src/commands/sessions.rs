use crate::session::Session;
use tauri::Manager;

fn sessions_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data.join("sessions.json"))
}

fn read_sessions(path: &std::path::Path) -> Vec<Session> {
    if !path.exists() {
        return vec![];
    }
    let contents = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            log::warn!("read_sessions: could not read {:?}: {}", path, e);
            return vec![];
        }
    };
    match serde_json::from_str(&contents) {
        Ok(sessions) => sessions,
        Err(e) => {
            log::warn!("read_sessions: malformed JSON in {:?}: {}", path, e);
            vec![]
        }
    }
}

fn write_sessions(path: &std::path::Path, sessions: &[Session]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create sessions directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(sessions)
        .map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(path, json)
        .map_err(|e| format!("Failed to write sessions: {}", e))
}

fn prune_sessions(sessions: Vec<Session>) -> Vec<Session> {
    let cutoff = chrono::Utc::now() - chrono::Duration::days(90);
    sessions
        .into_iter()
        .filter(|s| {
            if s.pinned {
                return true;
            }
            chrono::DateTime::parse_from_rfc3339(&s.last_active_at)
                .map(|dt| dt >= cutoff)
                .unwrap_or(true) // keep if unparseable
        })
        .collect()
}

#[tauri::command]
pub async fn load_sessions(app: tauri::AppHandle) -> Result<Vec<Session>, String> {
    let path = sessions_path(&app)?;
    let sessions = read_sessions(&path);
    let pruned = prune_sessions(sessions);
    write_sessions(&path, &pruned)?;
    log::info!("load_sessions: returning {} sessions", pruned.len());
    Ok(pruned)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn make_session(id: &str, days_ago: i64, pinned: bool) -> Session {
        let ts = (chrono::Utc::now() - chrono::Duration::days(days_ago))
            .to_rfc3339();
        Session {
            id: id.to_string(),
            created_at: ts.clone(),
            last_active_at: ts,
            last_mode: "view".to_string(),
            pinned,
            messages_all: vec![],
            messages_compacted: vec![],
        }
    }

    #[test]
    fn test_prune_removes_old_unpinned() {
        let sessions = vec![make_session("old", 91, false)];
        let pruned = prune_sessions(sessions);
        assert!(pruned.is_empty());
    }

    #[test]
    fn test_prune_keeps_recent_unpinned() {
        let sessions = vec![make_session("recent", 10, false)];
        let pruned = prune_sessions(sessions);
        assert_eq!(pruned.len(), 1);
    }

    #[test]
    fn test_prune_keeps_old_pinned() {
        let sessions = vec![make_session("old-pinned", 200, true)];
        let pruned = prune_sessions(sessions);
        assert_eq!(pruned.len(), 1);
    }

    #[test]
    fn test_prune_keeps_recent_pinned() {
        let sessions = vec![make_session("new-pinned", 5, true)];
        let pruned = prune_sessions(sessions);
        assert_eq!(pruned.len(), 1);
    }

    #[test]
    fn test_read_sessions_returns_empty_when_no_file() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("sessions.json");
        let sessions = read_sessions(&path);
        assert!(sessions.is_empty());
    }

    #[test]
    fn test_prune_keeps_session_exactly_at_boundary() {
        // A session exactly 90 days old should be kept (not pruned).
        // Add 1 second of padding so the session timestamp lands at the
        // boundary even accounting for the sub-second gap between this call
        // and the Utc::now() inside prune_sessions.
        let ts = (chrono::Utc::now() - chrono::Duration::days(90) + chrono::Duration::seconds(1))
            .to_rfc3339();
        let session = Session {
            id: "boundary".to_string(),
            created_at: ts.clone(),
            last_active_at: ts,
            last_mode: "view".to_string(),
            pinned: false,
            messages_all: vec![],
            messages_compacted: vec![],
        };
        let pruned = prune_sessions(vec![session]);
        assert_eq!(pruned.len(), 1);
    }

    #[test]
    fn test_write_and_read_round_trip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("sessions.json");
        let sessions = vec![make_session("abc", 1, false)];
        write_sessions(&path, &sessions).unwrap();
        let back = read_sessions(&path);
        assert_eq!(back.len(), 1);
        assert_eq!(back[0].id, "abc");
    }
}
