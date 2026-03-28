/**
 * Estimates reading time for a markdown string.
 * Strips markdown syntax before counting words.
 * Assumes 200 words per minute.
 * Returns null for null/empty input.
 */
export function computeReadingTime(markdown: string | null): number | null {
  if (!markdown || !markdown.trim()) return null;

  const stripped = markdown
    // Strip code fences (``` blocks)
    .replace(/```[\s\S]*?```/g, "")
    // Strip inline code
    .replace(/`[^`]*`/g, "")
    // Strip markdown links — keep link text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Strip headings markers
    .replace(/^#{1,6}\s+/gm, "")
    // Strip bold/italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Strip horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Strip blockquote markers
    .replace(/^>\s+/gm, "")
    // Strip image syntax
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  const words = stripped.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  return Math.ceil(words.length / 200);
}
