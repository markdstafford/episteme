import { invoke } from "@tauri-apps/api/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VetResult =
  | { type: "proceed" }
  | { type: "deflect"; answer: string }
  | { type: "redirect"; newFrom: number; newTo: number; newQuotedText: string };

export interface VetParams {
  concern: string;
  docContent: string;
  relatedDocs: string[];
  awsProfile: string;
  workspacePath: string;
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function callAi(
  systemPrompt: string,
  userMessage: string,
  awsProfile: string,
): Promise<string> {
  return invoke<string>("ai_complete", {
    systemPrompt,
    userMessage,
    awsProfile,
  });
}

// ── Vetting service ───────────────────────────────────────────────────────────

const VET_SYSTEM_PROMPT = `You are an AI assistant reviewing a document comment before it is filed.
Given a reviewer's concern and the document content, determine:
1. If the concern is ALREADY ANSWERED in the document → {"type":"deflect","answer":"<explanation>"}
2. If a DIFFERENT passage better captures the concern → {"type":"redirect","newFrom":<int>,"newTo":<int>,"newQuotedText":"<text>"}
3. Otherwise → {"type":"proceed"}

Prioritize deflect > redirect > proceed.
Respond ONLY with valid JSON matching one of the three shapes above. No markdown fences.`;

export async function vetComment(params: VetParams): Promise<VetResult> {
  try {
    const userMsg = [
      `Reviewer concern: "${params.concern}"`,
      `Document:\n${params.docContent}`,
      params.relatedDocs.length > 0
        ? `Related documents:\n${params.relatedDocs.join("\n---\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await callAi(
      VET_SYSTEM_PROMPT,
      userMsg,
      params.awsProfile,
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { type: "proceed" };
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.type === "deflect" && parsed.answer)
      return parsed as VetResult;
    if (parsed.type === "redirect" && parsed.newQuotedText)
      return parsed as VetResult;
    return { type: "proceed" };
  } catch {
    return { type: "proceed" };
  }
}

// ── Comment text suggestion ───────────────────────────────────────────────────

const SUGGEST_SYSTEM_PROMPT = `You are helping a reviewer write a clear, concise document comment.
Given the reviewer's raw concern and the quoted text they selected, propose polished comment text.
Return ONLY the suggested comment text — no preamble, no explanation.
Keep it concise (1–3 sentences). Preserve the reviewer's intent exactly.`;

export async function suggestCommentText(params: {
  concern: string;
  quotedText: string;
  surroundingContext: string;
  awsProfile: string;
}): Promise<string> {
  try {
    const userMsg = `Quoted text: "${params.quotedText}"\nContext: ${params.surroundingContext}\nReviewer concern: "${params.concern}"`;
    const result = await callAi(
      SUGGEST_SYSTEM_PROMPT,
      userMsg,
      params.awsProfile,
    );
    return result.trim() || params.concern;
  } catch {
    return params.concern;
  }
}

// ── Body enhancement ──────────────────────────────────────────────────────────

const ENHANCE_SYSTEM_PROMPT = `You are improving a document comment for clarity and grammar.
Return ONLY the improved text — no preamble, no explanation.
Preserve the author's intent exactly. Keep it concise.`;

export async function enhanceCommentBody(params: {
  body: string;
  awsProfile: string;
  timeoutMs?: number;
}): Promise<string | null> {
  const { timeoutMs = 30000 } = params;
  try {
    const result = await Promise.race([
      callAi(ENHANCE_SYSTEM_PROMPT, params.body, params.awsProfile),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return typeof result === "string" ? result.trim() : null;
  } catch {
    return null;
  }
}
