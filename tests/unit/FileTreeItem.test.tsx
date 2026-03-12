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

  describe("context menu", () => {
    it("shows 'Open' item when right-clicking a file", async () => {
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
      await userEvent.pointer({
        target: screen.getByRole("treeitem"),
        keys: "[MouseRight]",
      });
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("calls onSelect when 'Open' is clicked in file context menu", async () => {
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
      await userEvent.pointer({
        target: screen.getByRole("treeitem"),
        keys: "[MouseRight]",
      });
      await userEvent.click(screen.getByText("Open"));
      expect(onSelect).toHaveBeenCalledWith("/docs/README.md");
    });

    it("shows 'Expand' item when right-clicking a collapsed directory", async () => {
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
      await userEvent.pointer({
        target: screen.getByRole("treeitem"),
        keys: "[MouseRight]",
      });
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByText("Expand")).toBeInTheDocument();
    });

    it("shows 'Collapse' item when right-clicking an expanded directory", async () => {
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
      await userEvent.pointer({
        target: screen.getByRole("treeitem"),
        keys: "[MouseRight]",
      });
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByText("Collapse")).toBeInTheDocument();
    });

    it("calls onToggle when directory context menu action is clicked", async () => {
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
      await userEvent.pointer({
        target: screen.getByRole("treeitem"),
        keys: "[MouseRight]",
      });
      await userEvent.click(screen.getByText("Expand"));
      expect(onToggle).toHaveBeenCalledWith("/docs/specs");
    });

    it("shows a separator and disabled 'Rename' item in context menu", async () => {
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
      await userEvent.pointer({
        target: screen.getByRole("treeitem"),
        keys: "[MouseRight]",
      });
      expect(screen.getByRole("separator")).toBeInTheDocument();
      expect(screen.getByText("Rename")).toBeInTheDocument();
    });

    it("left-click behavior is unchanged after wrapping with context menu", async () => {
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
  });
});
