use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;

fn is_markdown_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown")
}

fn is_hidden(name: &str) -> bool {
    name.starts_with('.')
}

/// Extract a title from the first few lines of a markdown file.
/// Checks for YAML frontmatter `title:` field, then first `# heading`,
/// then falls back to the filename (without extension).
fn extract_title(lines: &[String], filename: &str) -> String {
    let mut in_frontmatter = false;

    for (i, line) in lines.iter().enumerate() {
        // Detect YAML frontmatter opening
        if i == 0 && line.trim() == "---" {
            in_frontmatter = true;
            continue;
        }

        if in_frontmatter {
            // End of frontmatter
            if line.trim() == "---" || line.trim() == "..." {
                in_frontmatter = false;
                continue;
            }
            // Look for title field
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("title:") {
                let title = rest.trim().trim_matches('"').trim_matches('\'').trim();
                if !title.is_empty() {
                    return title.to_string();
                }
            }
            continue;
        }

        // Look for first # heading outside frontmatter
        let trimmed = line.trim();
        if let Some(heading) = trimmed.strip_prefix("# ") {
            let heading = heading.trim();
            if !heading.is_empty() {
                return heading.to_string();
            }
        }
    }

    // Fall back to filename without extension
    let path = Path::new(filename);
    path.file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| filename.to_string())
}

/// Read the first N lines of a file.
fn read_first_lines(path: &Path, max_lines: usize) -> Vec<String> {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };
    let reader = BufReader::new(file);
    reader
        .lines()
        .take(max_lines)
        .filter_map(|l| l.ok())
        .collect()
}

struct FileEntry {
    relative_path: String,
    title: String,
}

/// Walk the workspace directory and collect markdown file entries with titles.
fn collect_markdown_entries(dir: &Path, workspace_root: &Path) -> Vec<FileEntry> {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut result: Vec<FileEntry> = Vec::new();

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();

        if is_hidden(&name) {
            continue;
        }

        // Skip node_modules
        if name == "node_modules" {
            continue;
        }

        let path = entry.path();

        // Don't follow symlinks
        if path.is_symlink() {
            continue;
        }

        if path.is_dir() {
            result.extend(collect_markdown_entries(&path, workspace_root));
        } else if is_markdown_file(&name) {
            let relative = path
                .strip_prefix(workspace_root)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            let lines = read_first_lines(&path, 10);
            let title = extract_title(&lines, &name);
            result.push(FileEntry {
                relative_path: relative,
                title,
            });
        }
    }

    result.sort_by(|a, b| a.relative_path.to_lowercase().cmp(&b.relative_path.to_lowercase()));
    result
}

/// Public version of collect_markdown_entries for use by tool_catalog.
pub fn collect_markdown_entries_pub(dir: &std::path::Path, root: &std::path::Path) -> Vec<(String, String)> {
    collect_markdown_entries(dir, root)
        .into_iter()
        .map(|e| (e.relative_path, e.title))
        .collect()
}

pub fn build_system_prompt(
    active_file_path: Option<&str>,
    _open_file_paths: &[String],
    workspace_path: &str,
    authoring_mode: bool,
    skill_content: Option<&str>,
) -> Result<String, String> {
    let workspace = Path::new(workspace_path);
    let canonical_workspace = fs::canonicalize(workspace)
        .map_err(|e| format!("Invalid workspace path: {}", e))?;

    let active_document_section = if let Some(file_path) = active_file_path {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("File does not exist: {}", file_path));
        }
        let canonical_file = fs::canonicalize(path)
            .map_err(|e| format!("Invalid file path: {}", e))?;
        if !canonical_file.starts_with(&canonical_workspace) {
            return Err("Access denied: file is outside workspace".to_string());
        }
        fs::read_to_string(path)
            .map_err(|e| format!("Failed to read active file: {}", e))?
    } else {
        "No document is currently open.".to_string()
    };

    let entries = collect_markdown_entries(&canonical_workspace, &canonical_workspace);
    let tree_listing: String = entries
        .iter()
        .map(|e| format!("- {}: \"{}\"", e.relative_path, e.title))
        .collect::<Vec<_>>()
        .join("\n");
    let tree_section = if tree_listing.is_empty() {
        "No markdown files found.".to_string()
    } else {
        tree_listing
    };

    let prompt = if authoring_mode {
        let skill_section = match skill_content {
            Some(content) => format!("\n## Skill\n\n{}\n", content),
            None => String::new(),
        };
        format!(
            "You are an AI assistant for Episteme, a document authoring application.\n\
             You are currently helping the user create a new document.\n\
             \n\
             ## Authoring instructions\n\
             \n\
             - Use the `write_file` tool to write the document — always write the complete file content\n\
             - Keep your chat messages concise — ask questions and give brief status updates\n\
             - Do NOT include section content in your chat messages; write it to the document using write_file\n\
             - Follow the skill process below to guide the user through each section\n\
             - After each write, the user sees the updated document in their viewer\n\
             {}\n\
             ## Active document\n\
             {}\n\
             \n\
             ## Repository structure\n\
             {}",
            skill_section,
            active_document_section,
            tree_section
        )
    } else {
        format!(
            "You are an AI assistant for a document repository called Episteme. \
You help users understand, navigate, and work with their documentation.\n\
\n\
## Active document\n\
{}\n\
\n\
## Repository structure\n\
{}\n\
\n\
When the user asks about a specific document, use the repository structure to identify the right file. \
If they ask about a file you haven't seen the full contents of, let them know you can see the file exists \
but would need them to open it for full context.",
            active_document_section,
            tree_section
        )
    };

    Ok(prompt)
}

