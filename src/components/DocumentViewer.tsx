import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAiChatStore } from "@/stores/aiChat";
import { parseDocument, resolveInternalLink } from "@/lib/markdown";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { FrontmatterBar } from "@/components/FrontmatterBar";
import { Loader2 } from "lucide-react";

export function DocumentViewer() {
  const selectedFilePath = useFileTreeStore((s) => s.selectedFilePath);
  const selectFile = useFileTreeStore((s) => s.selectFile);
  const workspacePath = useWorkspaceStore((s) => s.folderPath);
  const documentReloadCounter = useAiChatStore((s) => s.documentReloadCounter);

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
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setContent(null);
        setFrontmatter(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFile();
    return () => {
      cancelled = true;
    };
  }, [selectedFilePath, documentReloadCounter]);

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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-lg">
          Select a document from the sidebar
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-600 text-sm">
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
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--doc-content-width)",
          paddingInline: "var(--padding-content)",
        }}
      >
        {content !== null && (
          <div style={{ fontSize: "var(--font-size-doc-base)", lineHeight: "1.7" }}>
            <MarkdownRenderer content={content} onLinkClick={handleLinkClick} />
          </div>
        )}
      </div>
    </div>
  );
}
