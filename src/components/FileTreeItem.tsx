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
    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
    : "";

  const focusStyles = isFocused ? "ring-2 ring-blue-500 ring-inset" : "";

  return (
    <button
      className={`flex items-center gap-1.5 w-full text-left px-3 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedStyles} ${focusStyles}`}
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
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          <Folder className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
            {node.name}
          </span>
        </>
      ) : (
        <>
          <span className="w-4" />
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400 truncate">
            {displayName(node.name)}
          </span>
        </>
      )}
    </button>
  );
}
