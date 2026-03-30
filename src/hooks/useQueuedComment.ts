import { useState, useRef, useEffect, useCallback } from "react";
import type { QueuedComment } from "@/types/comments";

export const COUNTDOWN_SECONDS = 30;

interface UseQueuedCommentDeps {
  stageComment: (q: QueuedComment) => Promise<void>;
  commitComment: (id: string, docFilePath?: string) => Promise<unknown>;
  cancelQueuedComment: (id: string) => Promise<void>;
  updateQueuedBlocking: (id: string, blocking: boolean) => Promise<void>;
  toggleQueuedBody: (id: string) => Promise<void>;
  docFilePath?: string;
}

export interface QueuedCommentState {
  queuedId: string | null;
  bodyOriginal: string;
  bodyEnhanced: string | null;
  useEnhanced: boolean;
  blocking: boolean;
  countdown: number;
  commitError: string | null;
  displayBody: string;
  startQueued: (p: { id: string; bodyOriginal: string; bodyEnhanced: string | null }) => void;
  cancel: () => Promise<void>;
  toggleBody: () => void;
  setBlocking: (v: boolean) => Promise<void>;
  reset: () => void;
  retryCommit: () => void;
}

export function useQueuedComment(deps: UseQueuedCommentDeps): QueuedCommentState {
  const [queuedId, setQueuedId] = useState<string | null>(null);
  const [bodyOriginal, setBodyOriginal] = useState("");
  const [bodyEnhanced, setBodyEnhanced] = useState<string | null>(null);
  const [useEnhanced, setUseEnhanced] = useState(true);
  const [blocking, setBlockingState] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [commitError, setCommitError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const currentIdRef = useRef<string | null>(null);
  const countdownRef = useRef(COUNTDOWN_SECONDS);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const doCommit = useCallback(async (id: string) => {
    try {
      await depsRef.current.commitComment(id, depsRef.current.docFilePath);
      if (isMountedRef.current && currentIdRef.current === id) {
        setQueuedId(null);
        setCommitError(null);
      }
    } catch (e) {
      if (isMountedRef.current && currentIdRef.current === id) {
        setCommitError("Failed to send — click Retry");
      }
      console.error("Failed to commit queued comment:", e);
    }
  }, []);

  const startQueued = useCallback(({ id, bodyOriginal: bo, bodyEnhanced: be }: {
    id: string; bodyOriginal: string; bodyEnhanced: string | null;
  }) => {
    currentIdRef.current = id;
    countdownRef.current = COUNTDOWN_SECONDS;
    setQueuedId(id);
    setBodyOriginal(bo);
    setBodyEnhanced(be);
    setUseEnhanced(true);
    setBlockingState(false);
    setCountdown(COUNTDOWN_SECONDS);
    setCommitError(null);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        doCommit(id);
        return;
      }
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        doCommit(id);
      }
      setCountdown(countdownRef.current);
    }, 1000);
  }, [doCommit]);

  const cancel = useCallback(async () => {
    const id = currentIdRef.current;
    if (!id) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    currentIdRef.current = null;
    await depsRef.current.cancelQueuedComment(id);
    if (isMountedRef.current) {
      setQueuedId(null);
      setCommitError(null);
    }
  }, []);

  // reset: clears UI state for thread-switch. Does NOT cancel the queued comment
  // or clear the interval — the commit fires in the background even after navigation.
  const reset = useCallback(() => {
    currentIdRef.current = null;
    if (isMountedRef.current) {
      setQueuedId(null);
      setBodyOriginal("");
      setBodyEnhanced(null);
      setUseEnhanced(true);
      setBlockingState(false);
      setCommitError(null);
    }
  }, []);

  const toggleBody = useCallback(() => {
    if (!bodyEnhanced || !currentIdRef.current) return;
    setUseEnhanced((v) => !v);
    depsRef.current.toggleQueuedBody(currentIdRef.current);
  }, [bodyEnhanced]);

  const setBlocking = useCallback(async (v: boolean) => {
    setBlockingState(v);
    if (currentIdRef.current) {
      await depsRef.current.updateQueuedBlocking(currentIdRef.current, v);
    }
  }, []);

  const retryCommit = useCallback(() => {
    const id = currentIdRef.current;
    if (!id) return;
    setCommitError(null);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(async () => {
      retryTimerRef.current = null;
      await doCommit(id);
    }, 0);
  }, [doCommit]);

  const displayBody = useEnhanced && bodyEnhanced ? bodyEnhanced : bodyOriginal;

  return {
    queuedId, bodyOriginal, bodyEnhanced, useEnhanced, blocking,
    countdown, commitError, displayBody,
    startQueued, cancel, toggleBody, setBlocking, reset, retryCommit,
  };
}
