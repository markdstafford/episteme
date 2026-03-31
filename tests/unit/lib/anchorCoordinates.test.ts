import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  countNonOverlapping,
  findNthOccurrence,
  textOffsetToPmPos,
  pmPosToMarkdownOffset,
  markdownOffsetToPmPos,
  stripHiddenMarkdownText,
} from "@/lib/anchorCoordinates";

// Helper: create a minimal TipTap editor document from plain-text paragraphs.
function makeDoc(paragraphs: string[]) {
  const editor = new Editor({
    extensions: [StarterKit],
    content: {
      type: "doc",
      content: paragraphs.map((p) => ({
        type: "paragraph",
        content: p ? [{ type: "text", text: p }] : [],
      })),
    },
  });
  const doc = editor.state.doc;
  editor.destroy();
  return doc;
}

describe("countNonOverlapping", () => {
  it("returns 0 for no matches", () => {
    expect(countNonOverlapping("hello world", "xyz")).toBe(0);
  });

  it("counts a single match", () => {
    expect(countNonOverlapping("hello world", "world")).toBe(1);
  });

  it("counts multiple non-overlapping matches", () => {
    expect(countNonOverlapping("aaaa", "aa")).toBe(2);
  });

  it("counts matches in markdown with syntax characters", () => {
    expect(countNonOverlapping("# Hello\n\nSay Hello again", "Hello")).toBe(2);
    expect(countNonOverlapping("# Hello\n\n", "Hello")).toBe(1);
  });
});

describe("findNthOccurrence", () => {
  it("finds the 0th occurrence", () => {
    expect(findNthOccurrence("hello hello", "hello", 0)).toBe(0);
  });

  it("finds the 1st occurrence", () => {
    expect(findNthOccurrence("hello hello", "hello", 1)).toBe(6);
  });

  it("returns -1 when the nth occurrence does not exist", () => {
    expect(findNthOccurrence("hello", "hello", 1)).toBe(-1);
  });

  it("finds occurrence in markdown with surrounding syntax", () => {
    const md = "**Hello** and Hello";
    expect(findNthOccurrence(md, "Hello", 0)).toBe(2);
    expect(findNthOccurrence(md, "Hello", 1)).toBe(14);
  });

  it("returns -1 for empty pattern", () => {
    expect(findNthOccurrence("hello", "", 0)).toBe(-1);
  });
});

describe("textOffsetToPmPos", () => {
  it("maps offset 0 to position 1 (start of first paragraph content)", () => {
    const doc = makeDoc(["Hello World"]);
    expect(textOffsetToPmPos(doc, 0)).toBe(1);
  });

  it("maps offset 6 to position 7 (after 'Hello ')", () => {
    const doc = makeDoc(["Hello World"]);
    // Single-paragraph doc: 'H'=1, 'e'=2, 'l'=3, 'l'=4, 'o'=5, ' '=6, 'W'=7
    expect(textOffsetToPmPos(doc, 6)).toBe(7);
  });

  it("crosses paragraph boundaries correctly", () => {
    const doc = makeDoc(["Hello", "World"]);
    // textContent = "HelloWorld"
    // para1: open=0, H=1..5, close=6; para2: open=7, W=8..12, close=13
    expect(textOffsetToPmPos(doc, 0)).toBe(1); // 'H' at start of first paragraph
    expect(textOffsetToPmPos(doc, 5)).toBe(8); // 'W' at start of second paragraph
  });
});

