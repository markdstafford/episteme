import { describe, it, expect, vi, beforeEach } from "vitest";
import { vetComment, suggestCommentText, enhanceCommentBody } from "@/lib/commentAi";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

describe("vetComment", () => {
  beforeEach(() => vi.clearAllMocks());

  const baseParams = {
    concern: "what does this mean?",
    docContent: "# Doc\nSome content.",
    relatedDocs: [],
    awsProfile: "default",
    workspacePath: "/ws",
  };

  it("returns proceed when AI returns proceed JSON", async () => {
    mockInvoke.mockResolvedValueOnce(JSON.stringify({ type: "proceed" }));
    const result = await vetComment(baseParams);
    expect(result.type).toBe("proceed");
  });

  it("returns deflect when AI finds an answer", async () => {
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({ type: "deflect", answer: "It is defined in section 2." }),
    );
    const result = await vetComment(baseParams);
    expect(result.type).toBe("deflect");
    if (result.type === "deflect") {
      expect(result.answer).toBeTruthy();
    }
  });

  it("returns redirect when AI finds a better location", async () => {
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({ type: "redirect", newFrom: 10, newTo: 20, newQuotedText: "better text" }),
    );
    const result = await vetComment(baseParams);
    expect(result.type).toBe("redirect");
    if (result.type === "redirect") {
      expect(result.newQuotedText).toBe("better text");
    }
  });

  it("returns proceed silently on AI failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));
    const result = await vetComment(baseParams);
    expect(result.type).toBe("proceed");
  });

  it("returns proceed when AI returns malformed JSON", async () => {
    mockInvoke.mockResolvedValueOnce("not json");
    const result = await vetComment(baseParams);
    expect(result.type).toBe("proceed");
  });
});

describe("suggestCommentText", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns AI suggestion when successful", async () => {
    mockInvoke.mockResolvedValueOnce("Suggested text.");
    const result = await suggestCommentText({
      concern: "raw concern",
      quotedText: "some text",
      surroundingContext: "context",
      awsProfile: "default",
    });
    expect(result).toBe("Suggested text.");
  });

  it("falls back to raw concern on failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("fail"));
    const result = await suggestCommentText({
      concern: "raw concern",
      quotedText: "text",
      surroundingContext: "ctx",
      awsProfile: "default",
    });
    expect(result).toBe("raw concern");
  });
});

describe("enhanceCommentBody", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns enhanced body", async () => {
    mockInvoke.mockResolvedValueOnce("Enhanced body.");
    const result = await enhanceCommentBody({
      body: "raw body",
      awsProfile: "default",
    });
    expect(result).toBe("Enhanced body.");
  });

  it("returns null on failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("fail"));
    const result = await enhanceCommentBody({
      body: "raw body",
      awsProfile: "default",
    });
    expect(result).toBeNull();
  });

  it("returns null on timeout", async () => {
    mockInvoke.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve("late"), 200)),
    );
    const result = await enhanceCommentBody({
      body: "raw body",
      awsProfile: "default",
      timeoutMs: 50,
    });
    expect(result).toBeNull();
  });
});
