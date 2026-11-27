"use client";

import Link from "next/link";
import { useState } from "react";
import Flash from "@/components/ui/Flash";
import Icon from "@/components/ui/Icon";
import Sheet from "@/components/ui/Sheet";
import { Field, PrimaryButton, Select } from "@/components/ui/Form";
import ScoreStepper from "./ScoreStepper";
import LineupSheet from "./LineupSheet";
import { api } from "@/lib/api";
import { sourceLabel, tieResult } from "@/lib/tournament";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

export function StatusPill({ status, live }) {
  if (live && status !== "completed")
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs text-on-accent">
        <span className="size-1.5 animate-pulse rounded-full bg-on-accent" /> LIVE
      </span>
    );
  const map = {
    pending: ["Upcoming", "border-line text-muted"],
    in_progress: ["In play", "border-warn/50 text-warn"],
    completed: ["Final", "border-accent/40 text-accent-ink"],
  };
  const [text, cls] = map[status];
  return <span className={`rounded-md border px-2.5 py-1 text-xs ${cls}`}>{text}</span>;
}

function placeholder(match, side) {
  if (match.stage === "playoff") return sourceLabel(side === "a" ? match.a_source : match.b_source);
  return `After R${match.round - 1}`;
}

function TeamsSheet({ match, open, onClose, onSave }) {
  const { teams } = useLiveData();
  const [a, setA] = useState(match.team_a_id ?? "");
  const [b, setB] = useState(match.team_b_id ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={`Teams · ${match.id}`}>
      <p className="mb-4 text-sm font-medium text-muted">Overriding locks this tie, so auto-pairing won&apos;t change it.</p>
      <div className="space-y-3">
        {[["Team A", a, setA], ["Team B", b, setB]].map(([label, val, set]) => (
          <Field key={label} label={label}>
            <Select value={val} onChange={(e) => set(e.target.value)}>
              <option value="">— Not set —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
        ))}
        <PrimaryButton
          busy={busy}
          disabled={a && a === b}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave({ team_a_id: a || null, team_b_id: b || null });
              onClose();
            } catch {
              /* toast shown */
            } finally {
              setBusy(false);
            }
          }}
        >
          Save teams
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function LineupLine({ court }) {
  const { a, b, umpire } = court;
  if (!a.length && !b.length && !umpire) return null;
  return (
    <p className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 text-[11px] font-medium leading-tight text-muted">
      <span className="truncate">{a.join(" & ")}</span>
      <span className="text-muted/60">{umpire ? `Ump: ${umpire}` : ""}</span>
      <span className="truncate text-right">{b.join(" & ")}</span>
    </p>
  );
}

