"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import TeamEditSheet from "./TeamEditSheet";
import { StatusPill } from "@/components/matches/TieCard";
import { EditIconButton } from "@/components/ui/Form";
import Skeleton, { ErrorNote } from "@/components/ui/Skeleton";
import { teamAnalysis } from "@/lib/tournament";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";

const signed = (n) => (n == null ? "–" : n > 0 ? `+${n}` : `${n}`);

/** Horizontal, scrollable team picker — "select a team". */
function TeamSwitcher({ teams, current }) {
  const activeRef = useRef(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);
  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">
      {teams.map((t) => (
        <Link
          key={t.id}
          ref={t.code === current ? activeRef : undefined}
          href={`/teams/${t.code}`}
          replace
          scroll={false}
          className={`shrink-0 rounded-md border px-4 py-2.5 text-sm ${
            t.code === current ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:text-ink"
          }`}
        >
          {t.name}
        </Link>
      ))}
    </div>
  );
}

function Tile({ label, value, sub, tone }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-2xl tabular-nums ${tone === "good" ? "text-accent-ink" : tone === "bad" ? "text-danger/90" : "text-ink-strong"}`}>{value}</p>
      {sub && <p className="text-xs font-medium text-muted">{sub}</p>}
    </div>
  );
}

function Section({ title, children, aside }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg text-ink-strong">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function HistoryCard({ h, teamsById }) {
  const opp = teamsById.get(h.opponentId);
  const badge =
    h.result === "W" ? "bg-accent text-on-accent" : h.result === "L" ? "bg-danger/20 text-danger" : "";
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{h.stage} · {h.time}</p>
        {h.result ? (
          <span className={`rounded-md px-2.5 py-1 text-xs ${badge}`}>{h.result === "W" ? "Won" : "Lost"}</span>
        ) : (
          <StatusPill status={h.status} live={h.live} />
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-base text-ink-strong">
          <span className="text-muted">vs </span>
          {opp ? <Link href={`/teams/${opp.code}`} className="hover:underline">{opp.name}</Link> : "TBD"}
        </p>
        {h.status !== "pending" && <p className="text-xl tabular-nums text-ink-strong">{h.setsUs}–{h.setsThem}</p>}
      </div>
      {h.status !== "pending" && (
        <ul className="mt-3 space-y-1.5 border-t border-line/70 pt-3">
          {h.courts.map((c) => (
            <li key={c.number} className="grid grid-cols-[2.25rem_3.5rem_1fr] items-center gap-2 text-sm">
              <span className="text-xs font-medium text-muted">C{c.number}</span>
              <span className={`tabular-nums ${c.won ? "text-accent-ink" : c.won === false ? "text-ink" : "text-muted"}`}>
                {c.us ?? "–"}–{c.them ?? "–"}
              </span>
              <span className="truncate text-xs font-medium text-muted">{c.ourPlayers.join(" & ")}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TeamDetail({ code }) {
  const { teams, players, matches, teamsById, loaded, error } = useLiveData();
  const { isEditor } = useEditor();
  const [editing, setEditing] = useState(false);

  if (!loaded) return <Skeleton rows={4} className="h-28" />;
  if (error) return <ErrorNote message={error} />;

  const team = teams.find((t) => t.code === code);
  if (!team) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-ink-strong">Team not found</p>
        <Link href="/teams" className="mt-2 inline-block text-sm text-accent-ink">All teams →</Link>
      </div>
    );
  }

  const a = teamAnalysis(team.id, { teams, players, matches });
  const t = a.totals;

  return (
    <div>
      <TeamSwitcher teams={teams} current={code} />

      {/* Hero */}
      <section className="theme-dark rounded-md border-t-2 border-accent bg-bg p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {a.standing?.played > 0 && (
                <span className="rounded-md bg-accent/15 px-2.5 py-1 text-xs text-accent-ink">#{a.standing.rank} in Swiss</span>
              )}
              {a.playoff && <span className="rounded-md bg-accent px-2.5 py-1 text-xs text-on-accent">{a.playoff}</span>}
            </div>
            <h1 className="mt-2 text-[clamp(1.6rem,7vw,2.4rem)] leading-tight text-ink-strong">{team.name}</h1>
            <p className="text-sm font-medium text-muted">{team.captain ? `Captain ${team.captain}` : "No captain set"}</p>
          </div>
          {isEditor && <EditIconButton label={`Edit ${team.name}`} onClick={() => setEditing(true)} />}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted">Record</p>
            <p className="text-4xl tabular-nums text-ink-strong">{t.wins}–{t.losses}</p>
          </div>
          {a.form.length > 0 && (
            <div className="flex gap-1.5" aria-label={`Form: ${a.form.join(" ")}`}>
              {a.form.map((f, i) => (
                <span key={i} className={`grid size-8 place-items-center rounded-lg text-sm ${f === "W" ? "bg-accent text-on-accent" : "bg-danger/20 text-danger"}`}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stat tiles */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Sets won" value={`${t.setsWon}–${t.setsLost}`} sub={t.setWinPct != null ? `${t.setWinPct}% of sets` : "No sets yet"} />
        <Tile label="Point diff" value={signed(t.diff)} sub={`${t.ptsFor} for · ${t.ptsAgainst} against`} tone={t.diff > 0 ? "good" : t.diff < 0 ? "bad" : undefined} />
        <Tile label="Avg margin / set" value={signed(t.avgSetMargin)} sub="points per set" />
        <Tile label="Close sets" value={`${t.closeWon}–${t.closeLost}`} sub="decided by ≤ 2 pts" />
      </div>

      {/* Court record */}
      <Section title="By court">
        <div className="grid grid-cols-3 gap-2">
          {a.courtRecord.map((c) => {
            const total = c.won + c.lost;
            return (
              <div key={c.court} className="rounded-2xl border border-line bg-surface p-3">
                <p className="text-xs font-medium text-muted">Court {c.court}</p>
                <p className="mt-1 text-xl tabular-nums text-ink-strong">{c.won}–{c.lost}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-md bg-line">
                  <div className="h-full rounded-md bg-accent" style={{ width: total ? `${(c.won / total) * 100}%` : 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* History */}
      <Section title="Matches" aside={<span className="text-xs font-medium text-muted">{a.history.length} {a.history.length === 1 ? "tie" : "ties"}</span>}>
        {a.history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm font-medium text-muted">No fixtures yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {a.history.map((h) => <HistoryCard key={h.matchId} h={h} teamsById={teamsById} />)}
          </ul>
        )}
      </Section>

      {/* Players */}
      <Section title="Players" aside={a.hasLineups ? <span className="text-xs font-medium text-muted">sets won / played</span> : null}>
        {a.bestPair && (
          <div className="mb-3 rounded-2xl border border-accent/40 bg-accent/[0.06] p-4">
            <p className="text-xs font-medium text-accent-ink">Best pair</p>
            <p className="mt-1 text-base text-ink-strong">{a.bestPair.names.join(" & ")}</p>
            <p className="text-sm font-medium text-muted">Won {a.bestPair.won} of {a.bestPair.sets} sets together</p>
          </div>
        )}
        <ul className="divide-y divide-line/70 rounded-2xl border border-line bg-surface">
          {a.players.map(({ player, sets, won, ptsFor, ptsAgainst }) => (
            <li key={player.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-ink-strong">
                {player.name}
                {player.gender === "F" && <span className="ml-1.5 rounded-md border border-accent/50 px-1.5 text-[10px] text-accent-ink">F</span>}
              </span>
              {a.hasLineups && (
                <span className="text-right text-sm tabular-nums">
                  <span className="text-ink-strong">{won}/{sets}</span>
                  <span className="block text-[11px] font-medium text-muted">{sets ? signed(ptsFor - ptsAgainst) : "–"} pts</span>
                </span>
              )}
            </li>
          ))}
        </ul>
        {!a.hasLineups && (
          <p className="mt-2 text-xs font-medium text-muted">Player stats appear once organisers record who played each court.</p>
        )}
      </Section>

      {editing && <TeamEditSheet team={team} open onClose={() => setEditing(false)} />}
    </div>
  );
}
