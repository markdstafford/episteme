use aws_config::{self, BehaviorVersion};
use aws_credential_types::provider::ProvideCredentials;
use aws_sdk_bedrockruntime::Client as BedrockClient;
use aws_sdk_bedrockruntime::types::{
    ContentBlock, ConversationRole, ConverseStreamOutput, Message, SystemContentBlock,
    ToolResultBlock, ToolResultContentBlock, ToolUseBlock,
};
use aws_smithy_types::Document;
use base64::Engine;
use crate::session::{CanonicalBlock, CanonicalMessage, ImageSource};
use serde::Serialize;
use tauri::ipc::Channel;
use tokio::process::Command;

#[derive(Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum StreamEvent {
    Token(String),
    Done { content: String, model: String },
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

    // Verify the resolved parent is still within the workspace (guards against symlink escapes)
    if let Some(parent) = full_path.parent() {
        let canonical_parent = std::fs::canonicalize(parent)
            .map_err(|e| format!("Failed to resolve path: {}", e))?;
        if !canonical_parent.starts_with(&canonical_workspace) {
            return Err("Access denied: resolved path is outside workspace".to_string());
        }
    }

    std::fs::write(&full_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(full_path.to_string_lossy().to_string())
}

fn build_write_file_tool_config(
) -> Result<aws_sdk_bedrockruntime::types::ToolConfiguration, String> {
    use aws_sdk_bedrockruntime::types::{Tool, ToolConfiguration, ToolInputSchema, ToolSpecification};
    use std::collections::HashMap;

    let mut file_path_prop: HashMap<String, Document> = HashMap::new();
    file_path_prop.insert("type".to_string(), Document::String("string".to_string()));
    file_path_prop.insert(
        "description".to_string(),
        Document::String(
            "Relative path within the workspace (e.g., 'specs/notification-system.md')"
                .to_string(),
        ),
    );

    let mut content_prop: HashMap<String, Document> = HashMap::new();
    content_prop.insert("type".to_string(), Document::String("string".to_string()));
    content_prop.insert(
        "description".to_string(),
        Document::String("The complete file content to write".to_string()),
    );

    let mut properties: HashMap<String, Document> = HashMap::new();
    properties.insert("file_path".to_string(), Document::Object(file_path_prop));
    properties.insert("content".to_string(), Document::Object(content_prop));

    let mut schema_map: HashMap<String, Document> = HashMap::new();
    schema_map.insert("type".to_string(), Document::String("object".to_string()));
    schema_map.insert("properties".to_string(), Document::Object(properties));
    schema_map.insert(
        "required".to_string(),
        Document::Array(vec![
            Document::String("file_path".to_string()),
            Document::String("content".to_string()),
        ]),
    );

    let tool_spec = ToolSpecification::builder()
        .name("write_file")
        .description(
            "Write content to a file in the workspace. Creates the file if it doesn't exist, \
             or overwrites it if it does. Use this to create and update the document being authored. \
             Always write the complete file content.",
        )
        .input_schema(ToolInputSchema::Json(Document::Object(schema_map)))
        .build()
        .map_err(|e| format!("Failed to build tool spec: {}", e))?;

    ToolConfiguration::builder()
        .tools(Tool::ToolSpec(tool_spec))
        .build()
        .map_err(|e| format!("Failed to build tool config: {}", e))
}

