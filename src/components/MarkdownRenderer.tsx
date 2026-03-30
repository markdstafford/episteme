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
import { useEffect, useState, useRef } from "react";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { createDecorationPlugin } from "@/lib/decorationPlugin";
import { computeDecorationRanges } from "@/lib/threadDecorations";
import { useThreadsStore } from "@/stores/threads";
import {
  pmPosToMarkdownOffset,
  markdownOffsetToPmPos,
} from "@/lib/anchorCoordinates";
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
  /**
   * When provided, MarkdownRenderer will call loadThreads after the editor
   * renders content, passing the raw markdown so that reconcile_anchor()
   * validates anchor offsets in markdown character space.
   */
  docId?: string;
  scrollToThread?: { threadId: string; seq: number } | null;
}

export function MarkdownRenderer({
  content,
  className,
  onLinkClick,
  onCommentTrigger,
  onThreadClick,
  onThreadsFilterClick,
  showResolvedDecorations = true,
  docId,
  scrollToThread,
}: MarkdownRendererProps) {
  const threads = useThreadsStore((s) => s.threads);
  const [selectionPopover, setSelectionPopover] = useState<{
    x: number;
    y: number;
    anchor: CommentTriggerAnchor;
  } | null>(null);

  // Stable ref so the decoration plugin always reads the latest value,
  // even though the plugin closure is created only once at editor init.
  const showResolvedRef = useRef(showResolvedDecorations);
  useEffect(() => {
    showResolvedRef.current = showResolvedDecorations;
  }, [showResolvedDecorations]);

  const contentRef = useRef(content);
  contentRef.current = content; // keep in sync on every render — no effect needed

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
      // Thread decoration plugin — reads from the ref on every transaction
      Extension.create({
        name: "threadDecorations",
        addProseMirrorPlugins() {
          return [
            createDecorationPlugin((editorState) => {
              const { threads } = useThreadsStore.getState();
              const currentThreads = Array.isArray(threads) ? threads : [];
              const markdown = contentRef.current;
              if (!markdown)
                return computeDecorationRanges([], showResolvedRef.current);
              const doc = editorState.doc;
              const pmThreads = currentThreads.map((t) => {
                if (t.anchor_stale) return t;
                try {
                  const { from, to } = markdownOffsetToPmPos(
                    t.anchor_from,
                    doc,
                    markdown,
                    t.quoted_text,
                  );
                  return { ...t, anchor_from: from, anchor_to: to };
                } catch {
                  return { ...t, anchor_stale: true };
                }
              });
              return computeDecorationRanges(pmThreads, showResolvedRef.current);
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

  // When content or docId changes, load threads passing the raw markdown so
  // reconcile_anchor() validates anchor offsets in markdown character space.
  useEffect(() => {
    if (!editor || !docId) return;
    const id = setTimeout(() => {
      useThreadsStore.getState().loadThreads(docId, content);
    }, 0);
    return () => clearTimeout(id);
  }, [editor, content, docId]);

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
        try {
          const { from: mdFrom, to: mdTo } = pmPosToMarkdownOffset(
            from,
            editor.state.doc,
            contentRef.current,
            quotedText,
          );
          setSelectionPopover({
            x: coords.left + 6,
            y: (coords.top + coords.bottom) / 2,
            anchor: { from: mdFrom, to: mdTo, quotedText },
          });
        } catch {
          // Cannot map selection to markdown offset — do not show trigger
          setSelectionPopover(null);
        }
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

  // Scroll to thread anchor when scrollToThread changes
  useEffect(() => {
    if (!scrollToThread || !editor) return;
    const elements = editor.view.dom.querySelectorAll("[data-thread-ids]");
    const el = Array.from(elements).find((el) =>
      el.getAttribute("data-thread-ids")?.split(",").includes(scrollToThread.threadId)
    );
    (el as HTMLElement | undefined)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [scrollToThread, editor]);

  // Click handler for decorated text
  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const decorated = target.closest(
      ".thread-decoration",
    ) as HTMLElement | null;
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
            top: selectionPopover.y - 12,
            zIndex: 50,
          }}
        >
          <button
            className="p-1 rounded-(--radius-sm) hover:bg-(--color-bg-subtle) text-(--color-text-secondary)"
            onMouseDown={(e) => {
              // mousedown fires before blur, preventing popover from clearing
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
