import { invoke } from "@tauri-apps/api/core";
import type { Thread } from "@/types/comments";

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

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.fix && parsed.originalText && parsed.reply) return parsed;
    return null;
  } catch {
    return null;
  }
}
