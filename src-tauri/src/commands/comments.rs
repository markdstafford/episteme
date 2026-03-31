use crate::comments_types::{Comment, CommitResult, QueuedComment, Thread, ThreadEvent};
use crate::db::DbState;
use rusqlite::{params, Connection};
use tauri::Manager;

// ── Helpers ──────────────────────────────────────────────────────────────────

fn with_db<T, F>(app: &tauri::AppHandle, f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let state = app.state::<DbState>();
    let guard = state.0.lock().map_err(|e| format!("DB lock error: {e}"))?;
    let conn = guard
        .as_ref()
        .ok_or_else(|| "Database not initialized. Open a workspace first.".to_string())?;
    f(conn)
}

fn current_user_from_app(app: &tauri::AppHandle) -> String {
    crate::commands::preferences::load_preferences_sync(app)
        .github_login
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "unknown".to_string())
}

// ── init_workspace_db ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn init_workspace_db(
    app: tauri::AppHandle,
    workspace_path: String,
) -> Result<(), String> {
    let episteme_dir = std::path::Path::new(&workspace_path).join(".episteme");
    std::fs::create_dir_all(&episteme_dir)
        .map_err(|e| format!("Failed to create .episteme dir: {e}"))?;

    let db_path = episteme_dir.join("content.db");
    let conn = crate::db::open_and_init(&db_path)
        .map_err(|e| format!("Failed to init DB: {e}"))?;

    let state = app.state::<DbState>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {e}"))?;
    *guard = Some(conn);

    log::info!("DB initialized at {}", db_path.display());
    Ok(())
}

// ── get_doc_id_for_file / ensure_doc_id_for_file ─────────────────────────────

#[tauri::command]
pub async fn get_doc_id_for_file(file_path: String) -> Result<Option<String>, String> {
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {e}"))?;
    Ok(crate::frontmatter::get_doc_id(&content))
}

/// Returns the existing doc_id or writes a new UUID v4 to the file and returns it.
#[tauri::command]
pub async fn ensure_doc_id_for_file(file_path: String) -> Result<String, String> {
    crate::frontmatter::ensure_doc_id(&file_path)
}

/// Walk all markdown files in the workspace and ensure each has a doc_id.
/// Called once on workspace open so every document always has an ID.
#[tauri::command]
pub async fn ensure_all_doc_ids(workspace_path: String) -> Result<(), String> {
    fn walk(dir: &std::path::Path) -> Vec<std::path::PathBuf> {
        let mut files = Vec::new();
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Skip hidden dirs and .episteme
                    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if !name.starts_with('.') {
                        files.extend(walk(&path));
                    }
                } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    files.push(path);
                }
            }
        }
        files
    }

    let root = std::path::Path::new(&workspace_path);
    let md_files = walk(root);
    let mut assigned = 0usize;

    for path in &md_files {
        match crate::frontmatter::ensure_doc_id(path.to_str().unwrap_or("")) {
            Ok(_) => assigned += 1,
            Err(e) => log::warn!("ensure_all_doc_ids: skipping {:?}: {}", path, e),
        }
    }

    log::info!(
        "ensure_all_doc_ids: processed {} markdown files in {}",
        assigned,
        workspace_path
    );
    Ok(())
}

// ── load_threads ──────────────────────────────────────────────────────────────

