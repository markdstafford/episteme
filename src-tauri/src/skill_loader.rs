use std::fs;
use std::path::PathBuf;

#[derive(Clone, serde::Serialize)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
}

pub fn load_skill(workspace_path: &str, skill_name: &str) -> Result<String, String> {
    // Validate no path traversal
    if skill_name.contains("..") || skill_name.starts_with('/') || skill_name.starts_with('\\') {
        return Err("Invalid skill name: path traversal not allowed".to_string());
    }

    let skill_dir: PathBuf = [workspace_path, ".claude", "skills", skill_name]
        .iter()
        .collect();
    let skill_md = skill_dir.join("SKILL.md");

    let content = fs::read_to_string(&skill_md)
        .map_err(|e| format!("Failed to read SKILL.md at {}: {}", skill_md.display(), e))?;

    let mut result = content;

    let references_dir = skill_dir.join("references");
    if references_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&references_dir) {
            let mut ref_files: Vec<_> = entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map_or(false, |ext| ext == "md")
                })
                .collect();
            ref_files.sort_by_key(|e| e.file_name());

            for entry in ref_files {
                let path = entry.path();
                let filename = path.file_name().unwrap().to_string_lossy().to_string();
                if let Ok(ref_content) = fs::read_to_string(&path) {
                    result.push_str(&format!("\n\n## Reference: {}\n\n{}", filename, ref_content));
                }
            }
        }
    }

    Ok(result)
}

pub fn list_skills(workspace_path: &str) -> Vec<SkillInfo> {
    let skills_dir: PathBuf = [workspace_path, ".claude", "skills"].iter().collect();

    if !skills_dir.is_dir() {
        return Vec::new();
    }

    let entries = match fs::read_dir(&skills_dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut skills = Vec::new();

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let skill_md = path.join("SKILL.md");
        if !skill_md.exists() {
            continue;
        }

        let dir_name = entry.file_name().to_string_lossy().to_string();

        let (name, description) = match fs::read_to_string(&skill_md) {
            Ok(content) => parse_frontmatter(&content, &dir_name),
            Err(_) => (dir_name, String::new()),
        };

        skills.push(SkillInfo { name, description });
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name));
    skills
}

fn parse_frontmatter(content: &str, fallback_name: &str) -> (String, String) {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return (fallback_name.to_string(), String::new());
    }

    // Find the closing ---
    let after_opening = &trimmed[3..];
    let closing = match after_opening.find("\n---") {
        Some(pos) => pos,
        None => return (fallback_name.to_string(), String::new()),
    };

    let frontmatter = &after_opening[..closing];

    let mut name = None;
    let mut description = None;

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(value) = line.strip_prefix("name:") {
            name = Some(value.trim().trim_matches('"').trim_matches('\'').to_string());
        } else if let Some(value) = line.strip_prefix("description:") {
            description = Some(value.trim().trim_matches('"').trim_matches('\'').to_string());
        }
    }

    (
        name.unwrap_or_else(|| fallback_name.to_string()),
        description.unwrap_or_default(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn create_skill(base: &std::path::Path, skill_name: &str, skill_md: &str) -> PathBuf {
        let skill_dir: PathBuf = [
            base.to_str().unwrap(),
            ".claude",
            "skills",
            skill_name,
        ]
        .iter()
        .collect();
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(skill_dir.join("SKILL.md"), skill_md).unwrap();
        skill_dir
    }

    #[test]
    fn test_load_skill_with_references() {
        let dir = tempdir().unwrap();
        let skill_dir = create_skill(dir.path(), "my-skill", "# My Skill\nSome content");

        let refs_dir = skill_dir.join("references");
        fs::create_dir_all(&refs_dir).unwrap();
        fs::write(refs_dir.join("api.md"), "API docs here").unwrap();
        fs::write(refs_dir.join("guide.md"), "Guide content").unwrap();

        let result = load_skill(dir.path().to_str().unwrap(), "my-skill").unwrap();

        assert!(result.starts_with("# My Skill\nSome content"));
        assert!(result.contains("## Reference: api.md"));
        assert!(result.contains("API docs here"));
        assert!(result.contains("## Reference: guide.md"));
        assert!(result.contains("Guide content"));
    }

    #[test]
    fn test_load_skill_without_references() {
        let dir = tempdir().unwrap();
        create_skill(dir.path(), "simple-skill", "# Simple\nJust content");

        let result = load_skill(dir.path().to_str().unwrap(), "simple-skill").unwrap();
        assert_eq!(result, "# Simple\nJust content");
    }

    #[test]
    fn test_load_skill_missing() {
        let dir = tempdir().unwrap();

        let result = load_skill(dir.path().to_str().unwrap(), "nonexistent");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to read SKILL.md"));
    }

    #[test]
    fn test_load_skill_path_traversal() {
        let dir = tempdir().unwrap();

        let result = load_skill(dir.path().to_str().unwrap(), "../etc/passwd");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("path traversal"));
    }

    #[test]
    fn test_list_skills_multiple() {
        let dir = tempdir().unwrap();

        create_skill(
            dir.path(),
            "alpha",
            "---\nname: Alpha Skill\ndescription: First skill\n---\n# Alpha",
        );
        create_skill(
            dir.path(),
            "beta",
            "---\nname: Beta Skill\ndescription: Second skill\n---\n# Beta",
        );

        let skills = list_skills(dir.path().to_str().unwrap());
        assert_eq!(skills.len(), 2);
        assert_eq!(skills[0].name, "Alpha Skill");
        assert_eq!(skills[0].description, "First skill");
        assert_eq!(skills[1].name, "Beta Skill");
        assert_eq!(skills[1].description, "Second skill");
    }

    #[test]
    fn test_list_skills_no_directory() {
        let dir = tempdir().unwrap();
        let skills = list_skills(dir.path().to_str().unwrap());
        assert!(skills.is_empty());
    }

    #[test]
    fn test_list_skills_missing_frontmatter() {
        let dir = tempdir().unwrap();
        create_skill(dir.path(), "bare-skill", "# No frontmatter here");

        let skills = list_skills(dir.path().to_str().unwrap());
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "bare-skill");
        assert_eq!(skills[0].description, "");
    }
}
