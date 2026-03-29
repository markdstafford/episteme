import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";
import { parseDocument, resolveInternalLink } from "@/lib/markdown";
import { MarkdownRenderer, type CommentTriggerAnchor } from "@/components/MarkdownRenderer";
import { FrontmatterBar } from "@/components/FrontmatterBar";
import { Loader2 } from "lucide-react";
import { computeReadingTime } from "@/lib/readingTime";

interface DocumentViewerProps {
  onReadingTimeChange?: (minutes: number | null) => void;
  onCommentTrigger?: (anchor: CommentTriggerAnchor) => void;
  onThreadClick?: (threadId: string) => void;
  onThreadsFilterClick?: (threadIds: string[]) => void;
  showResolvedDecorations?: boolean;
}

export function DocumentViewer({
  onReadingTimeChange,
  onCommentTrigger,
  onThreadClick,
  onThreadsFilterClick,
  showResolvedDecorations = true,
}: DocumentViewerProps = {}) {
  const selectedFilePath = useFileTreeStore((s) => s.selectedFilePath);
  const selectFile = useFileTreeStore((s) => s.selectFile);
  const workspacePath = useWorkspaceStore((s) => s.folderPath);
const [content, setContent] = useState<string | null>(null);
  const [frontmatter, setFrontmatter] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFilePath) {
      setContent(null);
      setFrontmatter(null);
      onReadingTimeChange?.(null);
      return;
    }

    let cancelled = false;

    async function loadFile() {
      setIsLoading(true);
      setError(null);
      try {
        const raw = await invoke<string>("read_file", {
          filePath: selectedFilePath,
          workspacePath,
        });
        if (cancelled) return;
        const parsed = parseDocument(raw);
        setContent(parsed.content);
        setFrontmatter(parsed.frontmatter);
        onReadingTimeChange?.(computeReadingTime(parsed.content));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setContent(null);
        setFrontmatter(null);
        onReadingTimeChange?.(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFile();
    return () => {
      cancelled = true;
    };
  }, [selectedFilePath, onReadingTimeChange]);

  const handleLinkClick = useCallback(
    (href: string) => {
      if (!selectedFilePath || !workspacePath) return;

      const resolved = resolveInternalLink(
        href,
        selectedFilePath,
        workspacePath
      );

      if (resolved) {
        selectFile(resolved);
      } else {
        // External link — open in system browser
        open(href).catch(() => {});
      }
    },
    [selectedFilePath, workspacePath, selectFile]
  );

  if (!selectedFilePath) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-ui-lg)" }}>
          Select a document from the sidebar
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-6 h-6 animate-spin mx-auto"
            style={{ color: "var(--color-accent)" }}
          />
          <p className="mt-2" style={{ color: "var(--color-text-tertiary)" }}>
            Loading document...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: "var(--color-state-danger)", fontSize: "var(--font-size-ui-sm)" }}>
          Failed to load document: {error}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      {frontmatter && <FrontmatterBar frontmatter={frontmatter} />}
      <div style={{ paddingInline: "var(--padding-content)", paddingBlock: "var(--space-6)" }}>
        <div className="mx-auto" style={{ maxWidth: "var(--doc-content-width)" }}>
          {content !== null && (
            // matches --font-size-doc-base line-height per spec
            <div style={{ fontSize: "var(--font-size-doc-base)", lineHeight: "1.7" }}>
              <MarkdownRenderer
                content={content}
                onLinkClick={handleLinkClick}
                className="prose prose-tiptap dark:prose-invert max-w-none"
                onCommentTrigger={onCommentTrigger}
                onThreadClick={onThreadClick}
                onThreadsFilterClick={onThreadsFilterClick}
                showResolvedDecorations={showResolvedDecorations}
                docId={(frontmatter?.doc_id as string) || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
