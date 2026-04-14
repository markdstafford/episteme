import { PanelLeft, Sparkles, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { FileInfoPopoverContent } from "@/components/FileInfoPopoverContent";

interface FooterBarProps {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
  readingTime: number | null;
  filePath: string | null;
  frontmatter: Record<string, unknown> | null;
  documentOpen?: boolean;
  threadsViewActive?: boolean;
  onToggleThreadsView?: () => void;
}

export function FooterBar({
  sidebarVisible,
  onToggleSidebar,
  aiPanelOpen,
  onToggleAiPanel,
  readingTime,
  filePath,
  frontmatter,
  documentOpen,
  threadsViewActive,
  onToggleThreadsView,
}: FooterBarProps) {
  return (
    <div
      style={{
        height: "var(--height-footer)",
        background: "var(--color-bg-app)",
        borderTop: "1px solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* Left zone — matches sidebar width when visible */}
      <div
        style={{
          width: sidebarVisible ? "var(--width-sidebar)" : "auto",
          display: "flex",
          alignItems: "center",
          paddingLeft: "var(--space-1)",
          flexShrink: 0,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
          onClick={onToggleSidebar}
          style={{
            color: sidebarVisible
              ? "var(--color-accent)"
              : "var(--color-text-tertiary)",
          }}
        >
          <PanelLeft size={14} />
        </Button>
      </div>

      {/* Center zone — flex-1, reading time centered */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {readingTime !== null && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--font-size-ui-xs)",
                  color: "var(--color-text-tertiary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-tertiary)";
                }}
              >
                {readingTime} min read
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              sideOffset={24}
              style={{ padding: 0, width: 280 }}
            >
              <FileInfoPopoverContent
                filePath={filePath ?? ""}
                frontmatter={frontmatter}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Right zone — matches AI panel width when open */}
      <div
        style={{
          width: aiPanelOpen ? "var(--width-ai-panel)" : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: "var(--space-1)",
          flexShrink: 0,
        }}
      >
        {documentOpen && onToggleThreadsView && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            data-testid="threads-button"
            aria-label="Show threads"
            onClick={onToggleThreadsView}
            style={{
              color: threadsViewActive
                ? "var(--color-accent)"
                : "var(--color-text-tertiary)",
            }}
          >
            <MessagesSquare size={14} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={aiPanelOpen ? "Hide AI panel" : "Show AI panel"}
          onClick={onToggleAiPanel}
          style={{
            color: aiPanelOpen
              ? "var(--color-accent)"
              : "var(--color-text-tertiary)",
          }}
        >
          <Sparkles size={14} />
        </Button>
      </div>
    </div>
  );
}
