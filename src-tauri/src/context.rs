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
        let prompt = build_system_prompt(
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
        let prompt = build_system_prompt(
            &doc_mode(), Some(&dt), None, None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Document type"), "got: {}", prompt);
        assert!(prompt.contains("## Template"), "got: {}", prompt);
    }

    #[test]
    fn test_doc_type_section_omitted_when_none() {
        let dir = setup_workspace();
        let prompt = build_system_prompt(
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
        let prompt = build_system_prompt(
            &doc_mode(), None, Some(&proc), None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Process guidance"), "got: {}", prompt);
        assert!(prompt.contains("Step 1: do this."), "got: {}", prompt);
    }

    #[test]
    fn test_active_document_omitted_for_workspace_scope() {
        let dir = setup_workspace();
        let doc_path = dir.path().join("readme.md").to_string_lossy().to_string();
        let prompt = build_system_prompt(
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
        let prompt = build_system_prompt(
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
        let prompt = build_system_prompt(
            &doc_mode(), None, None,
            Some(&doc_path), dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Active document"), "got: {}", prompt);
        assert!(prompt.contains("# Readme"), "got: {}", prompt);
    }

    #[test]
    fn test_workspace_listing_always_present() {
        let dir = setup_workspace();
        let prompt = build_system_prompt(
            &doc_mode(), None, None, None, dir.path().to_str().unwrap()
        ).unwrap();
        assert!(prompt.contains("## Workspace"), "got: {}", prompt);
        assert!(prompt.contains("readme.md"), "got: {}", prompt);
    }
}
