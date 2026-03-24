import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Folder, FileText } from "lucide-react";
import type { FileNode } from "@/lib/fileTree";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/ContextMenu";
import { PreviewPopover, type PreviewPopoverHandle } from '@/components/PreviewPopover'

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFocused: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  workspacePath: string;
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
  workspacePath,
}: FileTreeItemProps) {
  // --space-3 (12px) base + --space-4 (16px) per depth level
  const paddingLeft = 12 + depth * 16;

  const [previewOpen, setPreviewOpen] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMouseInPopoverRef = useRef(false)
  const popoverRef = useRef<PreviewPopoverHandle | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setPreviewOpen(false), 400)
  }

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const isPreviewable = !node.is_dir && /\.md$/i.test(node.name)

  const handleClick = () => {
    setPreviewOpen(false)
    if (node.is_dir) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const selectedStyles = isSelected
    ? "bg-(--color-bg-hover) text-(--color-text-primary)"
    : "";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={buttonRef}
          className={`group flex items-center gap-2 w-full text-left h-(--height-nav-item) px-[var(--space-2)] text-[length:var(--font-size-ui-lg)] rounded-(--radius-md) cursor-pointer text-(--color-text-secondary) hover:bg-(--color-bg-subtle) hover:text-(--color-text-primary) transition-colors duration-(--duration-fast) ease-(--ease-default) focus-ring ${selectedStyles}`}
          style={{ paddingLeft }}
          onClick={handleClick}
          onMouseEnter={() => {
            if (!isPreviewable) return
            cancelClose()
            if (!previewOpen) {
              hoverTimerRef.current = setTimeout(() => setPreviewOpen(true), 400)
            }
          }}
          onMouseLeave={() => {
            if (hoverTimerRef.current) {
              clearTimeout(hoverTimerRef.current)
              hoverTimerRef.current = null
            }
            scheduleClose()
          }}
          onKeyDown={(e) => {
            if (e.key === ' ' && isPreviewable) {
              e.preventDefault()
              setPreviewOpen(true)
            }
            if (e.key === 'ArrowRight' && previewOpen) {
              e.preventDefault()
              e.stopPropagation() // Prevent FileTree's tree-level handler from running
              // requestAnimationFrame ensures the Radix portal has committed to the DOM
              requestAnimationFrame(() => popoverRef.current?.focusScroll())
            }
            if (e.key === 'Escape') {
              setPreviewOpen(false)
            }
          }}
          role="treeitem"
          aria-expanded={node.is_dir ? isExpanded : undefined}
          aria-selected={isSelected}
          tabIndex={isFocused ? 0 : -1}
          data-path={node.path}
        >
          {node.is_dir ? (
            <>
              <ChevronRight
                className={`shrink-0 size-3 transition-[transform,color] duration-(--duration-fast) ease-(--ease-default) text-(--color-text-tertiary) group-hover:text-(--color-text-secondary) group-[[aria-selected=true]]:text-(--color-text-secondary) ${isExpanded ? "rotate-90" : ""}`}
              />
              <Folder className="shrink-0 size-4 text-(--color-text-tertiary) group-hover:text-(--color-text-secondary) group-[[aria-selected=true]]:text-(--color-text-secondary)" />
              <span className="font-medium truncate">
                {node.name}
              </span>
            </>
          ) : (
            <>
              <span className="shrink-0 w-3" />
              <FileText className="shrink-0 size-4 text-(--color-text-tertiary) group-hover:text-(--color-text-secondary) group-[[aria-selected=true]]:text-(--color-text-secondary)" />
              <span className="truncate">
                {displayName(node.name)}
              </span>
            </>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {node.is_dir ? (
          <ContextMenuItem onSelect={() => onToggle(node.path)}>
            {isExpanded ? "Collapse" : "Expand"}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={() => onSelect(node.path)}>
            Open
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem disabled>Rename</ContextMenuItem>
      </ContextMenuContent>
      {isPreviewable && (
        <PreviewPopover
          ref={popoverRef}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          path={node.path}
          workspacePath={workspacePath}
          onMouseEnter={() => {
            isMouseInPopoverRef.current = true
            cancelClose()
          }}
          onMouseLeave={() => {
            isMouseInPopoverRef.current = false
            scheduleClose()
          }}
          onEscapeClose={() => buttonRef.current?.focus()}
        />
      )}
    </ContextMenu>
  );
}
