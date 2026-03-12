const DISPLAY_FIELDS = [
  "title",
  "status",
  "author",
  "type",
  "reviewers",
  "approvers",
  "date",
  "tags",
];

const HIDDEN_FIELDS = new Set(["id"]);

interface FrontmatterBarProps {
  frontmatter: Record<string, unknown>;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

export function FrontmatterBar({ frontmatter }: FrontmatterBarProps) {
  const entries = Object.entries(frontmatter).filter(
    ([key]) => !HIDDEN_FIELDS.has(key)
  );

  if (entries.length === 0) return null;

  // Prioritize display fields, then show remaining
  const sorted = entries.sort(([a], [b]) => {
    const aIdx = DISPLAY_FIELDS.indexOf(a);
    const bIdx = DISPLAY_FIELDS.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div
      className="flex overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-subtle)",
        borderBottom: "1px solid var(--color-border-subtle)",
        paddingBlock: "var(--space-3)",
        paddingInline: "var(--padding-content)",
        gap: "var(--space-6)",
      }}
    >
      {sorted.map(([key, value]) => (
        <div
          key={key}
          className="flex-shrink-0"
        >
          <span className="text-xs text-gray-500 block">{key}</span>
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {formatValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
