use uuid::Uuid;

/// Returns the doc_id from frontmatter, or None if absent/no frontmatter.
pub fn get_doc_id(content: &str) -> Option<String> {
    let fm = parse_frontmatter(content)?;
    for line in fm.lines() {
        if let Some(val) = line.strip_prefix("doc_id:") {
            let v = val.trim().trim_matches('"').trim_matches('\'');
            if !v.is_empty() {
                return Some(v.to_string());
            }
        }
    }
    None
}

/// Returns existing doc_id or writes a new UUID v4 to the file and returns it.
pub fn ensure_doc_id(file_path: &str) -> Result<String, String> {
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {e}"))?;

    if let Some(id) = get_doc_id(&content) {
        return Ok(id);
    }

    let new_id = Uuid::new_v4().to_string();
    let new_content = inject_doc_id(&content, &new_id)?;
    std::fs::write(file_path, &new_content)
        .map_err(|e| format!("Failed to write file: {e}"))?;
    Ok(new_id)
}

fn parse_frontmatter(content: &str) -> Option<String> {
    let rest = content.strip_prefix("---")?;
    let rest = rest.strip_prefix('\n').or_else(|| rest.strip_prefix("\r\n"))?;
    let end = rest.find("\n---").or_else(|| rest.find("\r\n---"))?;
    Some(rest[..end].to_string())
}

fn inject_doc_id(content: &str, id: &str) -> Result<String, String> {
    if content.starts_with("---\n") || content.starts_with("---\r\n") {
        let close = content
            .find("\n---\n")
            .or_else(|| content.find("\n---\r\n"))
            .ok_or("Malformed frontmatter: no closing ---")?;
        let new_line = format!("\ndoc_id: {id}");
        let mut result = content.to_string();
        result.insert_str(close, &new_line);
        Ok(result)
    } else {
        Ok(format!("---\ndoc_id: {id}\n---\n{content}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn write_tmp(content: &str) -> NamedTempFile {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(content.as_bytes()).unwrap();
        f
    }

    #[test]
    fn get_doc_id_returns_some_when_present() {
        let content = "---\ntitle: Test\ndoc_id: abc-123\n---\n# Body";
        assert_eq!(get_doc_id(content), Some("abc-123".to_string()));
    }

    #[test]
    fn get_doc_id_returns_none_when_absent() {
        let content = "---\ntitle: Test\n---\n# Body";
        assert_eq!(get_doc_id(content), None);
    }

    #[test]
    fn get_doc_id_returns_none_no_frontmatter() {
        let content = "# Just content";
        assert_eq!(get_doc_id(content), None);
    }

    #[test]
    fn ensure_doc_id_returns_existing_without_modifying() {
        let content = "---\ntitle: Test\ndoc_id: existing-id\n---\n# Body";
        let f = write_tmp(content);
        let id = ensure_doc_id(f.path().to_str().unwrap()).unwrap();
        assert_eq!(id, "existing-id");
        let after = std::fs::read_to_string(f.path()).unwrap();
        assert_eq!(after, content);
    }

    #[test]
    fn ensure_doc_id_writes_new_when_absent() {
        let content = "---\ntitle: Test\n---\n# Body";
        let f = write_tmp(content);
        let id = ensure_doc_id(f.path().to_str().unwrap()).unwrap();
        assert!(!id.is_empty());
        let after = std::fs::read_to_string(f.path()).unwrap();
        assert!(after.contains(&format!("doc_id: {id}")));
        assert!(after.contains("title: Test"));
    }

    #[test]
    fn ensure_doc_id_creates_frontmatter_if_none() {
        let content = "# Just content, no frontmatter";
        let f = write_tmp(content);
        let id = ensure_doc_id(f.path().to_str().unwrap()).unwrap();
        let after = std::fs::read_to_string(f.path()).unwrap();
        assert!(after.starts_with("---\n"));
        assert!(after.contains(&format!("doc_id: {id}")));
    }
}
