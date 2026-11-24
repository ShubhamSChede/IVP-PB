"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { TextInput } from "@/components/ui/Form";
import { ErrorNote } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

// Messenger-style chat: newest at the bottom, composer pinned above the tab
// bar, auto-scrolls on new messages only if you're already at the bottom.

const NAME_KEY = "pb_name";
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;

function NamePrompt({ onSave }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim().slice(0, 40));
      }}
      className="flex gap-2"
    >
      <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name to join the chat" maxLength={40} autoComplete="nickname" />
      <button className="h-12 shrink-0 rounded-xl bg-accent px-5 text-base text-black disabled:opacity-40" disabled={!name.trim()}>
        Join
      </button>
    </form>
  );
}

export default function ChatView() {
  const { chat_messages, loaded, error, markChatSeen, removeRow, applyRows } = useLiveData();
  const { editor, isEditor, handleAuthError } = useEditor();
  const toast = useToast();
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem(NAME_KEY) ?? ""));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const stick = useRef(true);
  const firstScroll = useRef(true);

  const me = editor?.name ?? name;
  const messages = [...chat_messages].reverse(); // provider keeps newest-first

  // Track whether the reader is at the bottom (then new messages auto-scroll).
  useEffect(() => {
    const onScroll = () => (stick.current = nearBottom());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const newest = chat_messages[0]?.created_at;
  useLayoutEffect(() => {
    if (!loaded) return;
    if (firstScroll.current || stick.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
      firstScroll.current = false;
    }
    markChatSeen(newest);
  }, [loaded, newest, markChatSeen]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    stick.current = true;
    try {
      const { message } = await api("/api/chat", { body: { author: me, body } });
      applyRows("chat_messages", message);
      setText("");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  async function remove(id) {
    try {
      await api("/api/admin/chat_messages", { method: "DELETE", body: { id } });
      removeRow("chat_messages", id);
    } catch (err) {
      handleAuthError(err);
      toast(err.message, "error");
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-4">
        <h1 className="text-[clamp(1.6rem,5vw,2.4rem)] leading-tight text-ink-strong">Chat</h1>
        <p className="text-sm font-medium text-muted">Everyone at the event can see this. Be nice.</p>
      </div>
      {error && <ErrorNote message={error} />}

      {!loaded ? (
        <div className="space-y-3" aria-busy="true">
          {[60, 40, 70].map((w, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface" style={{ width: `${w}%`, marginLeft: i === 1 ? "auto" : 0 }} />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <Icon name="chat" size={32} className="text-muted" />
          <p className="mt-3 text-ink-strong">No messages yet</p>
          <p className="text-sm font-medium text-muted">Say hi to the other teams.</p>
        </div>
      ) : (
        <ol className="space-y-1">
          {messages.map((m, i) => {
            const mine = m.author === me;
            const prev = messages[i - 1];
            const grouped = prev && prev.author === m.author && new Date(m.created_at) - new Date(prev.created_at) < 5 * 60_000;
            return (
              <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"} ${grouped ? "" : "pt-2"}`}>
                {!grouped && (
                  <p className={`mb-1 flex items-center gap-1.5 px-1 text-xs ${mine ? "text-muted" : "text-ink"}`}>
                    {mine ? "You" : m.author}
                    {m.is_editor && <span className="rounded-full bg-accent px-1.5 text-[10px] text-black">Organiser</span>}
                    <span className="font-medium text-muted">{time(m.created_at)}</span>
                  </p>
                )}
                <div className="group flex max-w-[85%] items-center gap-1">
                  {isEditor && (
                    <button
                      onClick={() => remove(m.id)}
                      className={`grid size-8 shrink-0 place-items-center text-muted/50 hover:text-danger ${mine ? "" : "order-last"}`}
                      aria-label="Delete message"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                  <p
                    className={`whitespace-pre-wrap wrap-break-word rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${
                      mine ? "rounded-br-md bg-accent text-black" : m.is_editor ? "rounded-bl-md border border-accent/40 bg-accent/10 text-ink-strong" : "rounded-bl-md bg-surface-2 text-ink-strong"
                    }`}
                  >
                    {m.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Composer — pinned above the tab bar on phones, at the bottom on desktop */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line/80 bg-bg/90 px-4 py-2.5 backdrop-blur-xl lg:bottom-0">
        <div className="mx-auto max-w-3xl">
          {!me ? (
            <NamePrompt
              onSave={(n) => {
                localStorage.setItem(NAME_KEY, n);
                setName(n);
              }}
            />
          ) : (
            <form onSubmit={send} className="flex items-end gap-2">
              <TextInput
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message as ${me}`}
                maxLength={500}
                enterKeyHint="send"
                aria-label="Message"
              />
              <button
                disabled={!text.trim() || sending}
                className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-black disabled:opacity-40"
                aria-label="Send"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