describe("pmPosToMarkdownOffset + markdownOffsetToPmPos round-trip", () => {
  it("round-trips a selection in a plain paragraph", () => {
    const markdown = "Hello World";
    const doc = makeDoc(["Hello World"]);
    // ProseMirror position 7 is 'W' (H=1,e=2,l=3,l=4,o=5,' '=6,W=7)
    const mdOffset = pmPosToMarkdownOffset(7, doc, markdown, "World");
    expect(mdOffset.from).toBe(6);
    expect(mdOffset.to).toBe(11);
    // Convert back
    const pmOffset = markdownOffsetToPmPos(6, doc, markdown, "World");
    expect(pmOffset.from).toBe(7);
    expect(pmOffset.to).toBe(12);
  });

  it("handles markdown with bold syntax (** wrapping)", () => {
    // Markdown: "**Hello** World" — textContent is "Hello World" (bold stripped)
    // markdown offset of 'H' = 2 (after **), of 'W' = 11 (after "**Hello** ")
    const markdown = "**Hello** World";
    const doc = makeDoc(["Hello World"]);
    // pmPosToMarkdownOffset: pmFrom=1 ('H'), textBefore="", n=0
    const mdOffset = pmPosToMarkdownOffset(1, doc, markdown, "Hello");
    expect(mdOffset.from).toBe(2);
    expect(mdOffset.to).toBe(7);
    // markdownOffsetToPmPos: prefix="**", n=0, textFrom=0, pmFrom=1
    const pmOffset = markdownOffsetToPmPos(2, doc, markdown, "Hello");
    expect(pmOffset.from).toBe(1);
    expect(pmOffset.to).toBe(6);
  });

  it("disambiguates repeated text using occurrence counting", () => {
    // markdown: "# Hello\n\nSay Hello again"
    // textContent (two plain paragraphs): "HelloSay Hello again"
    const markdown = "# Hello\n\nSay Hello again";
    const doc = makeDoc(["Hello", "Say Hello again"]);

    // Locate the second "Hello" in textContent
    const textContent = doc.textContent; // "HelloSay Hello again"
    const secondHelloTextOffset = textContent.indexOf("Hello", 5); // 9
    const pmFromSecond = textOffsetToPmPos(doc, secondHelloTextOffset);

    const mdOffset = pmPosToMarkdownOffset(pmFromSecond, doc, markdown, "Hello");
    // Second occurrence of "Hello" in markdown is in "Say Hello again"
    const firstOcc = markdown.indexOf("Hello"); // 2 (in "# Hello")
    const secondOcc = markdown.indexOf("Hello", firstOcc + 5); // 13 (in "Say Hello again")
    expect(mdOffset.from).toBe(secondOcc);

    // Round-trip back
    const pmRoundTrip = markdownOffsetToPmPos(mdOffset.from, doc, markdown, "Hello");
    expect(pmRoundTrip.from).toBe(pmFromSecond);
  });
});

describe("stripHiddenMarkdownText", () => {
  it("replaces link URL with same-length spaces", () => {
    const md = "[click](https://example.com)";
    const stripped = stripHiddenMarkdownText(md);
    expect(stripped).toBe("[click](                   )");
    expect(stripped.length).toBe(md.length); // offsets preserved
  });

  it("replaces image URL with same-length spaces", () => {
    const md = "![alt](img.png)";
    const stripped = stripHiddenMarkdownText(md);
    expect(stripped).toBe("![alt](       )");
    expect(stripped.length).toBe(md.length);
  });

  it("does not modify text outside of URLs", () => {
    const md = "Hello [link](url) World";
    const stripped = stripHiddenMarkdownText(md);
    expect(stripped.startsWith("Hello [link](")).toBe(true);
    expect(stripped).toContain("World");
    expect(stripped.length).toBe(md.length);
  });

  it("preserves character positions — quotedText in URL is not findable", () => {
    const md = "[x](https://host/Hello) and say Hello.";
    const stripped = stripHiddenMarkdownText(md);
    // "Hello" in the URL is now spaces — only the visible one is findable
    expect(findNthOccurrence(stripped, "Hello", 0)).toBe(32); // visible Hello
    expect(findNthOccurrence(stripped, "Hello", 1)).toBe(-1); // only one visible
  });
});

describe("codepoint correctness (I19)", () => {
  it("countNonOverlapping counts in codepoints not UTF-16 units", () => {
    // "😀" is 2 UTF-16 units but 1 codepoint; "hello" after it starts at codepoint index 1
    expect(countNonOverlapping("😀hello", "hello")).toBe(1);
  });

  it("findNthOccurrence returns codepoint index not UTF-16 index", () => {
    // "😀" takes 1 codepoint; "hello" starts at codepoint 1 (not UTF-16 index 2)
    expect(findNthOccurrence("😀hello", "hello", 0)).toBe(1);
  });

  it("round-trip works with emoji before anchor text", () => {
    // Verify the 0th occurrence counting still works for non-emoji text
    expect(findNthOccurrence("before hello after", "hello", 0)).toBe(7);
  });
});

describe("pmPosToMarkdownOffset — hidden URL handling", () => {
  it("ignores quotedText inside link URLs", () => {
    const markdown = "[x](https://host/Hello) and say Hello.";
    // TipTap renders [x](url) as just "x" in textContent
    const doc = makeDoc(["x and say Hello."]);
    // "Hello" in textContent is at offset 10 ("x and say " = 10 chars)
    const textOffset = doc.textContent.indexOf("Hello");
    const pmFrom = textOffsetToPmPos(doc, textOffset);
    const result = pmPosToMarkdownOffset(pmFrom, doc, markdown, "Hello");
    // Should find the visible "Hello" at index 32 in the markdown, not the URL one
    expect(result.from).toBe(32);
    expect(result.to).toBe(37);
  });
});
