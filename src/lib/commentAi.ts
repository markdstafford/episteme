import { invoke } from "@tauri-apps/api/core";

// ── Auth error detection ──────────────────────────────────────────────────────

const AUTH_ERROR_PATTERNS = [
  "ExpiredToken",
  "InvalidClientTokenId",
  "UnauthorizedException",
  "NotAuthorized",
  "CredentialsError",
  "NoCredentialProviders",
  "is not authorized",
  "token has expired",
];

export function isAuthError(message: string): boolean {
  return AUTH_ERROR_PATTERNS.some((p) =>
    message.toLowerCase().includes(p.toLowerCase()),
  );
}

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
  try {
    return await invoke<string>("ai_complete", {
      systemPrompt,
      userMessage,
      awsProfile,
    });
  } catch (e) {
    const msg = String(e);
    // Re-throw auth errors so callers can surface them to the user
    if (isAuthError(msg)) throw new Error(msg);
    throw e;
  }
}

/** Extract JSON from an AI response that may contain markdown fences or prose. */
function extractJson(response: string): unknown | null {
  // Try direct JSON first
  try {
    return JSON.parse(response.trim());
  } catch {}
  // Strip markdown code fences
  const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }
  // Find first {...} object
  const match = response.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
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
  const userMsg = [
    `Reviewer concern: "${params.concern}"`,
    `Document:\n${params.docContent}`,
    params.relatedDocs.length > 0
      ? `Related documents:\n${params.relatedDocs.join("\n---\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Auth errors propagate; other errors fall back to proceed
  let response: string;
  try {
    response = await callAi(VET_SYSTEM_PROMPT, userMsg, params.awsProfile);
  } catch (e) {
    if (isAuthError(String(e))) throw e;
    return { type: "proceed" };
  }

  const parsed = extractJson(response);
  if (!parsed || typeof parsed !== "object") return { type: "proceed" };
  const p = parsed as Record<string, unknown>;
  if (p.type === "deflect" && p.answer) return p as unknown as VetResult;
  if (p.type === "redirect" && p.newQuotedText) return p as unknown as VetResult;
  return { type: "proceed" };
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
