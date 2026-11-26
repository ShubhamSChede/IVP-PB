"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// Edit-mode state + editor presence ("3 editing", "Asha is on T04").
// Edit locks: an editor unlocks ONE thing at a time with its pencil: a whole
// tie ("SW-R1-T01") or one court ("SW-R1-T01:c2"). Everything else stays
// read-only for them, and other editors see who holds what. Auto-locks after
// a couple of idle minutes.

const IDLE_LOCK_MS = 2 * 60 * 1000;

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [editor, setEditor] = useState(null); // { name } | null
  const [checked, setChecked] = useState(false);
  const [others, setOthers] = useState([]); // other editors: [{ name, editing }]
  const channelRef = useRef(null);
  const stateRef = useRef({ editing: null });
  const [target, setTarget] = useState(null); // what this editor has unlocked
  const idleRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api("/api/auth/session", { method: "GET" })
      .then((d) => !cancelled && setEditor(d.editor))
      .catch(() => {})
      .finally(() => !cancelled && setChecked(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Presence: only editors join.
  useEffect(() => {
    if (!editor) return;
    const sb = getBrowserSupabase();
    const me = `${editor.name}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = sb.channel("editors", { config: { presence: { key: me } } });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOthers(
          Object.entries(state)
            .filter(([key]) => key !== me)
            .map(([, metas]) => metas[metas.length - 1])
        );
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ name: editor.name, editing: stateRef.current.editing });
      });

    return () => {
      channelRef.current = null;
      setOthers([]);
      sb.removeChannel(channel);
    };
  }, [editor]);

  const setEditing = useCallback(
    (matchId) => {
      if (stateRef.current.editing === matchId) return;
      stateRef.current.editing = matchId;
      channelRef.current?.track({ name: editor?.name, editing: matchId });
    },
    [editor]
  );

  /** Unlock a tie or court for editing (null = lock everything). */
  const unlockTarget = useCallback(
    (t) => {
      clearTimeout(idleRef.current);
      setTarget(t);
      setEditing(t);
      if (t) idleRef.current = setTimeout(() => { setTarget(null); setEditing(null); }, IDLE_LOCK_MS);
    },
    [setEditing]
  );

  /** Keep the current unlock alive while the editor is using it. */
  const bump = useCallback(() => {
    if (!stateRef.current.editing) return;
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => { setTarget(null); setEditing(null); }, IDLE_LOCK_MS);
  }, [setEditing]);

  useEffect(() => () => clearTimeout(idleRef.current), []);

  const unlock = useCallback(async (code, name) => {
    const d = await api("/api/auth/unlock", { body: { code, name } });
    setEditor(d.editor);
    return d.editor;
  }, []);

  const lock = useCallback(async () => {
    await api("/api/auth/lock");
    setTarget(null);
    setEditor(null);
  }, []);

  /** Call on a 401 from any write: the cookie expired or the code was rotated. */
  const handleAuthError = useCallback((err) => {
    if (err?.status === 401) setEditor(null);
  }, []);

  const value = useMemo(
    () => ({ editor, isEditor: Boolean(editor), checked, others, setEditing, target: editor ? target : null, unlockTarget, bump, unlock, lock, handleAuthError }),
    [editor, checked, others, setEditing, target, unlockTarget, bump, unlock, lock, handleAuthError]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}
