"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TieCard from "@/components/matches/TieCard";
import { Podium } from "@/components/matches/MatchesView";
import { MiniStandings } from "@/components/standings/StandingsView";
import Skeleton, { ErrorNote } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { currentStage, tieResult } from "@/lib/tournament";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function ago(iso, now) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const KIND_DOT = { result: "bg-accent", pairing: "bg-ink", announcement: "bg-warn", live: "bg-accent", edit: "bg-muted", score: "bg-muted" };

function Feed() {
  const { activity_log: feed, removeRow } = useLiveData();
  const { isEditor, handleAuthError } = useEditor();
  const toast = useToast();
  const now = useNow();
  const [text, setText] = useState("");

  async function announce(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api("/api/admin/activity_log", { body: { row: { kind: "announcement", message: text.trim().slice(0, 300) } } });
      setText("");
    } catch (err) {
      handleAuthError(err);
      toast(err.message, "error");
    }
  }

  async function remove(id) {
    try {
      await api("/api/admin/activity_log", { method: "DELETE", body: { id } });
      removeRow("activity_log", id);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-lg text-ink-strong">Live feed</h2>
      {isEditor && (
        <form onSubmit={announce} className="mb-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Post an announcement…"
            maxLength={300}
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-base text-ink-strong placeholder:text-muted/70 focus:border-accent focus:outline-none"
          />
          <button className="h-11 shrink-0 rounded-xl bg-accent px-4 text-sm text-on-accent">Post</button>
        </form>
      )}
      {feed.length === 0 ? (
        <p className="py-6 text-center text-sm font-medium text-muted">Scores and results will appear here as they happen.</p>
      ) : (
        <ul className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {feed.map((f) => (
            <li key={f.id} className="flex gap-3">
              <span className={`mt-2 size-2 shrink-0 rounded-full ${KIND_DOT[f.kind] ?? "bg-muted"}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug ${f.kind === "announcement" ? "text-warn" : f.kind === "result" ? "text-ink-strong" : "text-ink"}`}>
                  {f.message}
                </p>
                <p className="mt-0.5 text-xs font-medium text-muted">
                  {ago(f.created_at, now)}
                  {f.actor ? ` · ${f.actor}` : ""}
                </p>
              </div>
              {isEditor && (
                <button onClick={() => remove(f.id)} className="h-8 shrink-0 px-2 text-xs text-muted hover:text-danger" aria-label="Delete feed item">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function LiveView() {
  const { matches, loaded, error, settingsMap } = useLiveData();

  if (!loaded) return <Skeleton rows={4} className="h-48" />;

  const stage = currentStage(matches);
  const results = matches.map((m) => [m, tieResult(m)]);
  const onCourt = results.filter(([m, r]) => r.status !== "completed" && (m.is_live || r.status === "in_progress")).map(([m]) => m);
  const upNext = results
    .filter(([m, r]) => r.status === "pending" && !m.is_live)
    .map(([m]) => m)
    .slice(0, onCourt.length ? 1 : 2);
  const stageLabel = stage === "playoffs" ? "IPL Playoffs" : `Swiss · Round ${stage}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-ink">{stageLabel}</p>
          <h1 className="mt-1 text-[clamp(1.6rem,5vw,2.4rem)] leading-tight text-ink-strong">
            {settingsMap.event_title || "IVP Pickleball 2026"}
          </h1>
        </div>
        {error && <ErrorNote message={error} />}

        <Podium matches={matches} />

        {onCourt.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg text-ink-strong">On court now</h2>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">{onCourt.map((m) => <TieCard key={m.id} match={m} />)}</div>
          </section>
        )}

        {upNext.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg text-ink-strong">Up next</h2>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">{upNext.map((m) => <TieCard key={m.id} match={m} compact />)}</div>
          </section>
        )}

        <Link href="/matches" className="flex h-12 items-center justify-center rounded-xl border border-line text-sm text-muted hover:border-accent/60 hover:text-ink">
          All matches →
        </Link>
      </div>

      <div className="space-y-5">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg text-ink-strong">Top 4</h2>
            <Link href="/standings" className="py-2 text-sm text-muted hover:text-accent-ink">Full table →</Link>
          </div>
          <MiniStandings />
        </section>
        <Feed />
      </div>
    </div>
  );
}
