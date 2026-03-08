use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

fn is_markdown_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown")
}

fn build_tree(dir: &Path) -> Vec<FileNode> {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut folders: Vec<FileNode> = Vec::new();
    let mut files: Vec<FileNode> = Vec::new();

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();

        let path = entry.path();

        // Don't follow symlinks
        if path.is_symlink() {
            continue;
        }

        if path.is_dir() {
            let children = build_tree(&path);
            // Only include folders that contain markdown files (at any depth)
            if !children.is_empty() {
                folders.push(FileNode {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: true,
                    children: Some(children),
                });
            }
        } else if is_markdown_file(&name) {
            files.push(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: false,
                children: None,
            });
        }
    }

    // Sort alphabetically within each group
    folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Folders first, then files
    folders.extend(files);
    folders
}

#[tauri::command]
pub async fn list_files(folder_path: String) -> Result<Vec<FileNode>, String> {
    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", folder_path));
    }

    Ok(build_tree(path))
}

#[tauri::command]
pub async fn read_file(file_path: String, workspace_path: String) -> Result<String, String> {
    let canonical_workspace = fs::canonicalize(&workspace_path)
        .map_err(|e| format!("Invalid workspace path: {}", e))?;
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    let canonical_file = fs::canonicalize(&file_path)
        .map_err(|e| format!("Invalid file path: {}", e))?;

    if !canonical_file.starts_with(&canonical_workspace) {
        return Err("Access denied: file is outside workspace".to_string());
    }

    if !path.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }

    fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_build_tree_includes_dot_prefixed_folders() {
        let tmp = TempDir::new().unwrap();
        let dot_dir = tmp.path().join(".eng-docs");
        fs::create_dir(&dot_dir).unwrap();
        fs::write(dot_dir.join("readme.md"), "# Hello").unwrap();

        let tree = build_tree(tmp.path());

        let names: Vec<&str> = tree.iter().map(|n| n.name.as_str()).collect();
        assert!(
            names.contains(&".eng-docs"),
            "Expected .eng-docs in tree, got: {:?}",
            names
        );
    }
}