pub fn build_system_prompt_v2(
    mode: &crate::manifest_loader::ModeManifest,
    doc_type: Option<&crate::manifest_loader::DocTypeManifest>,
    process: Option<&crate::manifest_loader::ProcessManifest>,
    active_file_path: Option<&str>,
    workspace_path: &str,
) -> Result<String, String> {
    use crate::manifest_loader::ModeScope;

    let workspace = std::path::Path::new(workspace_path);
    let canonical_ws = std::fs::canonicalize(workspace)
        .map_err(|e| format!("Invalid workspace path: {}", e))?;

    let mut prompt = mode.system_prompt.clone();

    if let Some(dt) = doc_type {
        prompt.push_str("\n\n## Document type\n\n");
        prompt.push_str(&dt.template);
    }

    if let Some(proc) = process {
        prompt.push_str("\n\n## Process guidance\n\n");
        prompt.push_str(&proc.instructions);
    }

    // Active document: only for document-scoped modes AND when a file is provided
    let include_active_doc = matches!(mode.scope, ModeScope::Document)
        && active_file_path.is_some();

    if include_active_doc {
        let file_path = active_file_path.unwrap();
        let path = std::path::Path::new(file_path);
        if path.exists() {
            let canonical_file = std::fs::canonicalize(path)
                .map_err(|e| format!("Invalid file path: {}", e))?;
            if canonical_file.starts_with(&canonical_ws) {
                let content = std::fs::read_to_string(path)
                    .map_err(|e| format!("Failed to read active file: {}", e))?;
                prompt.push_str("\n\n## Active document\n\n");
                prompt.push_str(&content);
            }
        }
    }

    // Workspace listing — always present
    let entries = collect_markdown_entries(&canonical_ws, &canonical_ws);
    let tree = if entries.is_empty() {
        "No markdown files found.".to_string()
    } else {
        entries.iter()
            .map(|e| format!("- {}: \"{}\"", e.relative_path, e.title))
            .collect::<Vec<_>>()
            .join("\n")
    };
    prompt.push_str("\n\n## Workspace\n\n");
    prompt.push_str(&tree);

    Ok(prompt)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_title_from_heading() {
        let lines = vec!["# My Title".to_string(), "Some content".to_string()];
        assert_eq!(extract_title(&lines, "test.md"), "My Title");
    }

    #[test]
    fn test_extract_title_from_frontmatter() {
        let lines = vec![
            "---".to_string(),
            "title: Frontmatter Title".to_string(),
            "---".to_string(),
            "# Heading".to_string(),
        ];
        assert_eq!(extract_title(&lines, "test.md"), "Frontmatter Title");
    }

    #[test]
    fn test_extract_title_quoted_frontmatter() {
        let lines = vec![
            "---".to_string(),
            "title: \"Quoted Title\"".to_string(),
            "---".to_string(),
        ];
        assert_eq!(extract_title(&lines, "test.md"), "Quoted Title");
    }

    #[test]
    fn test_extract_title_fallback_to_filename() {
        let lines = vec!["Some content without a title".to_string()];
        assert_eq!(extract_title(&lines, "my-doc.md"), "my-doc");
    }

    #[test]
    fn test_is_markdown_file() {
        assert!(is_markdown_file("test.md"));
        assert!(is_markdown_file("TEST.MD"));
        assert!(is_markdown_file("doc.markdown"));
        assert!(!is_markdown_file("file.txt"));
    }

    #[test]
    fn test_is_hidden() {
        assert!(is_hidden(".git"));
        assert!(!is_hidden("readme.md"));
    }

    #[test]
    fn test_authoring_prompt_includes_skill_and_instructions() {
        use tempfile::TempDir;
        let dir = tempfile::tempdir().unwrap();
        // Create a dummy markdown file so the workspace has content
        std::fs::write(dir.path().join("readme.md"), "# Readme").unwrap();

        let prompt = build_system_prompt(
            None,
            &[],
            dir.path().to_str().unwrap(),
            true,
            Some("## My Skill\nDo things"),
        )
        .unwrap();

        assert!(prompt.contains("Authoring instructions"));
        assert!(prompt.contains("write_file"));
        assert!(prompt.contains("## Skill"));
        assert!(prompt.contains("## My Skill"));
        assert!(prompt.contains("Repository structure"));
    }

    #[test]
    fn test_non_authoring_prompt_unchanged() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("doc.md"), "# Doc").unwrap();

        let prompt = build_system_prompt(
            None,
            &[],
            dir.path().to_str().unwrap(),
            false,
            None,
        )
        .unwrap();

        assert!(prompt.contains("Episteme"));
        assert!(!prompt.contains("Authoring instructions"));
    }
}

