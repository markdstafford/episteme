import { describe, it, expect } from "vitest";
import { remapAnchors } from "@/lib/anchorMapping";
import type { Thread } from "@/types/comments";

function makeThread(id: string, from: number, to: number): Thread {
  return {
    id,
    doc_id: "d",
    quoted_text: "q",
    anchor_from: from,
    anchor_to: to,
    anchor_stale: false,
    status: "open",
    blocking: false,
    pinned: false,
    created_at: "2026-01-01",
    comments: [],
    events: [],
  };
}

describe("remapAnchors", () => {
  it("insert before anchor: shifts both positions", () => {
    const result = remapAnchors([makeThread("t1", 10, 20)], 0, 5);
    expect(result[0].anchor_from).toBe(15);
    expect(result[0].anchor_to).toBe(25);
    expect(result[0].anchor_stale).toBe(false);
  });

  it("insert inside anchor: extends anchor_to", () => {
    const result = remapAnchors([makeThread("t1", 0, 10)], 5, 3);
    expect(result[0].anchor_from).toBe(0);
    expect(result[0].anchor_to).toBe(13);
  });

  it("delete overlapping anchor: marks stale when from===to", () => {
    const result = remapAnchors([makeThread("t1", 5, 10)], 5, -5);
    expect(result[0].anchor_stale).toBe(true);
  });

  it("insert after anchor: no change", () => {
    const result = remapAnchors([makeThread("t1", 0, 5)], 10, 3);
    expect(result[0].anchor_from).toBe(0);
    expect(result[0].anchor_to).toBe(5);
  });
});
