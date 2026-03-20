// src/lib/session.ts
// Types mirror src-tauri/src/session.rs — serde uses snake_case field names

export interface Session {
  id: string;
  created_at: string;
  last_active_at: string;
  last_mode: string;
  pinned: boolean;
  messages_all: SessionMessage[];
  messages_compacted: CanonicalMessage[];
}

export interface SessionMessage {
  role: "user" | "assistant";
  content: CanonicalBlock[];
  mode: string | null;
  model: string | null;
}

export interface CanonicalMessage {
  role: "user" | "assistant";
  content: CanonicalBlock[];
}

export type CanonicalBlock =
  | { type: "text"; text: string }
  | { type: "image"; media_type: string; source: ImageSource }
  | { type: "file_ref"; path: string; name: string; media_type: string };

export type ImageSource =
  | { type: "base64"; data: string }
  | { type: "path"; path: string };

export function makeTextBlock(text: string): CanonicalBlock {
  return { type: "text", text };
}

export function newSession(lastMode: string): Session {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    created_at: now,
    last_active_at: now,
    last_mode: lastMode,
    pinned: false,
    messages_all: [],
    messages_compacted: [],
  };
}
