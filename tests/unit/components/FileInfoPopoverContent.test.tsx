import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FileInfoPopoverContent } from "@/components/FileInfoPopoverContent";

describe("FileInfoPopoverContent", () => {
  it("renders the Path section label", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    expect(screen.getByText("Path")).toBeInTheDocument();
  });

  it("renders the full file path", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    expect(screen.getByText("/workspace/docs/api-spec.md")).toBeInTheDocument();
  });

  it("file path element has user-select: text", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    const pathEl = screen.getByText("/workspace/docs/api-spec.md");
    expect(pathEl.style.userSelect).toBe("text");
  });

  it("does not render Frontmatter section when frontmatter is null", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    expect(screen.queryByText("Frontmatter")).not.toBeInTheDocument();
  });

  it("does not render Frontmatter section when frontmatter contains only doc_id", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ doc_id: "abc-123" }}
      />
    );
    expect(screen.queryByText("Frontmatter")).not.toBeInTheDocument();
  });

  it("renders Frontmatter section label when non-doc_id fields are present", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft", author: "alice" }}
      />
    );
    expect(screen.getByText("Frontmatter")).toBeInTheDocument();
  });

  it("renders all non-doc_id fields", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft", author: "alice", doc_id: "xyz" }}
      />
    );
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("author")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.queryByText("doc_id")).not.toBeInTheDocument();
  });

  it("renders array field values as comma-separated strings", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ tags: ["design", "api", "v2"] }}
      />
    );
    expect(screen.getByText("design, api, v2")).toBeInTheDocument();
  });

  it("renders a divider when both Path and Frontmatter sections are present", () => {
    const { container } = render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft" }}
      />
    );
    const dividers = Array.from(container.querySelectorAll("div")).filter(
      (el) => el.style.borderTop !== ""
    );
    expect(dividers.length).toBeGreaterThan(0);
  });

  it("does not crash when frontmatter is an empty object", () => {
    expect(() =>
      render(
        <FileInfoPopoverContent
          filePath="/workspace/docs/api-spec.md"
          frontmatter={{}}
        />
      )
    ).not.toThrow();
  });
});
