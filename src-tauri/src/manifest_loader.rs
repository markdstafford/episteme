use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModeScope {
    Document,
    Workspace,
    Any,
}

impl Default for ModeScope {
    fn default() -> Self { ModeScope::Document }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModeManifest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub scope: ModeScope,
    #[serde(default)]
    pub tools: Vec<String>,
    pub system_prompt: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocTypeManifest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub template: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProcessManifest {
    pub id: String,
    #[serde(default)]
    pub modes: Vec<String>,
    #[serde(default)]
    pub doc_types: Vec<String>,
    #[serde(default)]
    pub stages: Vec<String>,
    pub instructions: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct LoadedManifests {
    pub modes: Vec<ModeManifest>,
    pub doc_types: Vec<DocTypeManifest>,
    pub processes: Vec<ProcessManifest>,
}

// --- Private frontmatter structs ---

#[derive(Deserialize)]
struct ModeFm {
    name: String,
    description: Option<String>,
    #[serde(default)]
    scope: ModeScope,
    #[serde(default)]
    tools: Vec<String>,
}

#[derive(Deserialize)]
struct DocTypeFm {
    name: String,
    description: Option<String>,
}

#[derive(Deserialize)]
struct ProcessFm {
    #[serde(default)]
    modes: Vec<String>,
    #[serde(default)]
    doc_types: Vec<String>,
    #[serde(default)]
    stages: Vec<String>,
}

// --- Helpers ---

/// Split "---\nFRONTMATTER\n---\nBODY" into (frontmatter_str, body_str).
fn split_frontmatter(content: &str) -> Option<(&str, &str)> {
    let s = content.trim_start();
    if !s.starts_with("---") { return None; }
    let after_open = s.get(3..)?.trim_start_matches('\n');
    let close_pos = after_open.find("\n---")?;
    let fm = &after_open[..close_pos];
    let rest = &after_open[close_pos + 4..];
    let body = if rest.starts_with('\n') { &rest[1..] } else { rest };
    Some((fm, body))
}

fn stem(path: &std::path::Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default()
}

// --- Public loader ---

pub fn load_manifests(workspace_path: &str) -> Result<LoadedManifests, String> {
    let episteme = std::path::Path::new(workspace_path).join(".episteme");
    if !episteme.is_dir() {
        return Ok(LoadedManifests::default());
    }
    Ok(LoadedManifests {
        modes:     load_modes(&episteme),
        doc_types: load_doc_types(&episteme),
        processes: load_processes(&episteme),
    })
}

fn load_modes(episteme: &std::path::Path) -> Vec<ModeManifest> {
    let dir = episteme.join("modes");
    if !dir.is_dir() { return vec![]; }
    let mut out = vec![];
    for entry in std::fs::read_dir(&dir).into_iter().flatten().flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |e| e == "md") {
            let id = stem(&path);
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Some((fm, body)) = split_frontmatter(&content) {
                    match serde_yaml::from_str::<ModeFm>(fm) {
                        Ok(f) => out.push(ModeManifest {
                            id, name: f.name, description: f.description,
                            scope: f.scope, tools: f.tools,
                            system_prompt: body.to_string(),
                        }),
                        Err(e) => log::warn!("Skipping mode {}: {}", path.display(), e),
                    }
                } else {
                    log::warn!("Mode {} has no frontmatter, skipping", path.display());
                }
            }
        }
    }
    out.sort_by(|a, b| a.id.cmp(&b.id));
    out
}

fn load_doc_types(episteme: &std::path::Path) -> Vec<DocTypeManifest> {
    let dir = episteme.join("doc-types");
    if !dir.is_dir() { return vec![]; }
    let mut out = vec![];
    for entry in std::fs::read_dir(&dir).into_iter().flatten().flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |e| e == "md") {
            let id = stem(&path);
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Some((fm, body)) = split_frontmatter(&content) {
                    match serde_yaml::from_str::<DocTypeFm>(fm) {
                        Ok(f) => out.push(DocTypeManifest {
                            id, name: f.name, description: f.description,
                            template: body.to_string(),
                        }),
                        Err(e) => log::warn!("Skipping doc-type {}: {}", path.display(), e),
                    }
                }
            }
        }
    }
    out.sort_by(|a, b| a.id.cmp(&b.id));
    out
}

fn load_processes(episteme: &std::path::Path) -> Vec<ProcessManifest> {
    let dir = episteme.join("processes");
    if !dir.is_dir() { return vec![]; }
    let mut out = vec![];
    for entry in std::fs::read_dir(&dir).into_iter().flatten().flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |e| e == "md") {
            let id = stem(&path);
            if let Some(p) = parse_process_file(&path, &id) { out.push(p); }
        } else if path.is_dir() {
            let id = entry.file_name().to_string_lossy().to_string();
            let process_md = path.join("process.md");
            if process_md.exists() {
                if let Some(p) = parse_process_file(&process_md, &id) { out.push(p); }
            }
        }
    }
    out.sort_by(|a, b| a.id.cmp(&b.id));
    out
}

