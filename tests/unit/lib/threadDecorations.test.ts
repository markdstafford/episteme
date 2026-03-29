import { describe, it, expect } from "vitest";
import {
  computeDecorationRanges,
  type DecorationRange,
} from "@/lib/threadDecorations";
import type { Thread } from "@/types/comments";

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: "t1",
    doc_id: "d1",
    quoted_text: "hi",
    anchor_from: 0,
    anchor_to: 5,
    anchor_stale: false,
    status: "open",
    blocking: false,
    pinned: false,
    created_at: "2026-01-01",
    comments: [],
    events: [],
    ...overrides,
  };
}

describe("computeDecorationRanges", () => {
  it("open non-blocking → warning color", () => {
    const ranges = computeDecorationRanges([makeThread({})], true);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].colorClass).toBe("thread-decoration-warning");
  });

  it("open blocking → danger color", () => {
    const ranges = computeDecorationRanges(
      [makeThread({ blocking: true })],
      true,
    );
    expect(ranges[0].colorClass).toBe("thread-decoration-danger");
  });

  it("resolved → success color when showResolved=true", () => {
    const ranges = computeDecorationRanges(
      [makeThread({ status: "resolved" })],
      true,
    );
    expect(ranges[0].colorClass).toBe("thread-decoration-success");
  });

  it("resolved → no decoration when showResolved=false", () => {
    const ranges = computeDecorationRanges(
      [makeThread({ status: "resolved" })],
      false,
    );
    expect(ranges).toHaveLength(0);
  });

  it("stale → no decoration", () => {
    const ranges = computeDecorationRanges(
      [makeThread({ anchor_stale: true })],
      true,
    );
    expect(ranges).toHaveLength(0);
  });

  it("overlapping threads: danger wins over warning", () => {
    const t1 = makeThread({
      id: "t1",
      anchor_from: 0,
      anchor_to: 10,
      blocking: false,
    });
    const t2 = makeThread({
      id: "t2",
      anchor_from: 5,
      anchor_to: 15,
      blocking: true,
    });
    const ranges = computeDecorationRanges([t1, t2], true);
    const overlap = ranges.find((r) => r.from === 5 && r.to === 10);
    expect(overlap?.colorClass).toBe("thread-decoration-danger");
  });

  it("three-way overlap: danger wins", () => {
    const threads = [
      makeThread({ id: "t1", anchor_from: 0, anchor_to: 20, blocking: false }),
      makeThread({ id: "t2", anchor_from: 0, anchor_to: 20, blocking: true }),
      makeThread({
        id: "t3",
        anchor_from: 0,
        anchor_to: 20,
        status: "resolved",
      }),
    ];
    const ranges = computeDecorationRanges(threads, true);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].colorClass).toBe("thread-decoration-danger");
  });

  it("decoration boundaries are precise at anchor endpoints", () => {
    const t1 = makeThread({
      id: "t1",
      anchor_from: 0,
      anchor_to: 5,
      blocking: false,
    });
    const t2 = makeThread({
      id: "t2",
      anchor_from: 5,
      anchor_to: 10,
      blocking: true,
    });
    const ranges = computeDecorationRanges([t1, t2], true);
    const firstRange = ranges.find((r) => r.from === 0);
    expect(firstRange?.to).toBe(5);
    expect(firstRange?.colorClass).toBe("thread-decoration-warning");
  });
});
