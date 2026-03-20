use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SessionScope {
    Document { path: String },
    Workspace,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Session {
    pub id: String,
    pub created_at: String,
    pub last_active_at: String,
    pub last_mode: String,
    pub name: String,
    pub scope: SessionScope,
    pub pinned: bool,
    pub messages_all: Vec<SessionMessage>,
    pub messages_compacted: Vec<CanonicalMessage>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionMessage {
    pub role: String,
    pub content: Vec<CanonicalBlock>,
    pub mode: Option<String>,
    pub model: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CanonicalMessage {
    pub role: String,
    pub content: Vec<CanonicalBlock>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CanonicalBlock {
    Text { text: String },
    Image { media_type: String, source: ImageSource },
    FileRef { path: String, name: String, media_type: String },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ImageSource {
    Base64 { data: String },
    Path { path: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_round_trip() {
        let session = Session {
            id: "test-id".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            last_active_at: "2026-01-01T00:00:00Z".to_string(),
            last_mode: "view".to_string(),
            name: "".to_string(),
            scope: SessionScope::Workspace,
            pinned: false,
            messages_all: vec![SessionMessage {
                role: "user".to_string(),
                content: vec![CanonicalBlock::Text { text: "hello".to_string() }],
                mode: Some("view".to_string()),
                model: None,
            }],
            messages_compacted: vec![CanonicalMessage {
                role: "user".to_string(),
                content: vec![CanonicalBlock::Text { text: "hello".to_string() }],
            }],
        };
        let json = serde_json::to_string(&session).unwrap();
        let back: Session = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "test-id");
        assert_eq!(back.name, "");
    }

    #[test]
    fn test_session_scope_workspace_serialization() {
        let scope = SessionScope::Workspace;
        let json = serde_json::to_string(&scope).unwrap();
        assert_eq!(json, r#"{"type":"workspace"}"#);
        let back: SessionScope = serde_json::from_str(&json).unwrap();
        assert!(matches!(back, SessionScope::Workspace));
    }

    #[test]
    fn test_session_scope_document_serialization() {
        let scope = SessionScope::Document { path: "/path/to/doc.md".to_string() };
        let json = serde_json::to_string(&scope).unwrap();
        assert!(json.contains(r#""type":"document""#));
        assert!(json.contains(r#""path":"/path/to/doc.md""#));
        let back: SessionScope = serde_json::from_str(&json).unwrap();
        assert!(matches!(back, SessionScope::Document { .. }));
    }

    #[test]
    fn test_session_with_document_scope_round_trip() {
        let session = Session {
            id: "doc-session".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            last_active_at: "2026-01-01T00:00:00Z".to_string(),
            last_mode: "edit".to_string(),
            name: "Help with this doc".to_string(),
            scope: SessionScope::Document { path: "/workspace/docs/spec.md".to_string() },
            pinned: false,
            messages_all: vec![],
            messages_compacted: vec![],
        };
        let json = serde_json::to_string(&session).unwrap();
        let back: Session = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "Help with this doc");
        assert!(matches!(back.scope, SessionScope::Document { .. }));
    }

    #[test]
    fn test_canonical_block_text_serialization() {
        let block = CanonicalBlock::Text { text: "hi".to_string() };
        let json = serde_json::to_string(&block).unwrap();
        assert!(json.contains("\"type\":\"text\""));
        assert!(json.contains("\"text\":\"hi\""));
    }

    #[test]
    fn test_canonical_block_file_ref_serialization() {
        let block = CanonicalBlock::FileRef {
            path: "docs/spec.md".to_string(),
            name: "spec.md".to_string(),
            media_type: "text/markdown".to_string(),
        };
        let json = serde_json::to_string(&block).unwrap();
        assert!(json.contains("\"type\":\"file_ref\""));
    }

    #[test]
    fn test_image_source_path_serialization() {
        let source = ImageSource::Path { path: "img.png".to_string() };
        let json = serde_json::to_string(&source).unwrap();
        assert!(json.contains("\"type\":\"path\""));
    }
}
