use aws_sdk_bedrockruntime::types::{Tool, ToolConfiguration, ToolInputSchema, ToolSpecification};
use aws_smithy_types::Document;
use std::collections::HashMap;

/// Dispatch a tool call by name. Returns the result string for tool_result.
pub fn execute_tool(name: &str, input_json: &str, workspace_path: &str) -> String {
    match name {
        "write_file"       => execute_write_file_handler(input_json, workspace_path),
        "read_file"        => execute_read_file(input_json, workspace_path),
        "list_files"       => execute_list_files(workspace_path),
        "search_workspace" => execute_search_workspace(input_json, workspace_path),
        _ => format!("error: unknown tool '{}'", name),
    }
}

/// Build a provider ToolConfiguration from a list of tool names.
pub fn build_tool_config(tools: &[String]) -> Result<ToolConfiguration, String> {
    let mut builder = ToolConfiguration::builder();
    for name in tools {
        builder = builder.tools(catalog_tool(name)?);
    }
    builder.build().map_err(|e| format!("Failed to build tool config: {}", e))
}

/// Core write implementation — public so ai_chat can delegate to it.
pub fn write_file_impl(workspace_path: &str, file_path: &str, content: &str) -> Result<String, String> {
    let fp = std::path::Path::new(file_path);
    if fp.is_absolute() {
        return Err("file_path must be a relative path".to_string());
    }
    for c in fp.components() {
        if c == std::path::Component::ParentDir {
            return Err("file_path must not contain '..' (path traversal not allowed)".to_string());
        }
    }
    let canonical_ws = std::fs::canonicalize(workspace_path)
        .map_err(|e| format!("Invalid workspace path: {}", e))?;
    let full = canonical_ws.join(file_path);
    if let Some(parent) = full.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create dirs: {}", e))?;
        let canonical_parent = std::fs::canonicalize(parent)
            .map_err(|e| format!("Failed to resolve path: {}", e))?;
        if !canonical_parent.starts_with(&canonical_ws) {
            return Err("Access denied: resolved path is outside workspace".to_string());
        }
    }
    std::fs::write(&full, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(full.to_string_lossy().to_string())
}

// ─── Private helpers ─────────────────────────────────────────────────────────

fn execute_write_file_handler(input_json: &str, workspace_path: &str) -> String {
    let file_path = extract_str(input_json, "file_path");
    let content   = extract_str(input_json, "content");
    match (file_path, content) {
        (Some(fp), Some(ct)) => match write_file_impl(workspace_path, &fp, &ct) {
            Ok(abs)  => { log::info!("write_file: wrote {}", abs); format!("success: wrote {}", abs) }
            Err(e)   => { log::error!("write_file error: {}", e); format!("error: {}", e) }
        },
        _ => "error: missing file_path or content".to_string(),
    }
}

fn execute_read_file(input_json: &str, workspace_path: &str) -> String {
    let file_path = match extract_str(input_json, "file_path") {
        Some(fp) => fp,
        None => return "error: missing file_path".to_string(),
    };
    let fp = std::path::Path::new(&file_path);
    if fp.is_absolute() { return "error: file_path must be relative".to_string(); }
    for c in fp.components() {
        if c == std::path::Component::ParentDir {
            return "error: path traversal not allowed".to_string();
        }
    }
    let canonical_ws = match std::fs::canonicalize(workspace_path) {
        Ok(p)  => p,
        Err(e) => return format!("error: invalid workspace: {}", e),
    };
    let full = canonical_ws.join(&file_path);
    let canonical_full = match std::fs::canonicalize(&full) {
        Ok(p)  => p,
        Err(_) => return format!("error: file not found: {}", file_path),
    };
    if !canonical_full.starts_with(&canonical_ws) {
        return "error: access denied — file outside workspace".to_string();
    }
    match std::fs::read_to_string(&canonical_full) {
        Ok(c)  => c,
        Err(e) => format!("error: failed to read file: {}", e),
    }
}

fn execute_list_files(workspace_path: &str) -> String {
    let ws = std::path::Path::new(workspace_path);
    let entries = crate::context::collect_markdown_entries_pub(ws, ws);
    if entries.is_empty() {
        return "No markdown files found.".to_string();
    }
    entries.iter()
        .map(|(path, title)| format!("- {}: \"{}\"", path, title))
        .collect::<Vec<_>>()
        .join("\n")
}

fn execute_search_workspace(input_json: &str, workspace_path: &str) -> String {
    let query = match extract_str(input_json, "query") {
        Some(q) => q.to_lowercase(),
        None => return "error: missing query".to_string(),
    };
    let ws = std::path::Path::new(workspace_path);
    let entries = crate::context::collect_markdown_entries_pub(ws, ws);
    let mut matches = vec![];
    for (rel_path, title) in &entries {
        if matches.len() >= 20 { break; }
        let full = ws.join(rel_path);
        if let Ok(content) = std::fs::read_to_string(&full) {
            if content.to_lowercase().contains(&query) {
                matches.push(format!("- {}: \"{}\"", rel_path, title));
            }
        }
    }
    if matches.is_empty() {
        "No matching files found.".to_string()
    } else {
        matches.join("\n")
    }
}

fn extract_str(json: &str, field: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(json)
        .ok()
        .and_then(|v| v.get(field).and_then(|f| f.as_str()).map(|s| s.to_string()))
}

fn make_string_prop(description: &str) -> Document {
    let mut m = HashMap::new();
    m.insert("type".to_string(), Document::String("string".to_string()));
    m.insert("description".to_string(), Document::String(description.to_string()));
    Document::Object(m)
}