fn parse_process_file(path: &std::path::Path, id: &str) -> Option<ProcessManifest> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| log::warn!("Cannot read process {}: {}", path.display(), e))
        .ok()?;
    let (fm, body) = split_frontmatter(&content)?;
    match serde_yaml::from_str::<ProcessFm>(fm) {
        Ok(f) => Some(ProcessManifest {
            id: id.to_string(), modes: f.modes, doc_types: f.doc_types,
            stages: f.stages, instructions: body.to_string(),
        }),
        Err(e) => { log::warn!("Skipping process {}: {}", path.display(), e); None }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn write(dir: &std::path::Path, path: &str, content: &str) {
        let full = dir.join(path);
        fs::create_dir_all(full.parent().unwrap()).unwrap();
        fs::write(full, content).unwrap();
    }

    #[test]
    fn test_missing_episteme_returns_empty() {
        let dir = tempdir().unwrap();
        let result = load_manifests(dir.path().to_str().unwrap()).unwrap();
        assert!(result.modes.is_empty());
        assert!(result.doc_types.is_empty());
        assert!(result.processes.is_empty());
    }

    #[test]
    fn test_parses_mode_manifest() {
        let dir = tempdir().unwrap();
        write(dir.path(), ".episteme/modes/draft.md",
            "---\nname: Draft\nscope: document\ntools:\n  - read_file\n  - write_file\n---\nYou are drafting.\n");
        let result = load_manifests(dir.path().to_str().unwrap()).unwrap();
        assert_eq!(result.modes.len(), 1);
        let m = &result.modes[0];
        assert_eq!(m.id, "draft");
        assert_eq!(m.name, "Draft");
        assert_eq!(m.scope, ModeScope::Document);
        assert_eq!(m.tools, vec!["read_file", "write_file"]);
        assert_eq!(m.system_prompt, "You are drafting.\n");
    }

    #[test]
    fn test_parses_doc_type_manifest() {
        let dir = tempdir().unwrap();
        write(dir.path(), ".episteme/doc-types/product-description.md",
            "---\nname: Product description\n---\n## Template\n\n### What\n");
        let result = load_manifests(dir.path().to_str().unwrap()).unwrap();
        assert_eq!(result.doc_types.len(), 1);
        let d = &result.doc_types[0];
        assert_eq!(d.id, "product-description");
        assert_eq!(d.name, "Product description");
        assert!(d.template.contains("## Template"));
    }

    #[test]
    fn test_parses_process_manifest_file_form() {
        let dir = tempdir().unwrap();
        write(dir.path(), ".episteme/processes/draft+product-description.md",
            "---\nmodes:\n  - draft\ndoc_types:\n  - product-description\n---\nDraft a PD like this.\n");
        let result = load_manifests(dir.path().to_str().unwrap()).unwrap();
        assert_eq!(result.processes.len(), 1);
        let p = &result.processes[0];
        assert_eq!(p.id, "draft+product-description");
        assert_eq!(p.modes, vec!["draft"]);
        assert_eq!(p.doc_types, vec!["product-description"]);
        assert!(p.instructions.contains("Draft a PD like this."));
    }

    #[test]
    fn test_parses_process_manifest_directory_form() {
        let dir = tempdir().unwrap();
        write(dir.path(), ".episteme/processes/draft+tech-design/process.md",
            "---\nmodes:\n  - draft\ndoc_types:\n  - tech-design\nstages:\n  - stages/discovery.md\n---\nMain instructions.\n");
        let result = load_manifests(dir.path().to_str().unwrap()).unwrap();
        assert_eq!(result.processes.len(), 1);
        let p = &result.processes[0];
        assert_eq!(p.id, "draft+tech-design");
        assert_eq!(p.stages, vec!["stages/discovery.md"]);
        assert!(p.instructions.contains("Main instructions."));
    }

    #[test]
    fn test_unknown_frontmatter_fields_ignored() {
        let dir = tempdir().unwrap();
        write(dir.path(), ".episteme/modes/custom.md",
            "---\nname: Custom\nunknown_field: some_value\nfuture_field: 42\n---\nPrompt here.\n");
        let result = load_manifests(dir.path().to_str().unwrap()).unwrap();
        assert_eq!(result.modes.len(), 1);
        assert_eq!(result.modes[0].id, "custom");
    }

    #[test]
    fn test_malformed_frontmatter_skipped_with_warning() {
        let dir = tempdir().unwrap();
        // Missing required `name` field
        write(dir.path(), ".episteme/modes/bad.md",
            "---\nscope: document\n---\nPrompt.\n");
        // Should not error — just skip the bad file
        let result = load_manifests(dir.path().to_str().unwrap()).unwrap();
        assert!(result.modes.is_empty());
    }
}
