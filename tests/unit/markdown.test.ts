import { describe, it, expect } from "vitest";
import { parseDocument, resolveInternalLink } from "@/lib/markdown";

describe("parseDocument", () => {
  it("extracts frontmatter and content", () => {
    const raw = `---
title: Test Doc
status: draft
---
# Hello World`;

    const result = parseDocument(raw);
    expect(result.frontmatter).toEqual({ title: "Test Doc", status: "draft" });
    expect(result.content.trim()).toBe("# Hello World");
  });

  it("returns null frontmatter when none present", () => {
    const result = parseDocument("# Just markdown");
    expect(result.frontmatter).toBeNull();
    expect(result.content.trim()).toBe("# Just markdown");
  });

  it("handles empty frontmatter", () => {
    const raw = `---
---
# Content`;

    const result = parseDocument(raw);
    expect(result.frontmatter).toBeNull();
    expect(result.content.trim()).toBe("# Content");
  });

  it("handles malformed frontmatter gracefully", () => {
    const raw = `---
invalid: [unclosed
---
# Content`;

    const result = parseDocument(raw);
    // Should not crash; either parses what it can or returns content as-is
    expect(result.content).toBeDefined();
  });

  it("handles empty file", () => {
    const result = parseDocument("");
    expect(result.frontmatter).toBeNull();
    expect(result.content).toBe("");
  });
});

describe("resolveInternalLink", () => {
  it("resolves same-directory link", () => {
    const result = resolveInternalLink(
      "other-doc.md",
      "/workspace/docs/current.md",
      "/workspace"
    );
    expect(result).toBe("/workspace/docs/other-doc.md");
  });

  it("resolves parent directory link", () => {
    const result = resolveInternalLink(
      "../other-doc.md",
      "/workspace/docs/specs/current.md",
      "/workspace"
    );
    expect(result).toBe("/workspace/docs/other-doc.md");
  });

  it("resolves nested directory link", () => {
    const result = resolveInternalLink(
      "sub/nested.md",
      "/workspace/docs/current.md",
      "/workspace"
    );
    expect(result).toBe("/workspace/docs/sub/nested.md");
  });

  it("returns null for http links", () => {
    const result = resolveInternalLink(
      "https://example.com",
      "/workspace/docs/current.md",
      "/workspace"
    );
    expect(result).toBeNull();
  });

  it("returns null for http links", () => {
    const result = resolveInternalLink(
      "http://example.com",
      "/workspace/docs/current.md",
      "/workspace"
    );
    expect(result).toBeNull();
  });

  it("returns null for anchor links", () => {
    const result = resolveInternalLink(
      "#section-heading",
      "/workspace/docs/current.md",
      "/workspace"
    );
    expect(result).toBeNull();
  });
});
