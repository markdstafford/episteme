import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  vetComment,
  suggestCommentText,
  enhanceCommentBody,
  DEFAULT_DEFLECT_INSTRUCTION,
  DEFAULT_REDIRECT_INSTRUCTION,
} from "@/lib/commentAi";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const baseParams = {
  concern: "reduce the time commitment",
  docContent: "**Time commitment**: 4-6 hours",
  relatedDocs: [],
  awsProfile: "default",
  workspacePath: "/ws",
};

describe("vetComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns proceed when AI responds with proceed", async () => {
    mockInvoke.mockResolvedValue('{"type":"proceed"}');
    const result = await vetComment(baseParams);
    expect(result.type).toBe("proceed");
  });

  it("returns deflect when AI responds with deflect and answer", async () => {
    mockInvoke.mockResolvedValue('{"type":"deflect","answer":"The doc says 4-6 hours"}');
    const result = await vetComment(baseParams);
    expect(result.type).toBe("deflect");
    if (result.type === "deflect") expect(result.answer).toBe("The doc says 4-6 hours");
  });

  it("returns redirect when AI finds a better location", async () => {
    mockInvoke.mockResolvedValue(
      JSON.stringify({ type: "redirect", newFrom: 10, newTo: 20, newQuotedText: "better text" }),
    );
    const result = await vetComment(baseParams);
    expect(result.type).toBe("redirect");
    if (result.type === "redirect") {
      expect(result.newQuotedText).toBe("better text");
    }
  });

  it("falls back to proceed when AI returns unrecognized JSON", async () => {
    mockInvoke.mockResolvedValue('{"type":"unknown"}');
    const result = await vetComment(baseParams);
    expect(result.type).toBe("proceed");
  });

  it("falls back to proceed on non-JSON response", async () => {
    mockInvoke.mockResolvedValue("sorry, I cannot help");
    const result = await vetComment(baseParams);
    expect(result.type).toBe("proceed");
  });

  it("falls back to proceed on non-auth errors", async () => {
    mockInvoke.mockRejectedValue(new Error("network timeout"));
    const result = await vetComment(baseParams);
    expect(result.type).toBe("proceed");
  });

  it("propagates auth errors", async () => {
    mockInvoke.mockRejectedValue(new Error("ExpiredToken: token has expired"));
    await expect(vetComment(baseParams)).rejects.toThrow("ExpiredToken");
  });

  it("parses deflect from markdown-fenced JSON response", async () => {
    mockInvoke.mockResolvedValue('```json\n{"type":"deflect","answer":"see section 2"}\n```');
    const result = await vetComment(baseParams);
    expect(result.type).toBe("deflect");
  });

  it("includes DO NOT deflect guardrails in the built prompt", async () => {
    mockInvoke.mockResolvedValue('{"type":"proceed"}');
    await vetComment(baseParams);
    const call = mockInvoke.mock.calls[0];
    const args = call[1] as Record<string, string>;
    expect(args.systemPrompt).toContain("Do NOT deflect if");
    expect(args.systemPrompt).toContain("When in doubt, do not deflect");
  });
});

describe("DEFAULT_DEFLECT_INSTRUCTION", () => {
  it("is exported and non-empty", () => {
    expect(typeof DEFAULT_DEFLECT_INSTRUCTION).toBe("string");
    expect(DEFAULT_DEFLECT_INSTRUCTION.length).toBeGreaterThan(0);
  });
});

describe("DEFAULT_REDIRECT_INSTRUCTION", () => {
  it("is exported and non-empty", () => {
    expect(typeof DEFAULT_REDIRECT_INSTRUCTION).toBe("string");
    expect(DEFAULT_REDIRECT_INSTRUCTION.length).toBeGreaterThan(0);
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