/** Pencil that unlocks one tie / court for this editor; ✓ locks it again. */
function LockToggle({ active, onClick, label, held }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Done editing ${label}` : `Edit ${label}`}
      title={held ? `${held} is editing this` : undefined}
      className={`relative grid size-8 shrink-0 place-items-center rounded-md border transition-colors ${
        active ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:text-ink"
      }`}
    >
      <Icon name={active ? "check" : "edit"} size={15} strokeWidth={2.2} />
      {held && !active && <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-surface bg-warn" />}
    </button>
  );
}

function TeamName({ team, fallback, cls, align = "left" }) {
  if (!team) return <p className={`min-w-0 truncate text-base text-muted sm:text-lg ${align === "right" ? "text-right" : ""}`}>{fallback}</p>;
  return (
    <Link
      href={`/teams/${team.code}`}
      className={`min-w-0 truncate text-base sm:text-lg ${cls} ${align === "right" ? "text-right" : ""} hover:underline`}
    >
      {team.name}
    </Link>
  );
}

export default function TieCard({ match, compact = false }) {
  const { teamsById, playersById, applyRows } = useLiveData();
  const { isEditor, others, target, unlockTarget, bump, handleAuthError } = useEditor();
  const toast = useToast();
  const [sheet, setSheet] = useState(null); // 'teams' | 'lineups' | null

  const r = tieResult(match);
  const A = teamsById.get(match.team_a_id);
  const B = teamsById.get(match.team_b_id);
  const hasTeams = Boolean(A && B);
  const canScore = isEditor && hasTeams;

  // Edit locks: the tie itself (teams / lineups / on court) or a single court.
  const courtTarget = (c) => `${match.id}:${c.key}`;
  const matchUnlocked = target === match.id;
  const holders = (t) => others.filter((o) => o.editing === t).map((o) => o.name).join(", ");
  const editingHere = others.filter((o) => o.editing && o.editing.split(":")[0] === match.id);
  const whatOf = (t) => {
    const key = t.split(":")[1];
    const c = key && tieResult(match).courts.find((x) => x.key === key);
    return c ? `Court ${c.number}` : "this tie";
  };

  function toggle(t) {
    if (target === t) return unlockTarget(null);
    const held = holders(t);
    if (held && !window.confirm(`${held} is already editing ${whatOf(t)}. Edit anyway?`)) return;
    unlockTarget(t);
  }

  const lineupFor = (c) => {
    const l = match.lineups?.[c.key] ?? {};
    const names = (ids = []) => ids.map((id) => playersById.get(id)?.name).filter(Boolean);
    return { a: names(l.a), b: names(l.b), umpire: match.court_officials?.[c.key] };
  };

  async function save(patch) {
    try {
      const { match: row, changed } = await api(`/api/matches/${match.id}`, { method: "PATCH", body: patch });
      applyRows("matches", [row, ...changed]);
      if (changed.length) toast("Next fixtures filled in automatically");
    } catch (e) {
      handleAuthError(e);
      toast(e.message, "error");
      throw e;
    }
  }
  const saveField = (field) => (value) => save({ [field]: value }).catch(() => {});

  // Using an unlocked tie/court keeps it unlocked (it auto-locks when idle).
  function touch() {
    if (target && target.split(":")[0] === match.id) bump();
  }

  const nameCls = (side) => (r.winnerSide === side ? "text-accent-ink" : r.winnerSide ? "text-muted" : "text-ink-strong");
  const showCourts = !compact || r.status !== "pending";

  return (
    <article
      onPointerDownCapture={touch}
      onFocusCapture={touch}
      className={`rounded-2xl border bg-surface p-4 transition-colors ${
        match.is_live && r.status !== "completed" ? "border-accent/60 shadow-[0_0_24px_-12px_var(--accent)]" : "border-line"
      }`}
    >
      {/* Meta row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium text-muted">
          {match.stage === "playoff" ? match.label.split(" (")[0] : match.id.replace("SW-", "")} · {match.start_time}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={r.status} live={match.is_live} />
          {isEditor && <LockToggle active={matchUnlocked} onClick={() => toggle(match.id)} label="this tie" held={holders(match.id)} />}
        </div>
      </div>

      {/* Teams + sets */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <TeamName team={A} fallback={placeholder(match, "a")} cls={nameCls("a")} />
        <p className="text-2xl tabular-nums text-ink-strong">
          <Flash value={r.setsA} /> <span className="text-muted">–</span> <Flash value={r.setsB} />
        </p>
        <TeamName team={B} fallback={placeholder(match, "b")} cls={nameCls("b")} align="right" />
      </div>

      {editingHere.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warn">
          <span className="size-1.5 animate-pulse rounded-full bg-warn" />
          {editingHere.map((o) => `${o.name} · ${whatOf(o.editing)}`).join(", ")}
        </p>
      )}

      {/* Courts */}
      {showCourts && (
        <div className="mt-4 divide-y divide-line/70 border-t border-line/70">
          {r.courts.map((c) =>
            canScore && target === courtTarget(c) ? (
              <div key={c.key} className="py-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-muted">
                  <span className="text-accent-ink">Court {c.number} · editing</span>
                  {!c.valid && (
                    <span className="flex min-w-0 items-center gap-1 text-warn">
                      <Icon name="warn" size={14} /> <span className="truncate">Check score (to {match.race_to}, cap {match.cap})</span>
                    </span>
                  )}
                  <LockToggle active onClick={() => toggle(courtTarget(c))} label={`Court ${c.number}`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ScoreStepper value={c.a} label={`Court ${c.number} ${A.name}`} highlight={c.winner === "a"} onSave={saveField(`${c.key}_a`)} />
                  <ScoreStepper value={c.b} label={`Court ${c.number} ${B.name}`} highlight={c.winner === "b"} onSave={saveField(`${c.key}_b`)} />
                </div>
                <LineupLine court={lineupFor(c)} />
              </div>
            ) : (
              <div key={c.key} className="py-2">
                <div className={`grid items-center text-sm ${canScore ? "grid-cols-[4.5rem_minmax(0,1fr)_auto_minmax(0,1fr)_2rem]" : "grid-cols-[4.5rem_minmax(0,1fr)_auto_minmax(0,1fr)]"}`}>
                  <span className="font-medium text-muted">Court {c.number}</span>
                  <span className={`text-right text-lg tabular-nums ${c.winner === "a" ? "text-accent-ink" : "text-ink-strong"}`}>
                    <Flash value={c.a}>{c.a ?? "–"}</Flash>
                  </span>
                  <span className="px-3 text-muted">:</span>
                  <span className={`text-lg tabular-nums ${c.winner === "b" ? "text-accent-ink" : "text-ink-strong"}`}>
                    <Flash value={c.b}>{c.b ?? "–"}</Flash>
                  </span>
                  {canScore && (
                    <LockToggle active={false} onClick={() => toggle(courtTarget(c))} label={`Court ${c.number}`} held={holders(courtTarget(c))} />
                  )}
                </div>
                <LineupLine court={lineupFor(c)} />
              </div>
            )
          )}
        </div>
      )}

      {/* Footer */}
      {r.status !== "pending" && (
        <p className="mt-3 text-xs font-medium text-muted">
          Points {r.ptsA} – {r.ptsB}
        </p>
      )}
      {isEditor && matchUnlocked && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <button onClick={() => setSheet("teams")} className="h-11 rounded-xl border border-line text-muted hover:text-ink">
            Teams
          </button>
          <button
            onClick={() => setSheet("lineups")}
            disabled={!hasTeams}
            className="h-11 rounded-xl border border-line text-muted hover:text-ink disabled:opacity-40"
          >
            Lineups
          </button>
          <button
            onClick={() => save({ is_live: !match.is_live }).catch(() => {})}
            className={`h-11 rounded-xl border ${match.is_live ? "border-accent bg-accent/15 text-accent-ink" : "border-line text-muted hover:text-ink"}`}
          >
            {match.is_live ? "On court ✓" : "On court"}
          </button>
        </div>
      )}

      {sheet === "teams" && <TeamsSheet match={match} open onClose={() => setSheet(null)} onSave={save} />}
      {sheet === "lineups" && <LineupSheet match={match} open onClose={() => setSheet(null)} onSave={save} />}
    </article>
  );
}
