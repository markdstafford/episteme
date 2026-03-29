export interface Anchor {
  from: number;
  to: number;
  quotedText: string;
  stale: boolean;
}

export type ThreadStatus = "open" | "resolved";

export type ThreadEventType =
  | "open"
  | "blocking"
  | "non-blocking"
  | "resolved"
  | "re-opened";

export interface Comment {
  id: string;
  thread_id: string;
  body: string;
  author: string;
  created_at: string;
}

export interface ThreadEvent {
  id: string;
  thread_id: string;
  event: ThreadEventType;
  changed_by: string;
  changed_at: string;
}

export interface Thread {
  id: string;
  doc_id: string;
  quoted_text: string;
  anchor_from: number;
  anchor_to: number;
  anchor_stale: boolean;
  status: ThreadStatus;
  blocking: boolean;
  pinned: boolean;
  created_at: string;
  comments: Comment[];
  events: ThreadEvent[];
}

export interface QueuedComment {
  id: string;
  thread_id: string | null;
  doc_id: string | null;
  quoted_text: string | null;
  anchor_from: number | null;
  anchor_to: number | null;
  body_original: string;
  body_enhanced: string | null;
  use_body_enhanced: boolean;
  blocking: boolean;
  created_at: string;
  expires_at: string;
}

export interface AnchorUpdate {
  thread_id: string;
  anchor_from: number;
  anchor_to: number;
}
