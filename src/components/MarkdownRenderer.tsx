import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { useEffect, useState } from "react";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { createDecorationPlugin } from "@/lib/decorationPlugin";
import { computeDecorationRanges } from "@/lib/threadDecorations";
import { useThreadsStore } from "@/stores/threads";
import { MessageSquarePlus } from "lucide-react";

export interface CommentTriggerAnchor {
  from: number;
  to: number;
  quotedText: string;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onLinkClick?: (href: string) => void;
  onCommentTrigger?: (anchor: CommentTriggerAnchor) => void;
  onThreadClick?: (threadId: string) => void;
  onThreadsFilterClick?: (threadIds: string[]) => void;
  showResolvedDecorations?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  onLinkClick,
  onCommentTrigger,
  onThreadClick,
  onThreadsFilterClick,
  showResolvedDecorations = true,
}: MarkdownRendererProps) {
  const threads = useThreadsStore((s) => s.threads);
  const [selectionPopover, setSelectionPopover] = useState<{
    x: number;
    y: number;
    anchor: CommentTriggerAnchor;
  } | null>(null);

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlock,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.extend({ name: "customLink" }).configure({
        openOnClick: false,
      }),
      Markdown,
      // Thread decoration plugin
      Extension.create({
        name: "threadDecorations",
        addProseMirrorPlugins() {
          return [
            createDecorationPlugin(() => {
              const { threads: currentThreads } = useThreadsStore.getState();
              return computeDecorationRanges(
                currentThreads,
                showResolvedDecorations,
              );
            }),
          ];
        },
      }),
    ],
    content,
  });

  // Update content when it changes
  useEffect(() => {
    if (editor) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Recompute decorations when threads or showResolvedDecorations changes
  useEffect(() => {
    if (editor) {
      editor.view.dispatch(
        editor.state.tr.setMeta("threadDecorationUpdate", true),
      );
    }
  }, [threads, showResolvedDecorations, editor]);

  // Link click handler
  useEffect(() => {
    if (!editor || !onLinkClick) return;

    let el: HTMLElement;
    try {
      el = editor.view.dom;
    } catch {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest("a");
      if (link) {
        event.preventDefault();
        const href = link.getAttribute("href");
        if (href) onLinkClick(href);
      }
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [editor, onLinkClick]);

  // Selection popover for comment trigger
  useEffect(() => {
    if (!editor || !onCommentTrigger) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelectionPopover(null);
        return;
      }
      const quotedText = editor.state.doc.textBetween(from, to, "");
      if (!quotedText.trim()) {
        setSelectionPopover(null);
        return;
      }
      try {
        const coords = editor.view.coordsAtPos(to);
        setSelectionPopover({ x: coords.left, y: coords.top, anchor: { from, to, quotedText } });
      } catch {
        setSelectionPopover(null);
      }
    };

    const blur = () => setSelectionPopover(null);
    editor.on("selectionUpdate", update);
    editor.on("blur", blur);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("blur", blur);
    };
  }, [editor, onCommentTrigger]);

  // Click handler for decorated text
  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const decorated = target.closest(".thread-decoration") as HTMLElement | null;
    if (!decorated) return;

    const idsAttr = decorated.getAttribute("data-thread-ids");
    if (!idsAttr) return;

    const ids = idsAttr.split(",").filter(Boolean);
    if (ids.length === 1) {
      onThreadClick?.(ids[0]);
    } else if (ids.length > 1) {
      onThreadsFilterClick?.(ids);
    }
  };

  return (
    <div className={className} style={{ position: "relative" }}>
      <div onClick={handleEditorClick}>
        <EditorContent editor={editor} />
      </div>

      {/* Selection popover for comment trigger */}
      {selectionPopover && onCommentTrigger && (
        <div
          style={{
            position: "fixed",
            left: selectionPopover.x,
            top: selectionPopover.y - 36,
            zIndex: 50,
          }}
          className="bg-(--color-bg-elevated) border border-(--color-border-subtle) rounded-(--radius-base) shadow-md p-1"
        >
          <button
            className="p-1 rounded-(--radius-sm) hover:bg-(--color-bg-subtle) text-(--color-text-secondary)"
            onMouseDown={(e) => {
              // Use mousedown to fire before blur clears the popover
              e.preventDefault();
              onCommentTrigger(selectionPopover.anchor);
              setSelectionPopover(null);
            }}
            title="Add comment"
          >
            <MessageSquarePlus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
