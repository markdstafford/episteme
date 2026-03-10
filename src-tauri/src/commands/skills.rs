use crate::skill_loader::{self, SkillInfo};

#[tauri::command]
pub async fn list_skills(workspace_path: String) -> Vec<SkillInfo> {
    skill_loader::list_skills(&workspace_path)
}
