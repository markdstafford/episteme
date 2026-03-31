import type { Node as PmNode } from "@tiptap/pm/model";

// ── Pure string helpers ──────────────────────────────────────────────────────

/**
 * Count non-overlapping occurrences of `pattern` in `text`.
 *
 * Operates on Unicode codepoints ([...str]) so that surrogate pairs (e.g.
 * emoji) count as one unit, matching Rust's `.chars().count()` semantics.
 */
export function countNonOverlapping(text: string, pattern: string): number {
  if (!pattern) return 0;
  const textCps = [...text];
  const patCps = [...pattern];
  let count = 0;
  let i = 0;
  while (i <= textCps.length - patCps.length) {
    if (patCps.every((c, j) => textCps[i + j] === c)) {
      count++;
      i += patCps.length;
    } else {
      i++;
    }
  }
  return count;
}

/**
 * Return the start index (in codepoints) of the nth (0-based) non-overlapping
 * occurrence of `pattern` in `text`. Returns -1 if fewer than n+1 occurrences
 * exist.
 *
 * Operates on Unicode codepoints ([...str]) so that surrogate pairs (e.g.
 * emoji) count as one unit, matching Rust's `.chars().count()` semantics.
 */
export function findNthOccurrence(
  text: string,
  pattern: string,
  n: number,
): number {
  if (!pattern) return -1;
  const textCps = [...text];
  const patCps = [...pattern];
  let found = 0;
  let i = 0;
  while (i <= textCps.length - patCps.length) {
    if (patCps.every((c, j) => textCps[i + j] === c)) {
      if (found === n) return i;
      found++;
      i += patCps.length;
    } else {
      i++;
    }
  }
  return -1;
}

/**
 * Return a version of `markdown` where the URL portions of links and images
 * are replaced with space characters of the same length. Character offsets
 * are preserved. This prevents URL text from matching `quoted_text` searches.
 *
 * Links: [text](URL) → the URL is replaced with spaces
 * Images: ![alt](URL) → the URL is replaced with spaces
 */
export function stripHiddenMarkdownText(markdown: string): string {
  return markdown.replace(
    /(!?\[[^\]]*\])\(([^)]*)\)/g,
    (_match, bracket, url) => bracket + "(" + " ".repeat(url.length) + ")",
  );
}

// ── ProseMirror helpers ──────────────────────────────────────────────────────

/**
 * Convert a plain-text character offset (counting only text-node characters,
 * i.e. the same index space as `doc.textContent`) to a ProseMirror absolute
 * position.
 */
export function textOffsetToPmPos(doc: PmNode, targetOffset: number): number {
  if (targetOffset === 0) return 1; // position 1 = start of content in first block node
  let counted = 0;
  let result = 1; // fallback: start of first block's content (position 1 in standard ProseMirror docs)
  let found = false;
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (found) return false;
    if (node.isText && node.text) {
      const len = node.text.length;
      if (counted + len > targetOffset) {
        // targetOffset falls inside this text node
        result = pos + (targetOffset - counted);
        found = true;
        return false;
      }
      counted += len;
      if (counted === targetOffset) {
        // targetOffset falls at a node boundary; record the position after this
        // text node and keep iterating so the next text node's start can refine it
        result = pos + len;
      }
    }
    return true;
  });
  return result;
}

// ── Coordinate conversions ───────────────────────────────────────────────────

/**
 * Convert a ProseMirror selection start position to markdown character offsets.
 *
 * Uses occurrence counting to handle documents where `quotedText` appears
 * multiple times: finds how many times it appears before `pmFrom` in the
 * rendered plain text, then locates the same occurrence in the markdown source.
 *
 * Throws if the quoted text cannot be located in the markdown.
 */
export function pmPosToMarkdownOffset(
  pmFrom: number,
  doc: PmNode,
  markdownContent: string,
  quotedText: string,
): { from: number; to: number } {
  const textBefore = doc.textBetween(0, pmFrom, "");
  const n = countNonOverlapping(textBefore, quotedText);
  const strippedMarkdown = stripHiddenMarkdownText(markdownContent);
  const markdownFrom = findNthOccurrence(strippedMarkdown, quotedText, n);
  if (markdownFrom === -1) {
    throw new Error(
      `pmPosToMarkdownOffset: could not find occurrence ${n} of "${quotedText}" in markdown`,
    );
  }
  return { from: markdownFrom, to: markdownFrom + quotedText.length };
}

/**
 * Convert markdown character offsets back to ProseMirror absolute positions
 * for use by the decoration plugin.
 *
 * Throws if the quoted text cannot be found in the rendered plain text.
 */
export function markdownOffsetToPmPos(
  markdownFrom: number,
  doc: PmNode,
  markdownContent: string,
  quotedText: string,
): { from: number; to: number } {
  const strippedMarkdown = stripHiddenMarkdownText(markdownContent);
  const prefix = strippedMarkdown.slice(0, markdownFrom);
  const n = countNonOverlapping(prefix, quotedText);
  const textContent = doc.textContent;
  const textFrom = findNthOccurrence(textContent, quotedText, n);
  if (textFrom === -1) {
    throw new Error(
      `markdownOffsetToPmPos: could not find occurrence ${n} of "${quotedText}" in textContent`,
    );
  }
  const pmFrom = textOffsetToPmPos(doc, textFrom);
  const pmTo = textOffsetToPmPos(doc, textFrom + quotedText.length);
  return { from: pmFrom, to: pmTo };
}
