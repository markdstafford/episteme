use crate::skill_loader::{self, SkillInfo};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;

#[tauri::command]
pub async fn list_skills(workspace_path: String) -> Vec<SkillInfo> {
    skill_loader::list_skills(&workspace_path)
}

fn count_documents_by_type_impl(workspace_path: &str) -> HashMap<String, u32> {
    let mut counts: HashMap<String, u32> = HashMap::new();
    let workspace = Path::new(workspace_path);

    if !workspace.is_dir() {
        return counts;
    }

    count_in_dir(workspace, &mut counts);
    counts
}

fn should_skip_dir(name: &str) -> bool {
    matches!(name, ".git" | "node_modules" | "target" | ".worktrees")
}

fn count_in_dir(dir: &Path, counts: &mut HashMap<String, u32>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_symlink() {
            continue;
        }
        if path.is_dir() {
            let dir_name = entry.file_name().to_string_lossy().into_owned();
            if !should_skip_dir(&dir_name) {
                count_in_dir(&path, counts);
            }
        } else if path.extension().map_or(false, |ext| ext == "md" || ext == "markdown") {
            if let Some(doc_type) = extract_type_from_file(&path) {
                *counts.entry(doc_type).or_insert(0) += 1;
            }
        }
    }
}

fn extract_type_from_file(path: &Path) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let reader = BufReader::new(file);
    let head: String = reader
        .lines()
        .take(20)
        .filter_map(|l| l.ok())
        .collect::<Vec<_>>()
        .join("\n");

    let trimmed = head.trim_start();
    if !trimmed.starts_with("---") {
        return None;
    }
    let after_opening = &trimmed[3..];
    let closing = after_opening.find("\n---")?;
    let frontmatter = &after_opening[..closing];

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(value) = line.strip_prefix("type:") {
            let t = value.trim().trim_matches('"').trim_matches('\'').to_string();
            if !t.is_empty() {
                return Some(t);
            }
        }
    }
    None
}

#[tauri::command]
pub async fn count_documents_by_type(
    workspace_path: String,
) -> Result<HashMap<String, u32>, String> {
    Ok(count_documents_by_type_impl(&workspace_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn write_file_with_frontmatter(dir: &std::path::Path, name: &str, frontmatter_type: &str) {
        let content = format!("---\ntype: {}\ntitle: Test\n---\n# Content", frontmatter_type);
        fs::write(dir.join(name), content).unwrap();
    }

    fn write_file_no_frontmatter(dir: &std::path::Path, name: &str) {
        fs::write(dir.join(name), "# Just a heading\nNo frontmatter here").unwrap();
    }

    #[test]
    fn test_count_documents_by_type_returns_correct_counts() {
        let dir = tempdir().unwrap();
        write_file_with_frontmatter(dir.path(), "a.md", "product-description");
        write_file_with_frontmatter(dir.path(), "b.md", "product-description");
        write_file_with_frontmatter(dir.path(), "c.md", "tech-design");

        let counts = count_documents_by_type_impl(dir.path().to_str().unwrap());
        assert_eq!(counts.get("product-description"), Some(&2u32));
        assert_eq!(counts.get("tech-design"), Some(&1u32));
    }

    #[test]
    fn test_count_documents_by_type_skips_no_frontmatter() {
        let dir = tempdir().unwrap();
        write_file_no_frontmatter(dir.path(), "bare.md");
        write_file_with_frontmatter(dir.path(), "typed.md", "tech-design");

        let counts = count_documents_by_type_impl(dir.path().to_str().unwrap());
        assert_eq!(counts.len(), 1);
        assert_eq!(counts.get("tech-design"), Some(&1u32));
    }

    #[test]
    fn test_count_documents_by_type_empty_workspace() {
        let dir = tempdir().unwrap();
        let counts = count_documents_by_type_impl(dir.path().to_str().unwrap());
        assert!(counts.is_empty());
    }

    #[test]
    fn test_count_documents_by_type_skips_non_md_files() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("file.txt"), "---\ntype: product-description\n---").unwrap();
        write_file_with_frontmatter(dir.path(), "doc.md", "tech-design");

        let counts = count_documents_by_type_impl(dir.path().to_str().unwrap());
        assert_eq!(counts.len(), 1);
        assert_eq!(counts.get("tech-design"), Some(&1u32));
    }

    #[test]
    fn test_count_documents_by_type_counts_nested_documents() {
        let dir = tempdir().unwrap();
        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        write_file_with_frontmatter(&subdir, "nested.md", "tech-design");
        write_file_with_frontmatter(dir.path(), "root.md", "tech-design");

        let counts = count_documents_by_type_impl(dir.path().to_str().unwrap());
        assert_eq!(counts.get("tech-design"), Some(&2u32));
    }

    #[test]
    fn test_count_documents_by_type_skips_node_modules() {
        let dir = tempdir().unwrap();
        let node_modules = dir.path().join("node_modules");
        fs::create_dir(&node_modules).unwrap();
        write_file_with_frontmatter(&node_modules, "ignored.md", "product-description");
        write_file_with_frontmatter(dir.path(), "counted.md", "tech-design");

        let counts = count_documents_by_type_impl(dir.path().to_str().unwrap());
        assert_eq!(counts.len(), 1);
        assert_eq!(counts.get("tech-design"), Some(&1u32));
        assert!(counts.get("product-description").is_none());
    }

    #[test]
    fn test_count_documents_by_type_type_counts_with_ties() {
        let dir = tempdir().unwrap();
        write_file_with_frontmatter(dir.path(), "a.md", "alpha");
        write_file_with_frontmatter(dir.path(), "b.md", "beta");

        let counts = count_documents_by_type_impl(dir.path().to_str().unwrap());
        assert_eq!(counts.get("alpha"), Some(&1u32));
        assert_eq!(counts.get("beta"), Some(&1u32));
    }
}
