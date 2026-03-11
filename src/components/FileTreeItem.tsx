import { ChevronRight, Folder, FileText } from "lucide-react";
import type { FileNode } from "@/lib/fileTree";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFocused: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function displayName(name: string): string {
  return name.replace(/\.md$|\.markdown$/i, "");
}

export function FileTreeItem({
  node,
  depth,
  isExpanded,
  isSelected,
  isFocused,
  onToggle,
  onSelect,
}: FileTreeItemProps) {
  const paddingLeft = 12 + depth * 16;

  const handleClick = () => {
    if (node.is_dir) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const selectedStyles = isSelected
    ? "bg-(--color-bg-hover) text-(--color-text-primary)"
    : "";

  const focusStyles = isFocused
    ? "outline-2 outline-(--color-accent) outline-offset-2"
    : "";

  return (
    <button
      className={`flex items-center gap-1.5 w-full text-left h-(--height-nav-item) px-[var(--space-2)] text-(--font-size-ui-lg) rounded-(--radius-md) cursor-pointer text-(--color-text-secondary) hover:bg-(--color-bg-subtle) hover:text-(--color-text-primary) transition-colors duration-(--duration-fast) ${selectedStyles} ${focusStyles}`}
      style={{ paddingLeft }}
      onClick={handleClick}
      role="treeitem"
      aria-expanded={node.is_dir ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
      data-path={node.path}
    >
      {node.is_dir ? (
        <>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          <Folder className="w-4 h-4" />
          <span className="font-medium truncate">
            {node.name}
          </span>
        </>
      ) : (
        <>
          <span className="w-4" />
          <FileText className="w-4 h-4" />
          <span className="truncate">
            {displayName(node.name)}
          </span>
        </>
      )}
    </button>
  );
}
