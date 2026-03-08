use aws_config::{self, BehaviorVersion};
use aws_credential_types::provider::ProvideCredentials;
use aws_sdk_bedrockruntime::Client as BedrockClient;
use aws_sdk_bedrockruntime::types::{
    ContentBlock, ConversationRole, ConverseStreamOutput, Message, SystemContentBlock,
};
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tokio::process::Command;

#[derive(Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum StreamEvent {
    Token(String),
    Done(String),
    Error(String),
    DocumentUpdated(String), // absolute file path
}

fn validate_aws_profile(aws_profile: &str) -> Result<(), String> {
    if aws_profile.is_empty()
        || !aws_profile
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
    {
        return Err("Invalid AWS profile name. Only alphanumeric characters, hyphens, underscores, and dots are allowed.".to_string());
    }
    Ok(())
}

pub fn execute_write_file(
    workspace_path: &str,
    file_path: &str,
    content: &str,
) -> Result<String, String> {
    let file_path_obj = std::path::Path::new(file_path);

    if file_path_obj.is_absolute() {
        return Err("file_path must be a relative path".to_string());
    }

    for component in file_path_obj.components() {
        if component == std::path::Component::ParentDir {
            return Err("file_path must not contain '..' (path traversal not allowed)".to_string());
        }
    }

    let canonical_workspace = std::fs::canonicalize(workspace_path)
        .map_err(|e| format!("Invalid workspace path: {}", e))?;
    let full_path = canonical_workspace.join(file_path);

    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    std::fs::write(&full_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn ai_sso_login(aws_profile: String) -> Result<(), String> {
    validate_aws_profile(&aws_profile)?;

    let output = Command::new("aws")
        .arg("sso")
        .arg("login")
        .arg("--profile")
        .arg(&aws_profile)
        .output()
        .await
        .map_err(|e| format!("Failed to execute aws CLI: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("AWS SSO login failed: {}", stderr))
    }
}

#[tauri::command]
pub async fn ai_check_auth(aws_profile: String) -> Result<bool, String> {
    validate_aws_profile(&aws_profile)?;

    let config = aws_config::defaults(BehaviorVersion::latest())
        .profile_name(&aws_profile)
        .load()
        .await;

    let credentials_provider = config
        .credentials_provider()
        .ok_or_else(|| "No credentials provider configured".to_string())?;

    match credentials_provider.provide_credentials().await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn ai_chat(
    messages: Vec<ChatMessage>,
    active_file_path: Option<String>,
    workspace_path: String,
    aws_profile: String,
    on_event: Channel<StreamEvent>,
) -> Result<(), String> {
    // 1. Validate profile
    validate_aws_profile(&aws_profile)?;

    // 2. Build system prompt
    let system_prompt = crate::context::build_system_prompt(
        active_file_path.as_deref(),
        &[],
        &workspace_path,
    )?;

    // 3. Load AWS config using profile name
    let config = aws_config::defaults(BehaviorVersion::latest())
        .profile_name(&aws_profile)
        .load()
        .await;

    // 4. Create Bedrock client
    let client = BedrockClient::new(&config);

    // 5. Build messages
    let mut bedrock_messages = Vec::new();
    for msg in &messages {
        let role = match msg.role.as_str() {
            "user" => ConversationRole::User,
            "assistant" => ConversationRole::Assistant,
            _ => continue,
        };
        bedrock_messages.push(
            Message::builder()
                .role(role)
                .content(ContentBlock::Text(msg.content.clone()))
                .build()
                .map_err(|e| format!("Failed to build message: {}", e))?,
        );
    }

    // 6. Call ConverseStream
    let mut stream_output = client
        .converse_stream()
        .model_id("us.anthropic.claude-sonnet-4-6")
        .system(SystemContentBlock::Text(system_prompt))
        .set_messages(Some(bedrock_messages))
        .send()
        .await
        .map_err(|e| {
            let err_msg = format!("{:?}", e);
            log::error!("Bedrock ConverseStream error: {}", err_msg);
            if err_msg.contains("expired")
                || err_msg.contains("security token")
                || err_msg.contains("credentials")
            {
                format!("auth: {}", err_msg)
            } else {
                format!("Bedrock API error: {}", err_msg)
            }
        })?;

    // 7-9. Process stream
    let mut full_response = String::new();
    loop {
        let event = stream_output.stream.recv().await;
        match event {
            Ok(Some(output)) => match output {
                ConverseStreamOutput::ContentBlockDelta(delta) => {
                    if let Some(content_delta) = delta.delta {
                        if let aws_sdk_bedrockruntime::types::ContentBlockDelta::Text(text) =
                            content_delta
                        {
                            full_response.push_str(&text);
                            let _ = on_event.send(StreamEvent::Token(text));
                        }
                    }
                }
                ConverseStreamOutput::MessageStop(_) => {
                    break;
                }
                _ => {}
            },
            Ok(None) => break,
            Err(e) => {
                let err_msg = format!("{}", e);
                let _ = on_event.send(StreamEvent::Error(err_msg));
                return Err("Stream error".to_string());
            }
        }
    }

    let _ = on_event.send(StreamEvent::Done(full_response));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_execute_write_file_creates_file() {
        let dir = tempdir().unwrap();
        let result = execute_write_file(
            dir.path().to_str().unwrap(),
            "new-doc.md",
            "# Hello\n",
        );
        assert!(result.is_ok());
        let abs_path = result.unwrap();
        assert!(std::path::Path::new(&abs_path).exists());
        assert_eq!(std::fs::read_to_string(&abs_path).unwrap(), "# Hello\n");
    }

    #[test]
    fn test_execute_write_file_overwrites() {
        let dir = tempdir().unwrap();
        execute_write_file(dir.path().to_str().unwrap(), "doc.md", "v1").unwrap();
        execute_write_file(dir.path().to_str().unwrap(), "doc.md", "v2").unwrap();
        let path = dir.path().join("doc.md");
        assert_eq!(std::fs::read_to_string(path).unwrap(), "v2");
    }

    #[test]
    fn test_execute_write_file_creates_parent_dirs() {
        let dir = tempdir().unwrap();
        let result = execute_write_file(
            dir.path().to_str().unwrap(),
            "specs/nested/doc.md",
            "content",
        );
        assert!(result.is_ok());
        assert!(dir.path().join("specs/nested/doc.md").exists());
    }

    #[test]
    fn test_execute_write_file_rejects_absolute_path() {
        let dir = tempdir().unwrap();
        let result = execute_write_file(
            dir.path().to_str().unwrap(),
            "/etc/passwd",
            "bad",
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("relative"));
    }

    #[test]
    fn test_execute_write_file_rejects_path_traversal() {
        let dir = tempdir().unwrap();
        let result = execute_write_file(
            dir.path().to_str().unwrap(),
            "../outside.md",
            "bad",
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("traversal"));
    }

    #[test]
    fn test_document_updated_serializes_correctly() {
        let event = StreamEvent::DocumentUpdated("/workspace/doc.md".to_string());
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"DocumentUpdated\""));
        assert!(json.contains("/workspace/doc.md"));
    }
}
