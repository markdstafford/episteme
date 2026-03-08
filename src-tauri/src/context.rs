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