fn make_schema(properties: HashMap<String, Document>, required: Vec<&str>) -> Document {
    let mut schema = HashMap::new();
    schema.insert("type".to_string(), Document::String("object".to_string()));
    schema.insert("properties".to_string(), Document::Object(properties));
    schema.insert(
        "required".to_string(),
        Document::Array(required.iter().map(|s| Document::String(s.to_string())).collect()),
    );
    Document::Object(schema)
}

fn tool_spec(name: &str, description: &str, schema: Document) -> Result<Tool, String> {
    let spec = ToolSpecification::builder()
        .name(name)
        .description(description)
        .input_schema(ToolInputSchema::Json(schema))
        .build()
        .map_err(|e| format!("Failed to build tool spec for {}: {}", name, e))?;
    Ok(Tool::ToolSpec(spec))
}

fn catalog_tool(name: &str) -> Result<Tool, String> {
    match name {
        "write_file" => {
            let mut props = HashMap::new();
            props.insert("file_path".to_string(), make_string_prop("Relative path within the workspace"));
            props.insert("content".to_string(), make_string_prop("The complete file content to write"));
            tool_spec("write_file",
                "Write content to a file in the workspace. Creates or overwrites. Always write the complete file content.",
                make_schema(props, vec!["file_path", "content"]))
        }
        "read_file" => {
            let mut props = HashMap::new();
            props.insert("file_path".to_string(), make_string_prop("Relative path within the workspace"));
            tool_spec("read_file",
                "Read the contents of a file in the workspace.",
                make_schema(props, vec!["file_path"]))
        }
        "list_files" => {
            tool_spec("list_files",
                "List all markdown files in the workspace with their titles.",
                make_schema(HashMap::new(), vec![]))
        }
        "search_workspace" => {
            let mut props = HashMap::new();
            props.insert("query".to_string(), make_string_prop("Search query string"));
            tool_spec("search_workspace",
                "Search for files whose content contains the query string (case-insensitive). Returns up to 20 matches.",
                make_schema(props, vec!["query"]))
        }
        other => Err(format!("Unknown tool '{}' — not in catalog", other)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_build_tool_config_known_tools() {
        let tools: Vec<String> = vec!["read_file".to_string(), "write_file".to_string()];
        assert!(build_tool_config(&tools).is_ok());
    }

    #[test]
    fn test_build_tool_config_all_four_tools() {
        let tools: Vec<String> = vec![
            "read_file".to_string(), "write_file".to_string(),
            "list_files".to_string(), "search_workspace".to_string(),
        ];
        assert!(build_tool_config(&tools).is_ok());
    }

    #[test]
    fn test_build_tool_config_unknown_tool_returns_err() {
        let tools = vec!["nonexistent_tool".to_string()];
        let result = build_tool_config(&tools);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("nonexistent_tool"));
    }

    #[test]
    fn test_execute_write_file_creates_file() {
        let dir = tempdir().unwrap();
        let input = r##"{"file_path": "test.md", "content": "# Hello"}"##;
        let result = execute_tool("write_file", input, dir.path().to_str().unwrap());
        assert!(result.starts_with("success:"), "got: {}", result);
        assert!(dir.path().join("test.md").exists());
    }

    #[test]
    fn test_execute_write_file_creates_parent_dirs() {
        let dir = tempdir().unwrap();
        let input = r#"{"file_path": "sub/dir/doc.md", "content": "hello"}"#;
        let result = execute_tool("write_file", input, dir.path().to_str().unwrap());
        assert!(result.starts_with("success:"), "got: {}", result);
        assert!(dir.path().join("sub/dir/doc.md").exists());
    }

    #[test]
    fn test_execute_read_file_returns_content() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("doc.md"), "# My Doc\n").unwrap();
        let input = "{\"file_path\": \"doc.md\"}";
        let result = execute_tool("read_file", input, dir.path().to_str().unwrap());
        assert!(result.contains("# My Doc"), "got: {}", result);
    }

    #[test]
    fn test_execute_read_file_path_traversal_rejected() {
        let dir = tempdir().unwrap();
        let input = r#"{"file_path": "../etc/passwd"}"#;
        let result = execute_tool("read_file", input, dir.path().to_str().unwrap());
        assert!(result.starts_with("error:"), "got: {}", result);
    }

    #[test]
    fn test_execute_search_workspace_finds_match() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("auth.md"), "Authentication\nUse OAuth2.").unwrap();
        fs::write(dir.path().join("billing.md"), "Billing\nStripe integration.").unwrap();
        let input = r#"{"query": "OAuth"}"#;
        let result = execute_tool("search_workspace", input, dir.path().to_str().unwrap());
        assert!(result.contains("auth.md"), "got: {}", result);
        assert!(!result.contains("billing.md"), "billing should not match, got: {}", result);
    }

    #[test]
    fn test_execute_search_workspace_no_matches() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("doc.md"), "Hello world").unwrap();
        let input = r#"{"query": "zzznomatch"}"#;
        let result = execute_tool("search_workspace", input, dir.path().to_str().unwrap());
        assert!(!result.starts_with("error:"), "got: {}", result);
        assert_eq!(result, "No matching files found.");
    }

    #[test]
    fn test_execute_unknown_tool() {
        let result = execute_tool("magic_tool", "{}", "/tmp");
        assert!(result.contains("unknown tool"), "got: {}", result);
    }
}
