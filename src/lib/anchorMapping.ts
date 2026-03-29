import type { Thread } from "@/types/comments";

/**
 * Remap thread anchors after a document change.
 * changeAt: character position where the change occurred
 * delta: positive = insertion length (in chars), negative = deletion length
 */
export function remapAnchors(
  threads: Thread[],
  changeAt: number,
  delta: number,
): Thread[] {
  return threads.map((t) => {
    let { anchor_from, anchor_to } = t;

    if (delta > 0) {
      // Insertion at changeAt
      if (changeAt <= anchor_from) {
        anchor_from += delta;
        anchor_to += delta;
      } else if (changeAt < anchor_to) {
        anchor_to += delta;
      }
    } else {
      // Deletion of [changeAt, deleteEnd)
      const deleteEnd = changeAt - delta; // delta is negative

      if (deleteEnd <= anchor_from) {
        // Deletion entirely before anchor — shift both left
        anchor_from += delta;
        anchor_to += delta;
      } else if (changeAt >= anchor_to) {
        // Deletion entirely after anchor — no change
      } else if (changeAt <= anchor_from && deleteEnd >= anchor_to) {
        // Deletion completely covers anchor — collapse to changeAt
        anchor_from = changeAt;
        anchor_to = changeAt;
      } else if (changeAt <= anchor_from) {
        // Deletion overlaps start of anchor: anchor_from deleted, anchor_to survives
        anchor_from = changeAt;
        anchor_to = anchor_to + delta; // shift anchor_to left by |delta|
      } else {
        // Deletion starts inside anchor (changeAt > anchor_from)
        if (deleteEnd >= anchor_to) {
          // Deletion reaches or passes anchor end — clip anchor_to to changeAt
          anchor_to = changeAt;
        } else {
          // Deletion entirely inside anchor — shrink
          anchor_to += delta;
        }
      }
    }

    const stale = anchor_from >= anchor_to;
    return {
      ...t,
      anchor_from,
      anchor_to,
      anchor_stale: stale || t.anchor_stale,
    };
  });
}
