import yaml from "js-yaml";

function dirname(filePath: string): string {
  const lastSlash = filePath.lastIndexOf("/");
  return lastSlash === -1 ? "." : filePath.substring(0, lastSlash);
}

function resolvePath(base: string, relative: string): string {
  const parts = base.split("/").filter(Boolean);
  const relParts = relative.split("/").filter(Boolean);
  for (const part of relParts) {
    if (part === "..") {
      parts.pop();
    } else if (part !== ".") {
      parts.push(part);
    }
  }
  return "/" + parts.join("/");
}

export interface ParsedDocument {
  frontmatter: Record<string, unknown> | null;
  content: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)(?:\r?\n)?---(?:\r?\n|$)/;

export function parseDocument(raw: string): ParsedDocument {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: null, content: raw };
  }

  const yamlStr = match[1].trim();
  if (!yamlStr) {
    return { frontmatter: null, content: raw.slice(match[0].length) };
  }

  try {
    const data = yaml.load(yamlStr);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return {
        frontmatter: data as Record<string, unknown>,
        content: raw.slice(match[0].length),
      };
    }
    return { frontmatter: null, content: raw.slice(match[0].length) };
  } catch {
    return { frontmatter: null, content: raw };
  }
}

export function resolveInternalLink(
  href: string,
  currentFilePath: string,
  _workspacePath: string
): string | null {
  // External links
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return null;
  }

  // Anchor-only links
  if (href.startsWith("#")) {
    return null;
  }

  // Resolve relative path from current file's directory
  const currentDir = dirname(currentFilePath);
  return resolvePath(currentDir, href);
}