pub fn load_threads_from_conn(
    conn: &Connection,
    doc_id: &str,
    doc_content: &str,
) -> Result<Vec<Thread>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, doc_id, quoted_text, anchor_from, anchor_to, anchor_stale,
                    status, blocking, pinned, created_at
             FROM threads WHERE doc_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut threads: Vec<Thread> = stmt
        .query_map(params![doc_id], |row| {
            Ok(Thread {
                id: row.get(0)?,
                doc_id: row.get(1)?,
                quoted_text: row.get(2)?,
                anchor_from: row.get(3)?,
                anchor_to: row.get(4)?,
                anchor_stale: row.get(5)?,
                status: row.get(6)?,
                blocking: row.get(7)?,
                pinned: row.get(8)?,
                created_at: row.get(9)?,
                comments: vec![],
                events: vec![],
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for thread in &mut threads {
        let mut cs = conn
            .prepare(
                "SELECT id, thread_id, body, author, created_at
                 FROM comments WHERE thread_id = ?1 ORDER BY created_at ASC",
            )
            .map_err(|e| e.to_string())?;
        thread.comments = cs
            .query_map(params![thread.id], |row| {
                Ok(Comment {
                    id: row.get(0)?,
                    thread_id: row.get(1)?,
                    body: row.get(2)?,
                    author: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        let mut es = conn
            .prepare(
                "SELECT id, thread_id, event, changed_by, changed_at
                 FROM thread_events WHERE thread_id = ?1 ORDER BY changed_at ASC",
            )
            .map_err(|e| e.to_string())?;
        thread.events = es
            .query_map(params![thread.id], |row| {
                Ok(ThreadEvent {
                    id: row.get(0)?,
                    thread_id: row.get(1)?,
                    event: row.get(2)?,
                    changed_by: row.get(3)?,
                    changed_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        reconcile_anchor(conn, thread, doc_content)?;
    }

    Ok(threads)
}

fn reconcile_anchor(
    conn: &Connection,
    thread: &mut Thread,
    doc_content: &str,
) -> Result<(), String> {
    if doc_content.is_empty() {
        return Ok(());
    }
    let from = thread.anchor_from as usize;
    let to = thread.anchor_to as usize;
    let chars: Vec<char> = doc_content.chars().collect();

    // Guard against invalid offset combinations
    if from > to || from >= chars.len() {
        if let Some(byte_offset) = doc_content.find(thread.quoted_text.as_str()) {
            let new_from = doc_content[..byte_offset].chars().count();
            let new_to = new_from + thread.quoted_text.chars().count();
            thread.anchor_from = new_from as i64;
            thread.anchor_to = new_to as i64;
            thread.anchor_stale = false;
            conn.execute(
                "UPDATE threads SET anchor_from=?1, anchor_to=?2, anchor_stale=FALSE WHERE id=?3",
                params![new_from as i64, new_to as i64, thread.id],
            )
            .map_err(|e| e.to_string())?;
        } else {
            thread.anchor_stale = true;
            conn.execute(
                "UPDATE threads SET anchor_stale=TRUE WHERE id=?1",
                params![thread.id],
            )
            .map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    if to <= chars.len() {
        let slice: String = chars[from..to].iter().collect();
        if slice == thread.quoted_text {
            return Ok(());
        }
    }

    // NOTE: str::find() returns the first occurrence of quoted_text.
    // For documents where the same phrase appears multiple times, this may
    // move the anchor to the wrong passage. A proper fix requires storing
    // occurrence context (e.g. which occurrence number) alongside the anchor —
    // tracked in issue #121.
    if let Some(byte_offset) = doc_content.find(thread.quoted_text.as_str()) {
        // Convert byte offset to character offset for consistency
        let new_from = doc_content[..byte_offset].chars().count();
        let new_to = new_from + thread.quoted_text.chars().count();
        thread.anchor_from = new_from as i64;
        thread.anchor_to = new_to as i64;
        thread.anchor_stale = false;
        conn.execute(
            "UPDATE threads SET anchor_from=?1, anchor_to=?2, anchor_stale=FALSE WHERE id=?3",
            params![new_from as i64, new_to as i64, thread.id],
        )
        .map_err(|e| e.to_string())?;
        log::debug!("Anchor reconciled for thread {}", thread.id);
    } else {
        thread.anchor_stale = true;
        conn.execute(
            "UPDATE threads SET anchor_stale=TRUE WHERE id=?1",
            params![thread.id],
        )
        .map_err(|e| e.to_string())?;
        log::warn!(
            "Stale anchor for thread {} (quoted_text not found)",
            thread.id
        );
    }

    Ok(())
}

#[tauri::command]
pub async fn load_threads(
    app: tauri::AppHandle,
    doc_id: String,
    doc_content: String,
) -> Result<Vec<Thread>, String> {
    with_db(&app, |conn| load_threads_from_conn(conn, &doc_id, &doc_content))
}

// ── commit_comment ────────────────────────────────────────────────────────────

pub fn commit_comment_on_conn(
    conn: &Connection,
    queued_id: &str,
    current_user: &str,
) -> Result<CommitResult, String> {
    use chrono::Utc;
    use uuid::Uuid;

    let q: QueuedComment = conn
        .query_row(
            "SELECT id, thread_id, doc_id, quoted_text, anchor_from, anchor_to,
                    body_original, body_enhanced, use_body_enhanced, blocking,
                    created_at, expires_at
             FROM queued_comments WHERE id=?1",
            params![queued_id],
            |row| {
                Ok(QueuedComment {
                    id: row.get(0)?,
                    thread_id: row.get(1)?,
                    doc_id: row.get(2)?,
                    quoted_text: row.get(3)?,
                    anchor_from: row.get(4)?,
                    anchor_to: row.get(5)?,
                    body_original: row.get(6)?,
                    body_enhanced: row.get(7)?,
                    use_body_enhanced: row.get(8)?,
                    blocking: row.get(9)?,
                    created_at: row.get(10)?,
                    expires_at: row.get(11)?,
                })
            },
        )
        .map_err(|e| format!("Queued comment not found: {e}"))?;

    let body = if q.use_body_enhanced {
        q.body_enhanced
            .as_deref()
            .unwrap_or(&q.body_original)
            .to_string()
    } else {
        q.body_original.clone()
    };

    let now = Utc::now().to_rfc3339();

    if let Some(thread_id) = &q.thread_id {
        let comment_id = Uuid::new_v4().to_string();

        conn.execute_batch("BEGIN;").map_err(|e| e.to_string())?;
        let tx_result: Result<(), String> = (|| {
            conn.execute(
                "INSERT INTO comments (id, thread_id, body, author, created_at)
                 VALUES (?1,?2,?3,?4,?5)",
                params![comment_id, thread_id, body, current_user, now],
            )
            .map_err(|e| e.to_string())?;

            // Apply blocking change if different from current thread state
            let current_blocking: bool = conn.query_row(
                "SELECT blocking FROM threads WHERE id=?1",
                params![thread_id],
                |r| r.get(0),
            ).map_err(|e| e.to_string())?;

            if q.blocking != current_blocking {
                let event_type = if q.blocking { "blocking" } else { "non-blocking" };
                conn.execute(
                    "UPDATE threads SET blocking=?1 WHERE id=?2",
                    params![q.blocking, thread_id],
                ).map_err(|e| e.to_string())?;
                let ev_id = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO thread_events (id, thread_id, event, changed_by, changed_at)
                     VALUES (?1,?2,?3,?4,?5)",
                    params![ev_id, thread_id, event_type, current_user, now],
                ).map_err(|e| e.to_string())?;
            }

            conn.execute(
                "DELETE FROM queued_comments WHERE id=?1",
                params![queued_id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })();
        if let Err(e) = tx_result {
            conn.execute_batch("ROLLBACK;").ok();
            return Err(e);
        }
        conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

        return Ok(CommitResult::Comment(Comment {
            id: comment_id,
            thread_id: thread_id.clone(),
            body,
            author: current_user.to_string(),
            created_at: now,
        }));
    }

    // New thread path
    let doc_id = q.doc_id.as_ref().ok_or("Missing doc_id for new thread")?;
    let thread_id = Uuid::new_v4().to_string();
    let comment_id = Uuid::new_v4().to_string();

    conn.execute_batch("BEGIN;")
        .map_err(|e| e.to_string())?;
    let tx_result: Result<(), String> = (|| {
        conn.execute(
            "INSERT INTO threads
             (id, doc_id, quoted_text, anchor_from, anchor_to, anchor_stale,
              status, blocking, pinned, created_at)
             VALUES (?1,?2,?3,?4,?5,FALSE,'open',?6,FALSE,?7)",
            params![
                thread_id,
                doc_id,
                q.quoted_text.as_deref().unwrap_or(""),
                q.anchor_from.unwrap_or(0),
                q.anchor_to.unwrap_or(0),
                q.blocking,
                now
            ],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO comments (id, thread_id, body, author, created_at)
             VALUES (?1,?2,?3,?4,?5)",
            params![comment_id, thread_id, body, current_user, now],
        )
        .map_err(|e| e.to_string())?;

        let ev_open_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO thread_events (id, thread_id, event, changed_by, changed_at)
             VALUES (?1,?2,'open',?3,?4)",
            params![ev_open_id, thread_id, current_user, now],
        )
        .map_err(|e| e.to_string())?;

        if q.blocking {
            let ev_blk_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO thread_events (id, thread_id, event, changed_by, changed_at)
                 VALUES (?1,?2,'blocking',?3,?4)",
                params![ev_blk_id, thread_id, current_user, now],
            )
            .map_err(|e| e.to_string())?;
        }

        conn.execute(
            "DELETE FROM queued_comments WHERE id=?1",
            params![queued_id],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    })();

    if let Err(e) = tx_result {
        conn.execute_batch("ROLLBACK;").ok();
        return Err(e);
    }
    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    let thread = load_threads_from_conn(conn, doc_id, "")?
        .into_iter()
        .find(|t| t.id == thread_id)
        .ok_or("Thread not found after commit")?;

    Ok(CommitResult::Thread(thread))
}

#[tauri::command]
pub async fn commit_comment(
    app: tauri::AppHandle,
    id: String,
    doc_file_path: Option<String>,
) -> Result<CommitResult, String> {
    let _ = doc_file_path; // doc_id is guaranteed present — ensure_all_doc_ids runs on workspace open
    let current_user = current_user_from_app(&app);
    with_db(&app, |conn| commit_comment_on_conn(conn, &id, &current_user))
}

// ── update_thread_status ──────────────────────────────────────────────────────

pub fn update_thread_status_on_conn(
    conn: &Connection,
    thread_id: &str,
    status: &str,
    current_user: &str,
) -> Result<ThreadEvent, String> {
    // Validate status — only "open" and "resolved" are valid
    if status != "open" && status != "resolved" {
        return Err(format!(
            "Invalid thread status '{}': expected 'open' or 'resolved'",
            status
        ));
    }
    use chrono::Utc;
    use uuid::Uuid;
    let event_label = if status == "open" { "re-opened" } else { status };
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE threads SET status=?1 WHERE id=?2",
        params![status, thread_id],
    )
    .map_err(|e| e.to_string())?;
    let ev_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO thread_events (id, thread_id, event, changed_by, changed_at)
         VALUES (?1,?2,?3,?4,?5)",
        params![ev_id, thread_id, event_label, current_user, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(ThreadEvent {
        id: ev_id,
        thread_id: thread_id.to_string(),
        event: event_label.to_string(),
        changed_by: current_user.to_string(),
        changed_at: now,
    })
}

#[tauri::command]
pub async fn update_thread_status(
    app: tauri::AppHandle,
    thread_id: String,
    status: String,
) -> Result<ThreadEvent, String> {
    let user = current_user_from_app(&app);
    with_db(&app, |conn| update_thread_status_on_conn(conn, &thread_id, &status, &user))
}

// ── toggle_blocking ───────────────────────────────────────────────────────────

pub fn toggle_blocking_on_conn(
    conn: &Connection,
    thread_id: &str,
    current_user: &str,
) -> Result<ThreadEvent, String> {
    use chrono::Utc;
    use uuid::Uuid;
    let (status, blocking): (String, bool) = conn
        .query_row(
            "SELECT status, blocking FROM threads WHERE id=?1",
            params![thread_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| format!("Thread not found: {e}"))?;
    if status == "resolved" {
        return Err("Cannot toggle blocking on a resolved thread".to_string());
    }
    let new_blocking = !blocking;
    let event_label = if new_blocking { "blocking" } else { "non-blocking" };
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE threads SET blocking=?1 WHERE id=?2",
        params![new_blocking, thread_id],
    )
    .map_err(|e| e.to_string())?;
    let ev_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO thread_events (id, thread_id, event, changed_by, changed_at)
         VALUES (?1,?2,?3,?4,?5)",
        params![ev_id, thread_id, event_label, current_user, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(ThreadEvent {
        id: ev_id,
        thread_id: thread_id.to_string(),
        event: event_label.to_string(),
        changed_by: current_user.to_string(),
        changed_at: now,
    })
}

#[tauri::command]
pub async fn toggle_blocking(
    app: tauri::AppHandle,
    thread_id: String,
) -> Result<ThreadEvent, String> {
    let user = current_user_from_app(&app);
    with_db(&app, |conn| toggle_blocking_on_conn(conn, &thread_id, &user))
}

// ── toggle_pinned ─────────────────────────────────────────────────────────────

pub fn toggle_pinned_on_conn(conn: &Connection, thread_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE threads SET pinned = NOT pinned WHERE id=?1",
        params![thread_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_pinned(app: tauri::AppHandle, thread_id: String) -> Result<(), String> {
    with_db(&app, |conn| toggle_pinned_on_conn(conn, &thread_id))
}

// ── queue_comment ─────────────────────────────────────────────────────────────

pub fn queue_comment_on_conn(conn: &Connection, q: QueuedComment) -> Result<(), String> {
    conn.execute(
        "INSERT INTO queued_comments
         (id, thread_id, doc_id, quoted_text, anchor_from, anchor_to,
          body_original, body_enhanced, use_body_enhanced, blocking, created_at, expires_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
         ON CONFLICT(id) DO UPDATE SET
           body_original=excluded.body_original,
           body_enhanced=excluded.body_enhanced,
           use_body_enhanced=excluded.use_body_enhanced,
           blocking=excluded.blocking,
           expires_at=excluded.expires_at",
        params![
            q.id,
            q.thread_id,
            q.doc_id,
            q.quoted_text,
            q.anchor_from,
            q.anchor_to,
            q.body_original,
            q.body_enhanced,
            q.use_body_enhanced,
            q.blocking,
            q.created_at,
            q.expires_at
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn queue_comment(
    app: tauri::AppHandle,
    queued: QueuedComment,
) -> Result<(), String> {
    with_db(&app, |conn| queue_comment_on_conn(conn, queued))
}

// ── toggle_queued_body ────────────────────────────────────────────────────────

pub fn toggle_queued_body_on_conn(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE queued_comments SET use_body_enhanced = NOT use_body_enhanced
         WHERE id=?1 AND body_enhanced IS NOT NULL",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_queued_body(app: tauri::AppHandle, id: String) -> Result<(), String> {
    with_db(&app, |conn| toggle_queued_body_on_conn(conn, &id))
}

// ── cancel_queued_comment ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn cancel_queued_comment(app: tauri::AppHandle, id: String) -> Result<(), String> {
    with_db(&app, |conn| {
        conn.execute("DELETE FROM queued_comments WHERE id=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

// ── load_queued_comments ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn load_queued_comments(
    app: tauri::AppHandle,
) -> Result<Vec<QueuedComment>, String> {
    with_db(&app, |conn| {
        let mut stmt = conn
            .prepare(
                "SELECT id, thread_id, doc_id, quoted_text, anchor_from, anchor_to,
                        body_original, body_enhanced, use_body_enhanced, blocking,
                        created_at, expires_at
                 FROM queued_comments",
            )
            .map_err(|e| e.to_string())?;
        let rows: Vec<rusqlite::Result<QueuedComment>> = stmt
            .query_map([], |row| {
                Ok(QueuedComment {
                    id: row.get(0)?,
                    thread_id: row.get(1)?,
                    doc_id: row.get(2)?,
                    quoted_text: row.get(3)?,
                    anchor_from: row.get(4)?,
                    anchor_to: row.get(5)?,
                    body_original: row.get(6)?,
                    body_enhanced: row.get(7)?,
                    use_body_enhanced: row.get(8)?,
                    blocking: row.get(9)?,
                    created_at: row.get(10)?,
                    expires_at: row.get(11)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect();
        rows.into_iter()
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())
    })
}

// ── update_thread_anchors ─────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct AnchorUpdate {
    pub thread_id: String,
    pub anchor_from: i64,
    pub anchor_to: i64,
}

pub fn update_thread_anchors_on_conn(
    conn: &Connection,
    updates: Vec<(String, i64, i64)>,
) -> Result<(), String> {
    if updates.is_empty() {
        return Ok(());
    }
    conn.execute_batch("BEGIN;").map_err(|e| e.to_string())?;
    for (tid, from, to) in &updates {
        conn.execute(
            "UPDATE threads SET anchor_from=?1, anchor_to=?2 WHERE id=?3",
            params![from, to, tid],
        )
        .map_err(|e| {
            let _ = conn.execute_batch("ROLLBACK;");
            e.to_string()
        })?;
    }
    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_thread_anchors(
    app: tauri::AppHandle,
    updates: Vec<AnchorUpdate>,
) -> Result<(), String> {
    let mapped: Vec<(String, i64, i64)> = updates
        .into_iter()
        .map(|u| (u.thread_id, u.anchor_from, u.anchor_to))
        .collect();
    with_db(&app, |conn| update_thread_anchors_on_conn(conn, mapped))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_and_init;
    use tempfile::tempdir;

    fn setup_db() -> (tempfile::TempDir, Connection) {
        let dir = tempdir().unwrap();
        let conn = open_and_init(&dir.path().join("test.db")).unwrap();
        (dir, conn)
    }

    // ── load_threads ──────────────────────────────────────────────────────────

    #[test]
    fn load_threads_returns_empty_for_unknown_doc() {
        let (_dir, conn) = setup_db();
        let threads = load_threads_from_conn(&conn, "no-such-doc", "").unwrap();
        assert!(threads.is_empty());
    }

    #[test]
    fn load_threads_returns_threads_with_nested_data() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','doc1','quoted',10,20,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO comments VALUES ('c1','t1','Hello','alice','2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO thread_events VALUES ('e1','t1','open','alice','2026-01-01')",
            [],
        ).unwrap();

        let threads = load_threads_from_conn(&conn, "doc1", "").unwrap();
        assert_eq!(threads.len(), 1);
        assert_eq!(threads[0].comments.len(), 1);
        assert_eq!(threads[0].events.len(), 1);
        assert_eq!(threads[0].comments[0].body, "Hello");
    }

    // ── commit_comment ────────────────────────────────────────────────────────

    #[test]
    fn commit_comment_creates_new_thread() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO queued_comments VALUES ('q1',NULL,'doc1','quoted',5,15,'raw','enhanced',TRUE,FALSE,'2026-01-01','2026-01-01')",
            [],
        ).unwrap();

        let result = commit_comment_on_conn(&conn, "q1", "alice").unwrap();
        match result {
            CommitResult::Thread(t) => {
                assert_eq!(t.doc_id, "doc1");
                assert!(!t.blocking);
                assert_eq!(t.comments.len(), 1);
                assert_eq!(t.comments[0].body, "enhanced");
                assert_eq!(t.events.len(), 1);
                assert_eq!(t.events[0].event, "open");
            }
            _ => panic!("Expected Thread"),
        }
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM queued_comments WHERE id='q1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn commit_comment_creates_blocking_thread_with_two_events() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO queued_comments VALUES ('q2',NULL,'doc1','text',0,4,'raw',NULL,FALSE,TRUE,'2026-01-01','2026-01-01')",
            [],
        ).unwrap();
        let result = commit_comment_on_conn(&conn, "q2", "bob").unwrap();
        if let CommitResult::Thread(t) = result {
            assert!(t.blocking);
            let event_types: Vec<String> = t.events.iter().map(|e| e.event.clone()).collect();
            assert_eq!(event_types, vec!["open", "blocking"]);
        } else {
            panic!("Expected Thread");
        }
    }

    #[test]
    fn commit_comment_reply_appends_comment() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','doc1','q',0,1,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO queued_comments VALUES ('q3','t1',NULL,NULL,NULL,NULL,'reply',NULL,FALSE,FALSE,'2026-01-01','2026-01-01')",
            [],
        ).unwrap();
        let result = commit_comment_on_conn(&conn, "q3", "carol").unwrap();
        if let CommitResult::Comment(c) = result {
            assert_eq!(c.thread_id, "t1");
            assert_eq!(c.body, "reply");
        } else {
            panic!("Expected Comment");
        }
        let status: String = conn
            .query_row(
                "SELECT status FROM threads WHERE id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(status, "open");
    }

    // ── update_thread_status / toggle_blocking / toggle_pinned ───────────────

    #[test]
    fn update_thread_status_to_resolved_preserves_blocking() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'open',TRUE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        let ev = update_thread_status_on_conn(&conn, "t1", "resolved", "alice").unwrap();
        assert_eq!(ev.event, "resolved");
        let (status, blocking): (String, bool) = conn
            .query_row(
                "SELECT status, blocking FROM threads WHERE id='t1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(status, "resolved");
        assert!(blocking);
    }

    #[test]
    fn update_thread_status_to_open_emits_reopened() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'resolved',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        let ev = update_thread_status_on_conn(&conn, "t1", "open", "bob").unwrap();
        assert_eq!(ev.event, "re-opened");
    }

    #[test]
    fn toggle_blocking_flips_and_emits_event() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        let ev = toggle_blocking_on_conn(&conn, "t1", "alice").unwrap();
        assert_eq!(ev.event, "blocking");
        let ev2 = toggle_blocking_on_conn(&conn, "t1", "alice").unwrap();
        assert_eq!(ev2.event, "non-blocking");
    }

    #[test]
    fn toggle_blocking_rejected_when_resolved() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'resolved',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        assert!(toggle_blocking_on_conn(&conn, "t1", "alice").is_err());
    }

    #[test]
    fn toggle_pinned_flips() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        toggle_pinned_on_conn(&conn, "t1").unwrap();
        let pinned: bool = conn
            .query_row(
                "SELECT pinned FROM threads WHERE id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(pinned);
        toggle_pinned_on_conn(&conn, "t1").unwrap();
        let pinned2: bool = conn
            .query_row(
                "SELECT pinned FROM threads WHERE id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(!pinned2);
    }

    // ── queue_comment / toggle_queued_body ────────────────────────────────────

    #[test]
    fn queue_comment_inserts_and_upserts() {
        let (_dir, conn) = setup_db();
        queue_comment_on_conn(
            &conn,
            QueuedComment {
                id: "q1".to_string(),
                thread_id: None,
                doc_id: Some("d1".to_string()),
                quoted_text: Some("text".to_string()),
                anchor_from: Some(0),
                anchor_to: Some(4),
                body_original: "raw".to_string(),
                body_enhanced: None,
                use_body_enhanced: true,
                blocking: false,
                created_at: "2026-01-01".to_string(),
                expires_at: "2026-01-02".to_string(),
            },
        )
        .unwrap();
        queue_comment_on_conn(
            &conn,
            QueuedComment {
                id: "q1".to_string(),
                thread_id: None,
                doc_id: Some("d1".to_string()),
                quoted_text: Some("text".to_string()),
                anchor_from: Some(0),
                anchor_to: Some(4),
                body_original: "raw".to_string(),
                body_enhanced: Some("enhanced".to_string()),
                use_body_enhanced: true,
                blocking: false,
                created_at: "2026-01-01".to_string(),
                expires_at: "2026-01-02".to_string(),
            },
        )
        .unwrap();
        let enhanced: Option<String> = conn
            .query_row(
                "SELECT body_enhanced FROM queued_comments WHERE id='q1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(enhanced, Some("enhanced".to_string()));
    }

    #[test]
    fn toggle_queued_body_flips_and_noop_when_null() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO queued_comments VALUES ('q1',NULL,'d','t',0,4,'raw','enh',TRUE,FALSE,'2026-01-01','2026-01-02')",
            [],
        ).unwrap();
        toggle_queued_body_on_conn(&conn, "q1").unwrap();
        let v: bool = conn
            .query_row(
                "SELECT use_body_enhanced FROM queued_comments WHERE id='q1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(!v);

        conn.execute(
            "INSERT INTO queued_comments VALUES ('q2',NULL,'d','t',0,4,'raw',NULL,TRUE,FALSE,'2026-01-01','2026-01-02')",
            [],
        ).unwrap();
        toggle_queued_body_on_conn(&conn, "q2").unwrap();
        let v2: bool = conn
            .query_row(
                "SELECT use_body_enhanced FROM queued_comments WHERE id='q2'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(v2); // unchanged
    }

    // ── update_thread_anchors ─────────────────────────────────────────────────

    #[test]
    fn update_thread_anchors_batch_updates() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,5,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO threads VALUES ('t2','d','q',10,20,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        update_thread_anchors_on_conn(
            &conn,
            vec![("t1".to_string(), 1, 6), ("t2".to_string(), 11, 21)],
        )
        .unwrap();
        let (f, t): (i64, i64) = conn
            .query_row(
                "SELECT anchor_from, anchor_to FROM threads WHERE id='t1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!((f, t), (1, 6));
    }

    // ── integration tests ─────────────────────────────────────────────────────

    #[test]
    fn toggle_blocking_on_resolved_thread_returns_error() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'resolved',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        assert!(toggle_blocking_on_conn(&conn, "t1", "alice").is_err());
        let blocking: bool = conn
            .query_row(
                "SELECT blocking FROM threads WHERE id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(!blocking);
    }

    #[test]
    fn update_thread_status_resolved_preserves_blocking_integration() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'open',TRUE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        update_thread_status_on_conn(&conn, "t1", "resolved", "alice").unwrap();
        let (status, blocking): (String, bool) = conn
            .query_row(
                "SELECT status, blocking FROM threads WHERE id='t1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(status, "resolved");
        assert!(blocking);
    }

    #[test]
    fn on_delete_cascade_removes_comments_and_events() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d','q',0,1,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO comments VALUES ('c1','t1','body','alice','2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO thread_events VALUES ('e1','t1','open','alice','2026-01-01')",
            [],
        ).unwrap();
        conn.execute("DELETE FROM threads WHERE id='t1'", []).unwrap();
        let c_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM comments WHERE thread_id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let e_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM thread_events WHERE thread_id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(c_count, 0);
        assert_eq!(e_count, 0);
    }

    #[test]
    fn anchor_reconciliation_updates_positions() {
        let (_dir, conn) = setup_db();
        let quoted = "Hello world";
        conn.execute(
            "INSERT INTO threads VALUES ('t1','d',?,0,11,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            params![quoted],
        ).unwrap();
        let new_content = format!("Prepended. {quoted}");
        let threads = load_threads_from_conn(&conn, "d", &new_content).unwrap();
        assert!(!threads[0].anchor_stale);
        assert_eq!(threads[0].anchor_from as usize, "Prepended. ".len());
    }

    #[test]
    fn commit_reply_is_atomic() {
        let (_dir, conn) = setup_db();
        // Create a thread first
        conn.execute(
            "INSERT INTO threads (id, doc_id, quoted_text, anchor_from, anchor_to, anchor_stale, status, blocking, pinned, created_at)
             VALUES ('t1','doc1','quote',0,5,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        // Stage a reply
        conn.execute(
            "INSERT INTO queued_comments (id, thread_id, doc_id, quoted_text, anchor_from, anchor_to, body_original, body_enhanced, use_body_enhanced, blocking, created_at, expires_at)
             VALUES ('q1','t1',NULL,NULL,NULL,NULL,'reply body',NULL,FALSE,FALSE,'2026-01-01','2026-01-01')",
            [],
        ).unwrap();
        commit_comment_on_conn(&conn, "q1", "user1").unwrap();
        let queued_count: i64 = conn.query_row("SELECT COUNT(*) FROM queued_comments", [], |r| r.get(0)).unwrap();
        assert_eq!(queued_count, 0);
        let comment_count: i64 = conn.query_row("SELECT COUNT(*) FROM comments WHERE thread_id='t1'", [], |r| r.get(0)).unwrap();
        assert_eq!(comment_count, 1);
    }

    #[test]
    fn reconcile_anchor_handles_invalid_from_offset() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads (id, doc_id, quoted_text, anchor_from, anchor_to, anchor_stale, status, blocking, pinned, created_at)
             VALUES ('t1','doc1','hello',9999,10000,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        let threads = load_threads_from_conn(&conn, "doc1", "hello world").unwrap();
        assert_eq!(threads.len(), 1);
        // Should be reconciled or marked stale, not panic
        assert!(threads[0].anchor_stale || threads[0].anchor_from < 9999);
    }

    #[test]
    fn update_thread_status_rejects_invalid_status() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads (id, doc_id, quoted_text, anchor_from, anchor_to, anchor_stale, status, blocking, pinned, created_at)
             VALUES ('t1','doc1','quote',0,5,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        let result = update_thread_status_on_conn(&conn, "t1", "invalid_status", "user1");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid thread status"));
    }

    #[test]
    fn update_thread_status_accepts_valid_values() {
        let (_dir, conn) = setup_db();
        conn.execute(
            "INSERT INTO threads (id, doc_id, quoted_text, anchor_from, anchor_to, anchor_stale, status, blocking, pinned, created_at)
             VALUES ('t1','doc1','quote',0,5,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        assert!(update_thread_status_on_conn(&conn, "t1", "resolved", "user1").is_ok());
        assert!(update_thread_status_on_conn(&conn, "t1", "open", "user1").is_ok());
    }

    #[test]
    fn commit_reply_applies_blocking_change() {
        let (_dir, conn) = setup_db();
        // Create a non-blocking thread with a comment
        conn.execute(
            "INSERT INTO threads (id, doc_id, quoted_text, anchor_from, anchor_to, anchor_stale, status, blocking, pinned, created_at)
             VALUES ('t1','doc1','quote',0,5,FALSE,'open',FALSE,FALSE,'2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO comments (id, thread_id, body, author, created_at)
             VALUES ('c1','t1','original','alice','2026-01-01')",
            [],
        ).unwrap();
        // Stage a reply with blocking=true
        conn.execute(
            "INSERT INTO queued_comments (id, thread_id, doc_id, quoted_text, anchor_from, anchor_to, body_original, body_enhanced, use_body_enhanced, blocking, created_at, expires_at)
             VALUES ('q1','t1',NULL,NULL,NULL,NULL,'my reply',NULL,FALSE,TRUE,'2026-01-01','2026-01-01')",
            [],
        ).unwrap();
        commit_comment_on_conn(&conn, "q1", "bob").unwrap();
        // Thread should now be blocking
        let blocking: bool = conn.query_row(
            "SELECT blocking FROM threads WHERE id='t1'", [], |r| r.get(0)
        ).unwrap();
        assert!(blocking, "thread should be blocking after reply with blocking=true");
        // A blocking event should have been emitted
        let event_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM thread_events WHERE thread_id='t1' AND event='blocking'",
            [], |r| r.get(0)
        ).unwrap();
        assert_eq!(event_count, 1);
    }
}
