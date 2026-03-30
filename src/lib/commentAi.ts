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
  /** Override the deflect instruction. Defaults to DEFAULT_DEFLECT_INSTRUCTION. */
  deflectInstruction?: string;
  /** Override the redirect instruction. Defaults to DEFAULT_REDIRECT_INSTRUCTION. */
  redirectInstruction?: string;
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

export const DEFAULT_DEFLECT_INSTRUCTION =
  "the reviewer appears to be seeking information or clarification that is already explicitly present in the document — even if not phrased as a question (e.g. \"needs an estimate\" where the estimate is in the document)";

export const DEFAULT_REDIRECT_INSTRUCTION =
  "the concern would be better anchored to a different passage — for example the user selected a summary but the actual definition or constraint is stated elsewhere in the document.";

function buildVetPrompt(deflect: string, redirect: string): string {
  return `You are reviewing a document comment before it is filed.

DEFLECT if ${deflect}

Do NOT deflect if:
- The concern is in imperative form — a request or instruction to change something (e.g. "reduce X", "add Y", "this needs more detail", "make this shorter") — regardless of whether the document addresses the topic
- The concern expresses disagreement or pushback (e.g. "this seems wrong", "I disagree with...", "I don't think...")
- The concern identifies information that is genuinely missing from the document
- When in doubt, do not deflect

REDIRECT if ${redirect}

Otherwise, PROCEED.

Respond ONLY with valid JSON, one of:
{"type":"proceed"}
{"type":"deflect","answer":"<quote or paraphrase from the document>"}
{"type":"redirect","newFrom":<int>,"newTo":<int>,"newQuotedText":"<text>"}`;
}

export async function vetComment(params: VetParams): Promise<VetResult> {
  const vetPrompt = buildVetPrompt(
    params.deflectInstruction ?? DEFAULT_DEFLECT_INSTRUCTION,
    params.redirectInstruction ?? DEFAULT_REDIRECT_INSTRUCTION,
  );

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
    response = await callAi(vetPrompt, userMsg, params.awsProfile);
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
Return ONLY the suggested comment text — no preamble, no explanation, no clarifying questions.
Keep it concise (1–3 sentences). Preserve the reviewer's intent exactly.`;

export async function suggestCommentText(params: {
  concern: string;
  quotedText: string;
  surroundingContext: string;
  docContent: string;
  awsProfile: string;
}): Promise<string> {
  try {
    const parts = [
      `Quoted text: "${params.quotedText}"`,
      params.surroundingContext ? `Context: ${params.surroundingContext}` : null,
      params.docContent ? `Document:\n${params.docContent}` : null,
      `Reviewer concern: "${params.concern}"`,
    ].filter(Boolean);
    const userMsg = parts.join("\n\n");
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
Return ONLY the improved text — no preamble, no explanation, no clarifying questions.
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
