import { describe, it, expect } from "vitest";
import { computeReadingTime } from "@/lib/readingTime";

describe("computeReadingTime", () => {
  it("returns null for null input", () => {
    expect(computeReadingTime(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(computeReadingTime("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(computeReadingTime("   \n\n  ")).toBeNull();
  });

  it("counts words in plain text", () => {
    // 200 words = 1 min
    const text = Array(200).fill("word").join(" ");
    expect(computeReadingTime(text)).toBe(1);
  });

  it("rounds up to the nearest minute", () => {
    // 201 words = 2 min (ceil)
    const text = Array(201).fill("word").join(" ");
    expect(computeReadingTime(text)).toBe(2);
  });

  it("returns 1 for very short text", () => {
    expect(computeReadingTime("Hello world")).toBe(1);
  });

  it("strips markdown headings", () => {
    const text = "# Heading\n## Subheading\nword";
    // Should count "Heading", "Subheading", "word" = 3 words, rounds up to 1
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips markdown bold and italic syntax", () => {
    const text = "**bold** and _italic_ text";
    // Should count "bold", "and", "italic", "text" = 4 words
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips code fences", () => {
    const text = "```\nconst x = 1;\n```\nsome words here";
    // Code fence content excluded, "some words here" = 3 words
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips inline code", () => {
    const text = "Use `const x = 1` in your code";
    // "Use", "in", "your", "code" = 4 words (inline code stripped)
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips markdown links, keeping link text", () => {
    const text = "[click here](https://example.com) for info";
    // "click", "here", "for", "info" = 4 words
    expect(computeReadingTime(text)).toBe(1);
  });
});
