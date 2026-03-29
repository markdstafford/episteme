use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Thread {
    pub id: String,
    pub doc_id: String,
    pub quoted_text: String,
    pub anchor_from: i64,
    pub anchor_to: i64,
    pub anchor_stale: bool,
    pub status: String,
    pub blocking: bool,
    pub pinned: bool,
    pub created_at: String,
    pub comments: Vec<Comment>,
    pub events: Vec<ThreadEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: String,
    pub thread_id: String,
    pub body: String,
    pub author: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadEvent {
    pub id: String,
    pub thread_id: String,
    pub event: String,
    pub changed_by: String,
    pub changed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueuedComment {
    pub id: String,
    pub thread_id: Option<String>,
    pub doc_id: Option<String>,
    pub quoted_text: Option<String>,
    pub anchor_from: Option<i64>,
    pub anchor_to: Option<i64>,
    pub body_original: String,
    pub body_enhanced: Option<String>,
    pub use_body_enhanced: bool,
    pub blocking: bool,
    pub created_at: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CommitResult {
    Thread(Thread),
    Comment(Comment),
}
