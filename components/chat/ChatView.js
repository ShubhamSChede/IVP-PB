"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { TextInput } from "@/components/ui/Form";
import { ErrorNote } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import stickerPack from "@/public/stickers/manifest.json";

// Messenger-style chat: newest at the bottom, composer pinned above the tab
// bar, auto-scrolls on new messages only if you're already at the bottom.
// Tap a message → react / reply (organisers also pin / delete). Up to 2
// pinned messages sit in a bar at the top, like WhatsApp.

const NAME_KEY = "pb_name";
const REACTIONS = [
  ["like", "👍"],
  ["dislike", "👎"],
  ["heart", "❤️"],
  ["laugh", "😂"],
  ["cry", "😢"],
];
const EMOJI = Object.fromEntries(REACTIONS);

// Stickers ship with the app (public/stickers). A sticker message is just the
// text "[sticker:<id>]", so no storage or schema is needed.
const STICKERS = new Map(stickerPack.stickers.map((s) => [s.id, s]));
const stickerOf = (body) => {
  const m = /^\[sticker:([a-z0-9-]+)\]$/.exec(body ?? "");
  return m ? STICKERS.get(m[1]) ?? null : null;
};
/** One-line text for quotes, pins and previews. */
const preview = (body) => {
  const st = stickerOf(body);
  return st ? `Sticker · ${st.title}` : body;
};
const STICKY_TOP = "top-[calc(5.5rem+2px+env(safe-area-inset-top))] lg:top-[calc(6rem+2px)]";

const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;

/** Scroll to a message and flash it; false if it isn't loaded. */
function jumpTo(id) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.querySelector("[data-bubble]")?.animate(
    [{ boxShadow: "0 0 0 3px var(--accent)" }, { boxShadow: "0 0 0 3px transparent" }],
    { duration: 1400, delay: 250, easing: "ease-out" }
  );
  return true;
}

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
      <button className="h-12 shrink-0 rounded-xl bg-accent px-5 text-base text-on-accent disabled:opacity-40" disabled={!name.trim()}>
        Join
      </button>
    </form>
  );
}

