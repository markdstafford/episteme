import { invoke } from "@tauri-apps/api/core";
import type { Thread } from "@/types/comments";
import { extractJson } from "@/lib/commentAi";

function logCommentAi(entry: Record<string, unknown>): void {
  invoke("log_comment_ai", {
    entry: { ts: new Date().toISOString(), ...entry },
  }).catch(() => {});
}

const FIX_SYSTEM_PROMPT = `You are helping a document author address a reviewer's comment.
Given the comment thread and document, propose a specific, minimal document edit.
Return JSON only: {"fix":"<replacement text>","originalText":"<text to replace>","reply":"<summary for thread>"}
No markdown fences.`;

export async function suggestFix(params: {
  thread: Thread;
  docContent: string;
  awsProfile: string;
}): Promise<{ fix: string; originalText: string; reply: string } | null> {
  try {
    const comments = params.thread.comments
      .map((c) => `${c.author}: ${c.body}`)
      .join("\n");
    const userMsg = [
      `Thread anchor: "${params.thread.quoted_text}"`,
      `Thread comments:\n${comments}`,
      `Document:\n${params.docContent}`,
    ].join("\n\n");

    const response = await invoke<string>("ai_complete", {
      systemPrompt: FIX_SYSTEM_PROMPT,
      userMessage: userMsg,
      awsProfile: params.awsProfile,
    });

    logCommentAi({
      call: "suggest_fix",
      quoted_text: params.thread.quoted_text,
      doc_content: params.docContent,
      thread_comments: params.thread.comments.map(c => ({ author: c.author, body: c.body })),
      response,
      error: null,
    });
    const parsed = extractJson(response);
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (p.fix && p.originalText && p.reply) return p as unknown as { fix: string; originalText: string; reply: string };
    return null;
  } catch (e) {
    logCommentAi({
      call: "suggest_fix",
      quoted_text: params.thread.quoted_text,
      doc_content: params.docContent,
      thread_comments: params.thread.comments.map(c => ({ author: c.author, body: c.body })),
      response: null,
      error: String(e),
    });
    return null;
  }
}
