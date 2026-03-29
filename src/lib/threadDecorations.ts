import type { Thread } from "@/types/comments";

export interface DecorationRange {
  from: number;
  to: number;
  colorClass: string;
  threadIds: string[];
}

type ColorPriority = 0 | 1 | 2 | 3;
const PRIORITY = { none: 0, success: 1, warning: 2, danger: 3 } as const;
const CLASS = [
  "",
  "thread-decoration-success",
  "thread-decoration-warning",
  "thread-decoration-danger",
] as const;

function threadPriority(thread: Thread): ColorPriority {
  if (thread.anchor_stale) return PRIORITY.none;
  if (thread.status === "resolved") return PRIORITY.success;
  if (thread.blocking) return PRIORITY.danger;
  return PRIORITY.warning;
}

/**
 * Compute decoration ranges for all threads. Returns a minimal set of
 * non-overlapping ranges with worst-color precedence (danger > warning > success).
 */
export function computeDecorationRanges(
  threads: Thread[],
  showResolved: boolean,
): DecorationRange[] {
  const active = threads.filter((t) => {
    if (t.anchor_stale) return false;
    if (t.status === "resolved" && !showResolved) return false;
    return true;
  });

  if (active.length === 0) return [];

  // Collect all boundary points
  const points = new Set<number>();
  for (const t of active) {
    points.add(t.anchor_from);
    points.add(t.anchor_to);
  }
  const sorted = Array.from(points).sort((a, b) => a - b);

  const ranges: DecorationRange[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const spanning = active.filter(
      (t) => t.anchor_from <= from && t.anchor_to >= to,
    );
    if (spanning.length === 0) continue;

    let maxPriority: ColorPriority = PRIORITY.none;
    const ids: string[] = [];
    for (const t of spanning) {
      const p = threadPriority(t);
      if (p > maxPriority) maxPriority = p as ColorPriority;
      ids.push(t.id);
    }
    if (maxPriority === PRIORITY.none) continue;

    ranges.push({
      from,
      to,
      colorClass: CLASS[maxPriority],
      threadIds: ids,
    });
  }

  return ranges;
}
