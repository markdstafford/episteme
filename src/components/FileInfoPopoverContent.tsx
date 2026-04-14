import type React from "react";

interface FileInfoPopoverContentProps {
  filePath: string;
  frontmatter: Record<string, unknown> | null;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--font-size-ui-xs)",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--color-text-tertiary)",
  marginBottom: "var(--space-1)",
};

export function FileInfoPopoverContent({ filePath, frontmatter }: FileInfoPopoverContentProps) {
  const frontmatterEntries = frontmatter
    ? Object.entries(frontmatter).filter(([key]) => key !== "doc_id")
    : [];

  const hasFrontmatter = frontmatterEntries.length > 0;

  function renderValue(value: unknown): string {
    if (Array.isArray(value)) return value.join(", ");
    return String(value ?? "");
  }

  return (
    <div style={{ padding: "var(--space-3)" }}>
      {/* Path section */}
      <div>
        <div style={labelStyle}>Path</div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-ui-xs)",
            color: "var(--color-text-secondary)",
            userSelect: "text",
            wordBreak: "break-all",
          }}
        >
          {filePath}
        </div>
      </div>

      {/* Frontmatter section */}
      {hasFrontmatter && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--color-border-subtle)",
              margin: "var(--space-3) 0",
            }}
          />
          <div>
            <div style={labelStyle}>Frontmatter</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {frontmatterEntries.map(([key, value]) => (
                <div key={key}>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--font-size-ui-xs)",
                      fontWeight: 500,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {key}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--font-size-ui-xs)",
                      color: "var(--color-text-secondary)",
                      userSelect: "text",
                    }}
                  >
                    {renderValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
