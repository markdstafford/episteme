import { useCallback, useRef, KeyboardEvent } from "react";
import { useFileTreeStore } from "@/stores/fileTree";
import { FileTreeItem } from "@/components/FileTreeItem";
import type { FileNode } from "@/lib/fileTree";

function getVisiblePaths(
  nodes: FileNode[],
  expandedPaths: Set<string>
): string[] {
  const paths: string[] = [];
  function walk(items: FileNode[]) {
    for (const node of items) {
      paths.push(node.path);
      if (node.is_dir && expandedPaths.has(node.path) && node.children) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return paths;
}

function findParentPath(
  nodes: FileNode[],
  targetPath: string
): string | null {
  function walk(items: FileNode[], parent: string | null): string | null {
    for (const node of items) {
      if (node.path === targetPath) return parent;
      if (node.is_dir && node.children) {
        const result = walk(node.children, node.path);
        if (result !== null) return result;
      }
    }
    return null;
  }
  return walk(nodes, null);
}

function findNode(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.is_dir && node.children) {
      const result = findNode(node.children, path);
      if (result) return result;
    }
  }
  return null;
}

export function FileTree() {
  const nodes = useFileTreeStore((s) => s.nodes);
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const selectedFilePath = useFileTreeStore((s) => s.selectedFilePath);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const selectFile = useFileTreeStore((s) => s.selectFile);
  const focusedPathRef = useRef<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const setFocusedPath = useCallback(
    (path: string) => {
      focusedPathRef.current = path;
      const el = treeRef.current?.querySelector(
        `[data-path="${CSS.escape(path)}"]`
      ) as HTMLElement | null;
      el?.focus();
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const visiblePaths = getVisiblePaths(nodes, expandedPaths);
      const currentPath = focusedPathRef.current;
      const currentIndex = currentPath
        ? visiblePaths.indexOf(currentPath)
        : -1;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = visiblePaths[currentIndex + 1];
          if (next) setFocusedPath(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = visiblePaths[currentIndex - 1];
          if (prev) setFocusedPath(prev);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (!currentPath) break;
          const node = findNode(nodes, currentPath);
          if (node?.is_dir) {
            if (!expandedPaths.has(currentPath)) {
              toggleExpanded(currentPath);
            } else if (node.children?.length) {
              setFocusedPath(node.children[0].path);
            }
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (!currentPath) break;
          const n = findNode(nodes, currentPath);
          if (n?.is_dir && expandedPaths.has(currentPath)) {
            toggleExpanded(currentPath);
          } else {
            const parent = findParentPath(nodes, currentPath);
            if (parent) setFocusedPath(parent);
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (!currentPath) break;
          const enterNode = findNode(nodes, currentPath);
          if (enterNode?.is_dir) {
            toggleExpanded(currentPath);
          } else if (enterNode) {
            selectFile(currentPath);
          }
          break;
        }
      }
    },
    [nodes, expandedPaths, toggleExpanded, selectFile, setFocusedPath]
  );

  const handleFocus = useCallback(
    (path: string) => {
      focusedPathRef.current = path;
    },
    []
  );

  if (nodes.length === 0) {
    return (
      <p className="text-(--color-text-tertiary) text-(--font-size-ui-sm) text-center py-8">
        No markdown files found
      </p>
    );
  }

  function renderNodes(items: FileNode[], depth: number) {
    return items.map((node) => (
      <div key={node.path}>
        <FileTreeItem
          node={node}
          depth={depth}
          isExpanded={expandedPaths.has(node.path)}
          isSelected={selectedFilePath === node.path}
          isFocused={focusedPathRef.current === node.path}
          onToggle={toggleExpanded}
          onSelect={selectFile}
        />
        {node.is_dir &&
          expandedPaths.has(node.path) &&
          node.children &&
          renderNodes(node.children, depth + 1)}
      </div>
    ));
  }

  return (
    <div
      ref={treeRef}
      role="tree"
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        const path = (e.target as HTMLElement).dataset?.path;
        if (path) handleFocus(path);
      }}
    >
      {renderNodes(nodes, 0)}
    </div>
  );
}