#[cfg(test)]
mod tests_v2 {
    use super::*;
    use crate::manifest_loader::{ModeManifest, ModeScope};

    fn doc_mode() -> ModeManifest {
        ModeManifest {
            id: "draft".to_string(), name: "Draft".to_string(),
            description: None, scope: ModeScope::Document,
            tools: vec![], system_prompt: "You are drafting.".to_string(),
        }
    }

    fn workspace_mode() -> ModeManifest {
        ModeManifest {
            id: "ask".to_string(), name: "Ask".to_string(),
            description: None, scope: ModeScope::Workspace,
            tools: vec![], system_prompt: "You are answering.".to_string(),
        }
    }

    fn any_mode() -> ModeManifest {
        ModeManifest {
            id: "brainstorm".to_string(), name: "Brainstorm".to_string(),
            description: None, scope: ModeScope::Any,
            tools: vec![], system_prompt: "Brainstorm freely.".to_string(),
        }
    }

    fn setup_workspace() -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("readme.md"), "# Readme\nSome content").unwrap();
        dir
    }

    #[test]
    fn test_mode_prompt_always_first() {
        let dir = setup_workspace();
        let prompt = build_system_prompt_v2(
            &doc_mode(), None, None, None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.starts_with("You are drafting."), "got: {}", &prompt[..100.min(prompt.len())]);
    }

    #[test]
    fn test_doc_type_section_included_when_present() {
        use crate::manifest_loader::DocTypeManifest;
        let dir = setup_workspace();
        let dt = DocTypeManifest {
            id: "pd".to_string(), name: "PD".to_string(),
            description: None, template: "## Template\n### What".to_string(),
        };
        let prompt = build_system_prompt_v2(
            &doc_mode(), Some(&dt), None, None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Document type"), "got: {}", prompt);
        assert!(prompt.contains("## Template"), "got: {}", prompt);
    }

    #[test]
    fn test_doc_type_section_omitted_when_none() {
        let dir = setup_workspace();
        let prompt = build_system_prompt_v2(
            &doc_mode(), None, None, None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(!prompt.contains("## Document type"), "got: {}", prompt);
    }

    #[test]
    fn test_process_section_included_when_present() {
        use crate::manifest_loader::ProcessManifest;
        let dir = setup_workspace();
        let proc = ProcessManifest {
            id: "p".to_string(), modes: vec![], doc_types: vec![],
            stages: vec![], instructions: "Step 1: do this.".to_string(),
        };
        let prompt = build_system_prompt_v2(
            &doc_mode(), None, Some(&proc), None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Process guidance"), "got: {}", prompt);
        assert!(prompt.contains("Step 1: do this."), "got: {}", prompt);
    }

    #[test]
    fn test_active_document_omitted_for_workspace_scope() {
        let dir = setup_workspace();
        let doc_path = dir.path().join("readme.md").to_string_lossy().to_string();
        let prompt = build_system_prompt_v2(
            &workspace_mode(), None, None,
            Some(&doc_path), dir.path().to_str().unwrap()
        ).unwrap();
        assert!(!prompt.contains("## Active document"),
            "workspace mode should omit active doc, got: {}", prompt);
    }

    #[test]
    fn test_active_document_omitted_for_any_scope() {
        let dir = setup_workspace();
        let doc_path = dir.path().join("readme.md").to_string_lossy().to_string();
        let prompt = build_system_prompt_v2(
            &any_mode(), None, None,
            Some(&doc_path), dir.path().to_str().unwrap()
        ).unwrap();
        assert!(!prompt.contains("## Active document"),
            "any-scoped mode should omit active doc, got: {}", prompt);
    }

    #[test]
    fn test_active_document_included_for_document_scope() {
        let dir = setup_workspace();
        let doc_path = dir.path().join("readme.md").to_string_lossy().to_string();
        let prompt = build_system_prompt_v2(
            &doc_mode(), None, None,
            Some(&doc_path), dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Active document"), "got: {}", prompt);
        assert!(prompt.contains("# Readme"), "got: {}", prompt);
    }

    #[test]
    fn test_workspace_listing_always_present() {
        let dir = setup_workspace();
        let prompt = build_system_prompt_v2(
            &doc_mode(), None, None, None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Workspace"), "got: {}", prompt);
        assert!(prompt.contains("readme.md"), "got: {}", prompt);
    }
}
