import { useRef, useState, useEffect } from "react";
import { Badge } from "./ui/Badge";

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

const PAIR_GAP_PX = 24; // mirrors --space-6 (24px) — used in JS layout math
const BADGE_RESERVE_PX = 80; // estimated badge width for first-pass overflow calculation

export function calculateVisibleCount(
  containerWidth: number,
  pairWidths: number[]
): number {
  let used = 0;
  for (let i = 0; i < pairWidths.length; i++) {
    const needed = i === 0 ? pairWidths[i] : pairWidths[i] + PAIR_GAP_PX;
    if (used + needed > containerWidth) return i;
    used += needed;
  }
  return pairWidths.length;
}

export function FrontmatterBar({ frontmatter }: FrontmatterBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const entries = Object.entries(frontmatter).filter(
    ([key]) => !HIDDEN_FIELDS.has(key)
  );

  const sorted = [...entries].sort(([a], [b]) => {
    const aIdx = DISPLAY_FIELDS.indexOf(a);
    const bIdx = DISPLAY_FIELDS.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  const frontmatterKey = sorted.map(([k, v]) => `${k}=${String(v)}`).join(",");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalculate = () => {
      const containerWidth = container.offsetWidth;
      if (containerWidth === 0) return;

      const pairEls = Array.from(
        container.querySelectorAll<HTMLElement>("[data-pair]")
      );
      // All pairs are always in DOM now — if count doesn't match, DOM isn't ready yet
      if (pairEls.length !== sorted.length) return;

      const pairWidths = pairEls.map((el) => el.offsetWidth);
      const countFits = calculateVisibleCount(containerWidth, pairWidths);

      if (countFits === sorted.length) {
        setVisibleCount(sorted.length);
        return;
      }

      // Some pairs overflow — reserve space for the badge
      const badgeEl = container.querySelector<HTMLElement>("[data-badge]");
      const reserve = badgeEl
        ? badgeEl.offsetWidth + PAIR_GAP_PX
        : BADGE_RESERVE_PX;
      setVisibleCount(calculateVisibleCount(containerWidth - reserve, pairWidths));
    };

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    recalculate();
    return () => observer.disconnect();
  }, [frontmatterKey]);

  if (entries.length === 0) return null;

  const displayCount = visibleCount ?? sorted.length;
  const hiddenCount = sorted.length - displayCount;

  return (
    <div
      ref={containerRef}
      className="relative flex overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-subtle)",
        borderBottom: "1px solid var(--color-border-subtle)",
        paddingBlock: "var(--space-3)",
        paddingInline: "var(--padding-content)",
        gap: "var(--space-6)",
      }}
    >
      {sorted.map(([key, value], i) => (
        <div
          key={key}
          data-pair=""
          className="flex-shrink-0"
          aria-hidden={visibleCount !== null && i >= visibleCount ? true : undefined}
        >
          <span
            style={{
              display: "block",
              fontSize: "var(--font-size-ui-sm)",
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--color-text-tertiary)",
            }}
          >
            {key}
          </span>
          <span
            style={{
              display: "block",
              fontSize: "var(--font-size-ui-base)",
              color: "var(--color-text-secondary)",
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {formatValue(value)}
          </span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <div
          data-badge=""
          className="absolute inset-y-0 right-0 flex items-center"
          style={{
            paddingRight: "var(--padding-content)",
            paddingLeft: "var(--space-8)",
            background: `linear-gradient(to right, transparent, var(--color-bg-subtle) 30%)`,
          }}
        >
          <Badge variant="neutral">+{hiddenCount} more</Badge>
        </div>
      )}
    </div>
  );
}
