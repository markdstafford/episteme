use crate::manifest_loader::{LoadedManifests, ModeManifest, ModeScope};
use crate::ManifestState;
use tauri::State;

pub fn built_in_modes() -> Vec<ModeManifest> {
    vec![
        ModeManifest {
            id: "draft".to_string(),
            name: "Draft".to_string(),
            description: Some("Help draft and revise this document".to_string()),
            scope: ModeScope::Document,
            tools: vec!["read_file".to_string(), "write_file".to_string()],
            system_prompt: "You are helping the user draft a document.\n\
                Use the write_file tool to write content directly to the document.\n\
                Keep your chat messages concise — ask focused questions and give brief status updates.\n\
                Do NOT include document content in your chat messages; write it to the document using write_file.\n\
                If process guidance is provided below, follow it to guide the user through each section.\n\
                After each write, the user sees the updated document in their viewer.".to_string(),
        },
        ModeManifest {
            id: "review".to_string(),
            name: "Review".to_string(),
            description: Some("Read and surface issues without modifying the document".to_string()),
            scope: ModeScope::Document,
            tools: vec!["read_file".to_string()],
            system_prompt: "You are reviewing this document.\n\
                Surface issues with clarity, structure, and completeness.\n\
                Suggest improvements but do not rewrite or modify the document directly.\n\
                Be direct and specific about what needs to change and why.\n\
                Do not use write_file — your role is to read and advise only.".to_string(),
        },
        ModeManifest {
            id: "ask".to_string(),
            name: "Ask".to_string(),
            description: Some("Answer questions drawing on all documents in the workspace".to_string()),
            scope: ModeScope::Workspace,
            tools: vec!["read_file".to_string(), "list_files".to_string(), "search_workspace".to_string()],
            system_prompt: "You are answering questions about the documents in this workspace.\n\
                Use list_files to discover what documents exist.\n\
                Use search_workspace to find documents relevant to the user's question.\n\
                Use read_file to read specific documents before answering.\n\
                Always cite the source document by file path when referencing content.\n\
                If you cannot find a relevant document, say so clearly.".to_string(),
        },
    ]
}

#[tauri::command]
pub async fn load_manifests(
    workspace_path: String,
    manifest_state: State<'_, ManifestState>,
) -> Result<LoadedManifests, String> {
    let workspace_manifests = crate::manifest_loader::load_manifests(&workspace_path)?;

    // Merge: workspace modes override built-ins on ID collision
    let mut modes = built_in_modes();
    for wm in workspace_manifests.modes {
        if let Some(pos) = modes.iter().position(|b| b.id == wm.id) {
            modes[pos] = wm;
        } else {
            modes.push(wm);
        }
    }
    modes.sort_by(|a, b| a.id.cmp(&b.id));

    let result = LoadedManifests {
        modes,
        doc_types: workspace_manifests.doc_types,
        processes: workspace_manifests.processes,
    };

    log::info!(
        "Manifests loaded: {} modes, {} doc types, {} processes",
        result.modes.len(), result.doc_types.len(), result.processes.len()
    );

    *manifest_state.0.lock().unwrap() = Some(result.clone());
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn run_load(workspace_path: &str) -> LoadedManifests {
        // Test the merge logic directly without Tauri State
        let workspace_manifests = crate::manifest_loader::load_manifests(workspace_path).unwrap();
        let mut modes = built_in_modes();
        for wm in workspace_manifests.modes {
            if let Some(pos) = modes.iter().position(|b| b.id == wm.id) {
                modes[pos] = wm;
            } else {
                modes.push(wm);
            }
        }
        modes.sort_by(|a, b| a.id.cmp(&b.id));
        LoadedManifests {
            modes,
            doc_types: workspace_manifests.doc_types,
            processes: workspace_manifests.processes,
        }
    }

    #[test]
    fn test_built_in_modes_present_without_episteme() {
        let dir = tempdir().unwrap();
        let result = run_load(dir.path().to_str().unwrap());
        assert!(result.modes.iter().any(|m| m.id == "draft"), "draft mode should be present");
        assert!(result.modes.iter().any(|m| m.id == "review"), "review mode should be present");
        assert!(result.modes.iter().any(|m| m.id == "ask"), "ask mode should be present");
    }

    #[test]
    fn test_workspace_mode_overrides_built_in() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join(".episteme/modes")).unwrap();
        fs::write(
            dir.path().join(".episteme/modes/draft.md"),
            "---\nname: Custom Draft\n---\nCustom prompt.\n"
        ).unwrap();
        let result = run_load(dir.path().to_str().unwrap());
        let draft = result.modes.iter().find(|m| m.id == "draft").unwrap();
        assert_eq!(draft.name, "Custom Draft");
    }

    #[test]
    fn test_workspace_mode_added_alongside_built_ins() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join(".episteme/modes")).unwrap();
        fs::write(
            dir.path().join(".episteme/modes/custom.md"),
            "---\nname: Custom\n---\nCustom prompt.\n"
        ).unwrap();
        let result = run_load(dir.path().to_str().unwrap());
        assert_eq!(result.modes.len(), 4); // 3 built-ins + 1 custom
    }

    #[test]
    fn test_modes_sorted_alphabetically() {
        let dir = tempdir().unwrap();
        let result = run_load(dir.path().to_str().unwrap());
        let ids: Vec<&str> = result.modes.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(ids, vec!["ask", "draft", "review"]);
    }
}