fn resolve_file_refs(
    messages: Vec<CanonicalMessage>,
    workspace_path: &str,
) -> Result<Vec<CanonicalMessage>, String> {
    let canonical_workspace = std::fs::canonicalize(workspace_path)
        .map_err(|e| format!("Invalid workspace path: {}", e))?;

    messages
        .into_iter()
        .map(|mut msg| {
            msg.content = msg
                .content
                .into_iter()
                .map(|block| {
                    let (path, media_type) = match &block {
                        CanonicalBlock::FileRef { path, media_type, .. } => {
                            (path.clone(), media_type.clone())
                        }
                        CanonicalBlock::Image { media_type, source: ImageSource::Path { path } } => {
                            (path.clone(), media_type.clone())
                        }
                        other => return Ok(other.clone()),
                    };

                    let file_path = std::path::Path::new(&path);
                    if file_path.is_absolute() {
                        return Err(format!("file_ref path must be relative: {}", path));
                    }
                    for component in file_path.components() {
                        if component == std::path::Component::ParentDir {
                            return Err("file_ref path traversal not allowed".to_string());
                        }
                    }
                    let full_path = canonical_workspace.join(file_path);
                    // Check for existence before canonicalizing (canonicalize fails on missing files)
                    if !full_path.exists() {
                        log::warn!("file_ref: file not found: {}", path);
                        return Ok(CanonicalBlock::Text {
                            text: format!("[attachment unavailable: {}]", path),
                        });
                    }
                    let canonical_full = std::fs::canonicalize(&full_path)
                        .map_err(|e| format!("file_ref: cannot resolve path {}: {}", path, e))?;
                    if !canonical_full.starts_with(&canonical_workspace) {
                        return Err(format!("Access denied: {} is outside workspace", path));
                    }
                    match std::fs::read(&canonical_full) {
                        Ok(bytes) => {
                            let data = base64::engine::general_purpose::STANDARD.encode(&bytes);
                            Ok(CanonicalBlock::Image {
                                media_type,
                                source: ImageSource::Base64 { data },
                            })
                        }
                        Err(e) => {
                            log::warn!("file_ref: could not read {}: {}", path, e);
                            Ok(CanonicalBlock::Text {
                                text: format!("[attachment unavailable: {}]", path),
                            })
                        }
                    }
                })
                .collect::<Result<Vec<_>, String>>()?;
            Ok(msg)
        })
        .collect()
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
    messages: Vec<CanonicalMessage>,
    active_file_path: Option<String>,
    workspace_path: String,
    aws_profile: String,
    authoring_mode: bool,
    active_skill: Option<String>,
    on_event: Channel<StreamEvent>,
) -> Result<(), String> {
    // 1. Validate profile
    validate_aws_profile(&aws_profile)?;

    // 2. Build system prompt
    // Load skill content if in authoring mode with an active skill
    let skill_content = if authoring_mode {
        if let Some(ref skill_name) = active_skill {
            match crate::skill_loader::load_skill(&workspace_path, skill_name) {
                Ok(content) => Some(content),
                Err(e) => {
                    log::warn!("Failed to load skill '{}': {}", skill_name, e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    let system_prompt = crate::context::build_system_prompt(
        active_file_path.as_deref(),
        &[],
        &workspace_path,
        authoring_mode,
        skill_content.as_deref(),
    )?;

    // 3. Load AWS config using profile name
    let config = aws_config::defaults(BehaviorVersion::latest())
        .profile_name(&aws_profile)
        .load()
        .await;

    // 4. Create Bedrock client
    let client = BedrockClient::new(&config);

    // 5. Resolve file refs, then build messages
    let resolved_messages = resolve_file_refs(messages, &workspace_path)?;

    let mut bedrock_messages = Vec::new();
    for msg in &resolved_messages {
        let role = match msg.role.as_str() {
            "user" => ConversationRole::User,
            "assistant" => ConversationRole::Assistant,
            _ => continue,
        };
        // Build content blocks — for now, only handle Text blocks
        // Image blocks will be wired when multi-modal UI is built
        let content_blocks: Vec<ContentBlock> = msg.content.iter().filter_map(|block| {
            match block {
                CanonicalBlock::Text { text } => Some(ContentBlock::Text(text.clone())),
                _ => {
                    log::debug!("ai_chat: skipping non-text block (multi-modal not yet wired)");
                    None
                }
            }
        }).collect();
        if content_blocks.is_empty() {
            continue;
        }
        bedrock_messages.push(
            Message::builder()
                .role(role)
                .set_content(Some(content_blocks))
                .build()
                .map_err(|e| format!("Failed to build message: {}", e))?,
        );
    }

    // 6. Build tool config for authoring mode
    let tool_config = if authoring_mode {
        Some(build_write_file_tool_config()?)
    } else {
        None
    };

    // 7. Tool use loop — may run multiple ConverseStream calls when tools are invoked
    let mut loop_messages = bedrock_messages;
    let mut full_response = String::new();

    'outer: loop {
        let mut builder = client
            .converse_stream()
            .model_id("us.anthropic.claude-sonnet-4-6")
            .system(SystemContentBlock::Text(system_prompt.clone()))
            .set_messages(Some(loop_messages.clone()));

        if let Some(ref tc) = tool_config {
            builder = builder.tool_config(tc.clone());
        }

        let mut stream_output = builder.send().await.map_err(|e| {
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

        struct ToolCallAcc {
            tool_use_id: String,
            name: String,
            input_json: String,
        }
        let mut pending_tool_calls: Vec<ToolCallAcc> = Vec::new();
        let mut current_tool_call: Option<ToolCallAcc> = None;
        let mut assistant_text = String::new();
        let mut got_tool_use = false;

        loop {
            match stream_output.stream.recv().await {
                Ok(Some(output)) => match output {
                    ConverseStreamOutput::ContentBlockStart(e) => {
                        if let Some(cb) = e.start {
                            use aws_sdk_bedrockruntime::types::ContentBlockStart;
                            if let ContentBlockStart::ToolUse(tus) = cb {
                                got_tool_use = true;
                                current_tool_call = Some(ToolCallAcc {
                                    tool_use_id: tus.tool_use_id().to_string(),
                                    name: tus.name().to_string(),
                                    input_json: String::new(),
                                });
                            }
                        }
                    }
                    ConverseStreamOutput::ContentBlockDelta(delta) => {
                        if let Some(d) = delta.delta {
                            use aws_sdk_bedrockruntime::types::ContentBlockDelta;
                            match d {
                                ContentBlockDelta::Text(text) => {
                                    assistant_text.push_str(&text);
                                    full_response.push_str(&text);
                                    let _ = on_event.send(StreamEvent::Token(text));
                                }
                                ContentBlockDelta::ToolUse(tud) => {
                                    if let Some(ref mut acc) = current_tool_call {
                                        acc.input_json.push_str(tud.input());
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    ConverseStreamOutput::ContentBlockStop(_) => {
                        if let Some(acc) = current_tool_call.take() {
                            pending_tool_calls.push(acc);
                        }
                    }
                    ConverseStreamOutput::MessageStop(_) => {
                        if got_tool_use {
                            let mut assistant_blocks: Vec<ContentBlock> = Vec::new();
                            if !assistant_text.is_empty() {
                                assistant_blocks
                                    .push(ContentBlock::Text(assistant_text.clone()));
                            }

                            let mut tool_result_blocks: Vec<ContentBlock> = Vec::new();

                            for call in &pending_tool_calls {
                                let input_doc: Document =
                                    serde_json::from_str::<serde_json::Value>(&call.input_json)
                                        .ok()
                                        .map(json_value_to_document)
                                        .unwrap_or(Document::Null);

                                let tool_use_block = ToolUseBlock::builder()
                                    .tool_use_id(&call.tool_use_id)
                                    .name(&call.name)
                                    .input(input_doc)
                                    .build()
                                    .map_err(|e| format!("Build ToolUseBlock: {}", e))?;
                                assistant_blocks
                                    .push(ContentBlock::ToolUse(tool_use_block));

                                let tool_result_text = if call.name == "write_file" {
                                    let file_path =
                                        extract_str_field(&call.input_json, "file_path");
                                    let content =
                                        extract_str_field(&call.input_json, "content");
                                    match (file_path, content) {
                                        (Some(fp), Some(ct)) => {
                                            match execute_write_file(
                                                &workspace_path,
                                                &fp,
                                                &ct,
                                            ) {
                                                Ok(abs_path) => {
                                                    log::info!(
                                                        "write_file: wrote {}",
                                                        abs_path
                                                    );
                                                    let _ = on_event.send(
                                                        StreamEvent::DocumentUpdated(
                                                            abs_path.clone(),
                                                        ),
                                                    );
                                                    format!("success: wrote {}", abs_path)
                                                }
                                                Err(e) => {
                                                    log::error!(
                                                        "write_file error: {}",
                                                        e
                                                    );
                                                    format!("error: {}", e)
                                                }
                                            }
                                        }
                                        _ => "error: missing file_path or content"
                                            .to_string(),
                                    }
                                } else {
                                    format!("error: unknown tool '{}'", call.name)
                                };

                                let result_block = ToolResultBlock::builder()
                                    .tool_use_id(&call.tool_use_id)
                                    .content(ToolResultContentBlock::Text(tool_result_text))
                                    .build()
                                    .map_err(|e| format!("Build ToolResultBlock: {}", e))?;
                                tool_result_blocks
                                    .push(ContentBlock::ToolResult(result_block));
                            }

                            let assistant_msg = Message::builder()
                                .role(ConversationRole::Assistant)
                                .set_content(Some(assistant_blocks))
                                .build()
                                .map_err(|e| format!("Build assistant msg: {}", e))?;
                            loop_messages.push(assistant_msg);

                            let user_tool_msg = Message::builder()
                                .role(ConversationRole::User)
                                .set_content(Some(tool_result_blocks))
                                .build()
                                .map_err(|e| format!("Build tool result msg: {}", e))?;
                            loop_messages.push(user_tool_msg);

                            continue 'outer;
                        } else {
                            break;
                        }
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

        // end_turn — done
        break;
    }

    let _ = on_event.send(StreamEvent::Done {
        content: full_response,
        model: "us.anthropic.claude-sonnet-4-6".to_string(),
    });
    Ok(())
}

#[tauri::command]
pub async fn ai_suggest_session_name(
    messages: Vec<CanonicalMessage>,
    aws_profile: String,
) -> Result<String, String> {
    validate_aws_profile(&aws_profile)?;

    if messages.is_empty() {
        return Err("messages must not be empty".to_string());
    }

    let config = aws_config::defaults(BehaviorVersion::latest())
        .profile_name(&aws_profile)
        .load()
        .await;

    let client = BedrockClient::new(&config);

    let mut bedrock_messages = Vec::new();
    for msg in &messages {
        let role = match msg.role.as_str() {
            "user" => ConversationRole::User,
            "assistant" => ConversationRole::Assistant,
            _ => continue,
        };
        let content_blocks: Vec<ContentBlock> = msg.content.iter().filter_map(|block| {
            match block {
                CanonicalBlock::Text { text } => Some(ContentBlock::Text(text.clone())),
                _ => None,
            }
        }).collect();
        if content_blocks.is_empty() {
            continue;
        }
        bedrock_messages.push(
            Message::builder()
                .role(role)
                .set_content(Some(content_blocks))
                .build()
                .map_err(|e| format!("Failed to build message: {}", e))?,
        );
    }

    // Bedrock requires the conversation to end with a user message.
    // Trim trailing assistant messages (normal after a completed exchange).
    while bedrock_messages.last().map(|m| m.role() == &ConversationRole::Assistant).unwrap_or(false) {
        bedrock_messages.pop();
    }

    if bedrock_messages.is_empty() {
        return Err("messages must not be empty".to_string());
    }

    let system_prompt = "Based on the following conversation, suggest a short session name \
        (5 words or fewer). Respond with only the name — no punctuation, no quotes, no explanation.";

    let response = client
        .converse()
        .model_id("us.anthropic.claude-sonnet-4-6")
        .system(SystemContentBlock::Text(system_prompt.to_string()))
        .set_messages(Some(bedrock_messages))
        .send()
        .await
        .map_err(|e| {
            log::error!("ai_suggest_session_name: Bedrock error: {:?}", e);
            format!("Bedrock error: {:?}", e)
        })?;

    let name = response
        .output()
        .and_then(|o| o.as_message().ok())
        .and_then(|m| m.content().first())
        .and_then(|b| b.as_text().ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if name.is_empty() {
        return Err("Bedrock returned empty name".to_string());
    }

    log::info!("ai_suggest_session_name: name generated");
    Ok(name)
}

fn extract_str_field(json: &str, field: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(json)
        .ok()
        .and_then(|v| v.get(field).and_then(|f| f.as_str()).map(|s| s.to_string()))
}

fn json_value_to_document(value: serde_json::Value) -> Document {
    match value {
        serde_json::Value::Null => Document::Null,
        serde_json::Value::Bool(b) => Document::Bool(b),
        serde_json::Value::Number(n) => {
            if let Some(u) = n.as_u64() {
                Document::Number(aws_smithy_types::Number::PosInt(u))
            } else if let Some(i) = n.as_i64() {
                Document::Number(aws_smithy_types::Number::NegInt(i))
            } else if let Some(f) = n.as_f64() {
                Document::Number(aws_smithy_types::Number::Float(f))
            } else {
                Document::Null
            }
        }
        serde_json::Value::String(s) => Document::String(s),
        serde_json::Value::Array(arr) => {
            Document::Array(arr.into_iter().map(json_value_to_document).collect())
        }
        serde_json::Value::Object(map) => Document::Object(
            map.into_iter()
                .map(|(k, v)| (k, json_value_to_document(v)))
                .collect(),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_suggest_session_name_rejects_empty_profile() {
        assert!(validate_aws_profile("").is_err());
    }

    #[tokio::test]
    async fn test_suggest_session_name_rejects_empty_messages() {
        let result = ai_suggest_session_name(
            vec![],
            "valid-profile".to_string(),
        ).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("must not be empty"));
    }

    #[test]
    fn test_suggest_session_name_rejects_profile_with_spaces() {
        assert!(validate_aws_profile("bad profile!").is_err());
    }

    #[test]
    fn test_suggest_session_name_accepts_valid_profile() {
        assert!(validate_aws_profile("my-profile_123").is_ok());
    }
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

    #[test]
    fn test_build_write_file_tool_compiles() {
        let config = build_write_file_tool_config();
        assert!(config.is_ok());
    }

    #[test]
    fn test_file_ref_resolution_rejects_path_traversal() {
        use crate::session::{CanonicalBlock, CanonicalMessage};
        let dir = tempfile::tempdir().unwrap();
        let messages = vec![CanonicalMessage {
            role: "user".to_string(),
            content: vec![CanonicalBlock::FileRef {
                path: "../outside.md".to_string(),
                name: "outside.md".to_string(),
                media_type: "text/markdown".to_string(),
            }],
        }];
        let result = resolve_file_refs(messages, dir.path().to_str().unwrap());
        assert!(result.is_err());
    }

    #[test]
    fn test_file_ref_resolution_resolves_text_file() {
        use crate::session::{CanonicalBlock, CanonicalMessage, ImageSource};
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("doc.md"), b"hello").unwrap();
        let messages = vec![CanonicalMessage {
            role: "user".to_string(),
            content: vec![CanonicalBlock::FileRef {
                path: "doc.md".to_string(),
                name: "doc.md".to_string(),
                media_type: "text/markdown".to_string(),
            }],
        }];
        let result = resolve_file_refs(messages, dir.path().to_str().unwrap()).unwrap();
        match &result[0].content[0] {
            CanonicalBlock::Image { source: ImageSource::Base64 { data }, .. } => {
                assert!(!data.is_empty());
            }
            other => panic!("expected Image::Base64, got {:?}", other),
        }
    }

    #[test]
    fn test_text_only_messages_pass_through_unchanged() {
        use crate::session::{CanonicalBlock, CanonicalMessage};
        let messages = vec![CanonicalMessage {
            role: "user".to_string(),
            content: vec![CanonicalBlock::Text { text: "hello".to_string() }],
        }];
        let result = resolve_file_refs(messages, "/tmp").unwrap();
        assert!(matches!(result[0].content[0], CanonicalBlock::Text { .. }));
    }

    #[test]
    fn test_file_ref_missing_file_returns_placeholder() {
        use crate::session::{CanonicalBlock, CanonicalMessage};
        let dir = tempfile::tempdir().unwrap();
        // File does NOT exist in the workspace
        let messages = vec![CanonicalMessage {
            role: "user".to_string(),
            content: vec![CanonicalBlock::FileRef {
                path: "nonexistent.md".to_string(),
                name: "nonexistent.md".to_string(),
                media_type: "text/markdown".to_string(),
            }],
        }];
        let result = resolve_file_refs(messages, dir.path().to_str().unwrap()).unwrap();
        // Should succeed (not Err) and return a text placeholder
        match &result[0].content[0] {
            CanonicalBlock::Text { text } => {
                assert!(text.contains("unavailable") || text.contains("nonexistent"));
            }
            other => panic!("expected Text placeholder, got {:?}", other),
        }
    }

    #[test]
    fn test_execute_write_file_rejects_symlink_escape() {
        use std::os::unix::fs::symlink;
        let dir = tempdir().unwrap();
        let outside = tempdir().unwrap();

        // Create a symlink inside the workspace that points outside
        let link_path = dir.path().join("escape-link");
        symlink(outside.path(), &link_path).unwrap();

        // Attempting to write through the symlink should fail
        let result = execute_write_file(
            dir.path().to_str().unwrap(),
            "escape-link/secret.md",
            "bad content",
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside workspace"));
    }
}