function PinnedBar({ pins, isEditor, onUnpin, toast }) {
  const [idx, setIdx] = useState(0);
  if (!pins.length) return null;
  const i = idx % pins.length;
  const pin = pins[i];
  return (
    <div className={`sticky ${STICKY_TOP} z-20 -mx-4 mb-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur-xl md:-mx-6 md:px-6`}>
      <div className="flex items-center gap-3">
        {pins.length > 1 && (
          <div className="flex shrink-0 flex-col gap-0.5 self-stretch py-0.5" aria-hidden="true">
            {pins.map((p, k) => (
              <span key={p.id} className={`w-[3px] flex-1 rounded-full ${k === i ? "bg-accent" : "bg-line"}`} />
            ))}
          </div>
        )}
        <button
          onClick={() => {
            if (!jumpTo(pin.id)) toast("That message is too old to show here");
            setIdx(i + 1);
          }}
          className="min-w-0 flex-1 text-left"
          aria-label={`Pinned message ${i + 1} of ${pins.length}. Tap to view`}
        >
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-ink">
            <Icon name="pin" size={12} /> Pinned{pins.length > 1 ? ` · ${i + 1}/${pins.length}` : ""}
          </p>
          <p className="truncate text-sm text-ink-strong">
            <span className="font-semibold">{pin.author}:</span> {preview(pin.body)}
          </p>
        </button>
        {isEditor && (
          <button onClick={() => onUnpin(pin)} className="grid size-9 shrink-0 place-items-center text-muted hover:text-danger" aria-label="Unpin">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function ActionBar({ m, mineReaction, isEditor, onReact, onReply, onPin, onDelete }) {
  return (
    <div data-actions className="mb-1.5 flex max-w-full items-center gap-0.5 rounded-md border border-line bg-surface p-1 shadow-[0_8px_24px_-12px_rgba(47,49,58,0.35)]">
      {REACTIONS.map(([key, e]) => (
        <button
          key={key}
          onClick={() => onReact(key)}
          aria-label={`React ${key}`}
          aria-pressed={mineReaction === key}
          className={`grid size-10 shrink-0 place-items-center rounded-md text-xl transition-transform active:scale-90 ${mineReaction === key ? "bg-accent/30" : "hover:bg-surface-2"}`}
        >
          {e}
        </button>
      ))}
      <span className="mx-0.5 h-6 w-px shrink-0 bg-line" />
      <button onClick={onReply} className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink" aria-label="Reply">
        <Icon name="reply" size={18} />
      </button>
      {isEditor && (
        <>
          <button
            onClick={onPin}
            className={`grid size-10 shrink-0 place-items-center rounded-md hover:bg-surface-2 ${m.pinned_at ? "text-accent-ink" : "text-muted hover:text-ink"}`}
            aria-label={m.pinned_at ? "Unpin" : "Pin"}
          >
            <Icon name="pin" size={18} />
          </button>
          <button onClick={onDelete} className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-danger" aria-label="Delete message">
            <Icon name="close" size={16} />
          </button>
        </>
      )}
    </div>
  );
}

export default function ChatView() {
  const { chat_messages, reactionsByMessage, loaded, error, markChatSeen, removeRow, applyRows } = useLiveData();
  const { editor, isEditor, handleAuthError } = useEditor();
  const toast = useToast();
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem(NAME_KEY) ?? ""));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState(null); // message id with the action bar open
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [reactor, setReactor] = useState(null); // this device's reaction id
  const [picker, setPicker] = useState(false); // sticker tray open
  const stick = useRef(true);
  const firstScroll = useRef(true);
  const inputRef = useRef(null);

  const me = editor?.name ?? name;
  const messages = [...chat_messages].reverse(); // provider keeps newest-first
  const pins = chat_messages.filter((m) => m.pinned_at).sort((a, b) => (a.pinned_at < b.pinned_at ? 1 : -1));

  // Which reactions are mine (the server hands out an anonymous per-device id).
  useEffect(() => {
    api("/api/chat/react", { method: "GET" })
      .then((d) => setReactor(d.reactor))
      .catch(() => {});
  }, []);

  // Track whether the reader is at the bottom (then new messages auto-scroll).
  useEffect(() => {
    const onScroll = () => (stick.current = nearBottom());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the action bar on a tap elsewhere / Escape.
  useEffect(() => {
    if (selected == null) return;
    const onDown = (e) => {
      if (!e.target.closest(`[data-msg="${selected}"]`)) setSelected(null);
    };
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const newest = chat_messages[0]?.created_at;
  useLayoutEffect(() => {
    if (!loaded) return;
    if (firstScroll.current || stick.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
      firstScroll.current = false;
    }
    markChatSeen(newest);
  }, [loaded, newest, markChatSeen]);

  async function post(body, { clearText = false } = {}) {
    if (!body || sending) return;
    setSending(true);
    stick.current = true;
    try {
      const { message } = await api("/api/chat", { body: { author: me, body, reply_to: replyTo?.id ?? null } });
      applyRows("chat_messages", message);
      if (clearText) setText("");
      setReplyTo(null);
      setPicker(false);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  function send(e) {
    e.preventDefault();
    post(text.trim(), { clearText: true });
  }

  async function remove(id) {
    setSelected(null);
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await api("/api/admin/chat_messages", { method: "DELETE", body: { id } });
      removeRow("chat_messages", id);
      if (replyTo?.id === id) setReplyTo(null);
    } catch (err) {
      handleAuthError(err);
      toast(err.message, "error");
    }
  }

  async function react(m, emoji) {
    setSelected(null);
    const current = reactor ? (reactionsByMessage.get(m.id) ?? []).find((x) => x.reactor === reactor) : null;
    const next = current?.emoji === emoji ? null : emoji;
    const key = reactor ? `${m.id}:${reactor}` : null;
    // optimistic
    if (key) {
      if (next) applyRows("chat_reactions", { id: key, message_id: m.id, reactor, emoji: next, created_at: new Date().toISOString() });
      else removeRow("chat_reactions", key);
    }
    try {
      const d = await api("/api/chat/react", { body: { messageId: m.id, emoji: next } });
      if (!reactor) setReactor(d.reactor);
      if (d.row) applyRows("chat_reactions", d.row);
    } catch (err) {
      toast(err.message, "error");
      if (key) {
        if (current) applyRows("chat_reactions", current);
        else removeRow("chat_reactions", key);
      }
    }
  }

  async function togglePin(m) {
    setSelected(null);
    try {
      const { rows, replaced } = await api("/api/chat/pin", { body: { id: m.id, pinned: !m.pinned_at } });
      applyRows("chat_messages", rows);
      toast(m.pinned_at ? "Unpinned" : replaced ? "Pinned. Replaced the oldest pin (max 2)" : "Pinned");
    } catch (err) {
      handleAuthError(err);
      toast(err.message, "error");
    }
  }

  function startReply(m) {
    setSelected(null);
    setReplyTo(m);
    inputRef.current?.focus();
  }

  return (
    <div className={picker ? "pb-[calc(40vh+8rem)]" : replyTo ? "pb-40" : "pb-24"}>
      <div className="mb-4">
        <h1 className="text-[clamp(1.6rem,5vw,2.4rem)] leading-tight text-ink-strong">Chat</h1>
        <p className="text-sm font-medium text-muted">Everyone at the event can see this. Tap a message to react or reply.</p>
      </div>
      {error && <ErrorNote message={error} />}

      <PinnedBar pins={pins} isEditor={isEditor} onUnpin={togglePin} toast={toast} />

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
            const reactions = reactionsByMessage.get(m.id) ?? [];
            const myReaction = reactor ? reactions.find((x) => x.reactor === reactor)?.emoji : null;
            const counts = REACTIONS.map(([k]) => [k, reactions.filter((x) => x.emoji === k).length]).filter(([, n]) => n > 0);
            const isSel = selected === m.id;
            const sticker = stickerOf(m.body);
            return (
              <li
                key={m.id}
                id={`msg-${m.id}`}
                data-msg={m.id}
                className={`flex scroll-mt-48 flex-col ${mine ? "items-end" : "items-start"} ${grouped ? "" : "pt-2"} ${counts.length ? "pb-3" : ""}`}
              >
                {!grouped && (
                  <p className={`mb-1 flex items-center gap-1.5 px-1 text-xs ${mine ? "text-muted" : "text-ink"}`}>
                    {mine ? "You" : m.author}
                    {m.is_editor && <span className="rounded-md bg-accent px-1.5 text-[10px] text-on-accent">Organiser</span>}
                    <span className="font-medium text-muted">{time(m.created_at)}</span>
                  </p>
                )}

                {isSel && (
                  <ActionBar
                    m={m}
                    mineReaction={myReaction}
                    isEditor={isEditor}
                    onReact={(e) => react(m, e)}
                    onReply={() => startReply(m)}
                    onPin={() => togglePin(m)}
                    onDelete={() => remove(m.id)}
                  />
                )}

                <div className="relative max-w-[85%]">
                  <div
                    data-bubble
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(isSel ? null : m.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(isSel ? null : m.id)}
                    aria-label={`Message from ${m.author}. Tap for reactions and reply`}
                    className={`cursor-pointer select-text rounded-2xl text-[15px] leading-snug transition-[filter] ${isSel ? "brightness-95" : ""} ${
                      sticker
                        ? `${m.reply_author ? "bg-surface-2 p-2" : ""} ${isSel ? "bg-surface-2" : ""}`
                        : `px-3.5 py-2.5 ${mine ? "rounded-br-md bg-accent text-on-accent" : m.is_editor ? "rounded-bl-md border border-accent/40 bg-accent/10 text-ink-strong" : "rounded-bl-md bg-surface-2 text-ink-strong"}`
                    }`}
                  >
                    {m.reply_author && (
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!m.reply_to || !jumpTo(m.reply_to)) toast("Original message isn't available");
                        }}
                        className={`mb-1.5 block rounded-md border-l-[3px] px-2.5 py-1.5 text-[13px] ${
                          mine ? "border-on-accent/60 bg-on-accent/10" : "border-accent bg-bg/70"
                        }`}
                      >
                        <span className="block text-xs font-semibold">{m.reply_author}</span>
                        <span className="line-clamp-2 opacity-80">{preview(m.reply_body)}</span>
                      </span>
                    )}
                    {sticker ? (
                      // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs
                      <img src={sticker.src} alt={`Sticker: ${sticker.title}`} width={132} height={132} loading="lazy" draggable={false} className="block size-[132px] select-none" />
                    ) : (
                      <span className="block whitespace-pre-wrap wrap-break-word">{m.body}</span>
                    )}
                    {m.pinned_at && (
                      <span className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                        <Icon name="pin" size={10} /> Pinned
                      </span>
                    )}
                  </div>

                  {counts.length > 0 && (
                    <div className={`absolute -bottom-3.5 flex gap-1 ${mine ? "right-2" : "left-2"}`}>
                      {counts.map(([k, n]) => (
                        <button
                          key={k}
                          onClick={() => react(m, k)}
                          aria-label={`${k} ${n}${myReaction === k ? ", including you" : ""}`}
                          className={`flex h-6 items-center gap-0.5 rounded-full border px-1.5 text-[13px] leading-none shadow-sm ${
                            myReaction === k ? "border-accent bg-accent/25" : "border-line bg-surface"
                          }`}
                        >
                          {EMOJI[k]}
                          {n > 1 && <span className="text-[11px] font-semibold tabular-nums text-ink">{n}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Composer: pinned above the tab bar on phones, at the bottom on desktop */}
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
            <>
              {replyTo && (
                <div className="mb-2 flex items-center gap-2 rounded-md border-l-[3px] border-accent bg-surface-2 py-1.5 pr-1 pl-3">
                  <Icon name="reply" size={16} className="shrink-0 text-accent-ink" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-accent-ink">Replying to {replyTo.author === me ? "yourself" : replyTo.author}</p>
                    <p className="truncate text-sm text-muted">{preview(replyTo.body)}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="grid size-9 shrink-0 place-items-center text-muted hover:text-ink" aria-label="Cancel reply">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              )}
              {picker && (
                <div className="mb-2 rounded-md border border-line bg-surface p-2 shadow-[0_8px_24px_-12px_rgba(47,49,58,0.35)]">
                  <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{stickerPack.pack} stickers</p>
                  <div className="grid max-h-[40vh] grid-cols-4 gap-1 overflow-y-auto sm:grid-cols-6">
                    {stickerPack.stickers.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        disabled={sending}
                        onClick={() => post(`[sticker:${st.id}]`)}
                        className="grid aspect-square place-items-center rounded-md p-1 transition-transform hover:bg-surface-2 active:scale-90 disabled:opacity-50"
                        aria-label={`Send sticker: ${st.title}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs */}
                        <img src={st.src} alt="" width={72} height={72} className="size-full max-w-[84px]" draggable={false} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <form onSubmit={send} className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setPicker((v) => !v)}
                  aria-pressed={picker}
                  aria-label={picker ? "Close stickers" : "Stickers"}
                  className={`grid size-12 shrink-0 place-items-center rounded-md border ${picker ? "border-accent bg-accent/20 text-accent-ink" : "border-line text-muted hover:text-ink"}`}
                >
                  <Icon name={picker ? "close" : "smile"} size={22} />
                </button>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={replyTo ? "Write a reply…" : `Message as ${me}`}
                  maxLength={500}
                  enterKeyHint="send"
                  aria-label="Message"
                />
                <button
                  disabled={!text.trim() || sending}
                  className="grid size-12 shrink-0 place-items-center rounded-md bg-accent text-on-accent disabled:opacity-40"
                  aria-label="Send"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
