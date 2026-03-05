import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FileTreeItem } from "@/components/FileTreeItem";

const folderNode = {
  name: "specs",
  path: "/docs/specs",
  is_dir: true,
  children: [],
};

const fileNode = {
  name: "README.md",
  path: "/docs/README.md",
  is_dir: false,
};

describe("FileTreeItem", () => {
  it("renders folder with name", () => {
    render(
      <FileTreeItem
        node={folderNode}
        depth={0}
        isExpanded={false}
        isSelected={false}
        isFocused={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("specs")).toBeInTheDocument();
  });

  it("renders file without .md extension", () => {
    render(
      <FileTreeItem
        node={fileNode}
        depth={0}
        isExpanded={false}
        isSelected={false}
        isFocused={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("README")).toBeInTheDocument();
  });

  it("calls onToggle when folder is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <FileTreeItem
        node={folderNode}
        depth={0}
        isExpanded={false}
        isSelected={false}
        isFocused={false}
        onToggle={onToggle}
        onSelect={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("treeitem"));
    expect(onToggle).toHaveBeenCalledWith("/docs/specs");
  });

  it("calls onSelect when file is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <FileTreeItem
        node={fileNode}
        depth={0}
        isExpanded={false}
        isSelected={false}
        isFocused={false}
        onToggle={vi.fn()}
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByRole("treeitem"));
    expect(onSelect).toHaveBeenCalledWith("/docs/README.md");
  });

  it("has aria-expanded for folders", () => {
    render(
      <FileTreeItem
        node={folderNode}
        depth={0}
        isExpanded={true}
        isSelected={false}
        isFocused={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByRole("treeitem")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("marks selected file with aria-selected", () => {
    render(
      <FileTreeItem
        node={fileNode}
        depth={0}
        isExpanded={false}
        isSelected={true}
        isFocused={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByRole("treeitem")).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
