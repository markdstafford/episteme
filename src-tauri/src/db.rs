use rusqlite::{Connection, Result as SqlResult};
use std::path::Path;

pub struct DbState(pub std::sync::Mutex<Option<Connection>>);

pub fn open_and_init(db_path: &Path) -> SqlResult<Connection> {
    let conn = Connection::open(db_path)?;
    init_schema(&conn)?;
    Ok(conn)
}

fn init_schema(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys = ON;")?;
    conn.execute_batch(SCHEMA)?;
    Ok(())
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS threads (
  id           TEXT    PRIMARY KEY,
  doc_id       TEXT    NOT NULL,
  quoted_text  TEXT    NOT NULL,
  anchor_from  INTEGER NOT NULL,
  anchor_to    INTEGER NOT NULL,
  anchor_stale BOOLEAN NOT NULL DEFAULT FALSE,
  status       TEXT    NOT NULL DEFAULT 'open',
  blocking     BOOLEAN NOT NULL DEFAULT FALSE,
  pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT    PRIMARY KEY,
  thread_id  TEXT    NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  body       TEXT    NOT NULL,
  author     TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS thread_events (
  id         TEXT    PRIMARY KEY,
  thread_id  TEXT    NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  event      TEXT    NOT NULL,
  changed_by TEXT    NOT NULL,
  changed_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS queued_comments (
  id               TEXT    PRIMARY KEY,
  thread_id        TEXT,
  doc_id           TEXT,
  quoted_text      TEXT,
  anchor_from      INTEGER,
  anchor_to        INTEGER,
  body_original    TEXT    NOT NULL,
  body_enhanced    TEXT,
  use_body_enhanced BOOLEAN NOT NULL DEFAULT TRUE,
  blocking         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TEXT    NOT NULL,
  expires_at       TEXT    NOT NULL,
  CHECK (
    (thread_id IS NOT NULL AND doc_id IS NULL
      AND quoted_text IS NULL AND anchor_from IS NULL AND anchor_to IS NULL)
    OR
    (thread_id IS NULL AND doc_id IS NOT NULL
      AND quoted_text IS NOT NULL AND anchor_from IS NOT NULL AND anchor_to IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_threads_doc_id  ON threads(doc_id);
CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_events_thread   ON thread_events(thread_id);
CREATE INDEX IF NOT EXISTS idx_queued_expires  ON queued_comments(expires_at);
";

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_schema_creates_all_tables() {
        let dir = tempdir().unwrap();
        let conn = open_and_init(&dir.path().join("test.db")).unwrap();

        let tables: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                .unwrap();
            stmt.query_map([], |r| r.get(0))
                .unwrap()
                .map(|r| r.unwrap())
                .collect()
        };
        assert!(tables.contains(&"threads".to_string()));
        assert!(tables.contains(&"comments".to_string()));
        assert!(tables.contains(&"thread_events".to_string()));
        assert!(tables.contains(&"queued_comments".to_string()));
    }

    #[test]
    fn test_schema_idempotent() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.db");
        open_and_init(&path).unwrap();
        open_and_init(&path).unwrap();
    }

    #[test]
    fn test_wal_mode_enabled() {
        let dir = tempdir().unwrap();
        let conn = open_and_init(&dir.path().join("test.db")).unwrap();
        let mode: String = conn
            .query_row("PRAGMA journal_mode", [], |r| r.get(0))
            .unwrap();
        assert_eq!(mode, "wal");
    }

    #[test]
    fn test_queued_comments_check_constraint() {
        let dir = tempdir().unwrap();
        let conn = open_and_init(&dir.path().join("test.db")).unwrap();
        let result = conn.execute(
            "INSERT INTO queued_comments
             (id, thread_id, doc_id, quoted_text, anchor_from, anchor_to,
              body_original, use_body_enhanced, blocking, created_at, expires_at)
             VALUES ('q1','t1','d1','text',0,5,'body',TRUE,FALSE,'2026-01-01','2026-01-01')",
            [],
        );
        assert!(result.is_err(), "CHECK constraint should reject both ids set");
    }
}
