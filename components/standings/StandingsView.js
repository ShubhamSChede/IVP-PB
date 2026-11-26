"use client";

import Link from "next/link";
import Flash from "@/components/ui/Flash";
import Skeleton, { ErrorNote, PageTitle } from "@/components/ui/Skeleton";
import { useState } from "react";
import { computeStandings, swissMatches, tieResult } from "@/lib/tournament";
import { useLiveData } from "@/components/providers/LiveDataProvider";

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const TOP = 4;

// One big gold parallelogram holding the playoff places. Slanted edges via
// clip-path with a fixed slant, so the angle is the same at any height;
// content is padded past the slant so nothing gets cut.
const SLANT = 26; // px
const PARALLELOGRAM = `polygon(${SLANT}px 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)`;

function Qual({ rank, onGold = false }) {
  if (rank <= 2)
    return (
      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${onGold ? "bg-on-accent text-accent" : "bg-accent text-on-accent"}`}>Q1</span>
    );
  if (rank <= 4)
    return (
      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${onGold ? "border-on-accent/50 text-on-accent" : "border-accent/60 text-accent-ink"}`}>Elim</span>
    );
  return null;
}

/** Plain rank number, fixed width so columns line up. */
function Rank({ rank, size = "md" }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center tabular-nums font-semibold ${size === "sm" ? "w-8 text-sm" : "w-10 text-lg"}`}>
      {rank}
    </span>
  );
}

export function useStandings() {
  const { teams, matches } = useLiveData();
  return computeStandings(teams, matches);
}

/**
 * The top-4 block. `compact` = Live page (rank, team, record);
 * full = Standings page (adds sets/diff/played, and table columns on md+).
 */
export function TopFour({ rows, compact = false, qual = true }) {
  const top = rows.slice(0, TOP);
  return (
    <section className="bg-accent italic text-on-accent" style={{ clipPath: PARALLELOGRAM }} aria-label="Top 4: playoff places">
      <div style={{ paddingLeft: SLANT + 14, paddingRight: SLANT + 14 }} className={compact ? "py-3" : "py-4"}>
        {!compact && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-on-accent/70">
            Playoff zone · Top {TOP}
          </p>
        )}

        {/* Desktop column headers (full view only) */}
        {!compact && (
          <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_repeat(7,4.25rem)_3.5rem] gap-2 border-b border-on-accent/20 pb-2 text-xs font-semibold text-on-accent/70 md:grid">
            {["#", "Team", "P", "W", "L", "Sets", "Pts for", "Pts ag.", "Diff", ""].map((h, i) => (
              <span key={i} className={h === "Team" ? "" : "text-center"}>{h}</span>
            ))}
          </div>
        )}

        <ol className="divide-y divide-on-accent/15">
          {top.map((r) => (
            <li key={r.teamId}>
              <Link
                href={`/teams/${r.team.code}`}
                className={`grid items-center gap-2 tabular-nums hover:bg-on-accent/5 ${compact ? "grid-cols-[2rem_minmax(0,1fr)_auto] py-2" : "grid-cols-[2.5rem_minmax(0,1fr)_auto] py-2.5 md:grid-cols-[2.5rem_minmax(0,1fr)_repeat(7,4.25rem)_3.5rem]"}`}
              >
                <Rank rank={r.rank} size={compact ? "sm" : "md"} />

                {/* Team (+ phone stats line) */}
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`truncate font-bold ${compact ? "text-[15px]" : "text-base"}`}>{r.team.name}</span>
                    {!compact && <span className="md:hidden">{qual && <Qual rank={r.rank} onGold />}</span>}
                  </span>
                  {!compact && (
                    <span className="block text-xs font-medium text-on-accent/70 md:hidden">
                      Sets {r.setsWon}-{r.setsLost} · Diff {signed(r.diff)} · P {r.played}
                    </span>
                  )}
                </span>

                {/* Record (phones / compact) */}
                <span className={`font-bold ${compact ? "text-sm" : "text-xl md:hidden"}`}>
                  <Flash value={`${r.wins}-${r.losses}`} />
                </span>

                {/* Desktop columns */}
                {!compact && (
                  <>
                    <span className="hidden text-center text-sm md:block">{r.played}</span>
                    <span className="hidden text-center text-sm font-bold md:block"><Flash value={r.wins} /></span>
                    <span className="hidden text-center text-sm md:block">{r.losses}</span>
                    <span className="hidden text-center text-sm md:block"><Flash value={`${r.setsWon}-${r.setsLost}`} /></span>
                    <span className="hidden text-center text-sm md:block">{r.ptsFor}</span>
                    <span className="hidden text-center text-sm md:block">{r.ptsAgainst}</span>
                    <span className="hidden text-center text-sm font-semibold md:block">{signed(r.diff)}</span>
                    <span className="hidden text-center md:block">{qual && <Qual rank={r.rank} onGold />}</span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Live page "Top 4" box. */
export function MiniStandings() {
  return <TopFour rows={useStandings()} compact />;
}

// Ranking snapshots: live table, or the table as it stood at the end of a round.
const VIEWS = [
  { key: "now", label: "Current", rounds: [1, 2, 3] },
  { key: "r1", label: "EO R1", rounds: [1], round: 1 },
  { key: "r2", label: "EO R2", rounds: [1, 2], round: 2 },
  { key: "r3", label: "EO R3", rounds: [1, 2, 3], round: 3 },
];

function roundProgress(matches, round) {
  const ties = swissMatches(matches, round);
  const done = ties.filter((m) => tieResult(m).status === "completed").length;
  return { done, total: ties.length };
}

export default function StandingsView() {
  const { loaded, error, teams, matches } = useLiveData();
  const [view, setView] = useState("now");
  const active = VIEWS.find((v) => v.key === view);
  const rows = computeStandings(teams, matches, { rounds: active.rounds });
  const rest = rows.slice(TOP);
  const progress = active.round ? roundProgress(matches, active.round) : null;

  return (
    <div>
      <PageTitle title="Standings" subtitle="Tie wins → sets won → point diff → points for. Top 2 to Qualifier 1, 3rd–4th to the Eliminator.">
        <Link href="/teams" className="flex h-11 items-center rounded-md border border-line px-4 text-sm text-muted hover:text-ink">
          All teams
        </Link>
      </PageTitle>
      <p className="-mt-2 mb-3 text-xs font-medium text-muted lg:hidden">Tap a team for its history and player stats.</p>
      {error && <ErrorNote message={error} />}

      {/* Snapshot toggle */}
      <div role="tablist" aria-label="Ranking after" className="mb-4 grid grid-cols-4 gap-1 rounded-md border border-line bg-surface-2 p-1">
        {VIEWS.map((v) => {
          const on = v.key === view;
          const p = v.round && loaded ? roundProgress(matches, v.round) : null;
          const empty = p && p.done === 0;
          return (
            <button
              key={v.key}
              role="tab"
              aria-selected={on}
              disabled={empty}
              onClick={() => setView(v.key)}
              className={`h-10 rounded-[3px] text-[13px] font-semibold tracking-wide transition-colors disabled:opacity-35 ${
                on ? "bg-on-accent text-accent shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      {progress && progress.done < progress.total && (
        <p className="-mt-2 mb-3 text-xs font-medium text-warn">
          Round {active.round} isn&apos;t finished: {progress.done} of {progress.total} ties done. Showing results so far.
        </p>
      )}

      {!loaded ? (
        <Skeleton rows={6} className="h-16" />
      ) : (
        <>
          <TopFour rows={rows} qual={!active.round || active.round === 3} />

          {/* Ranks 5–10 — detached from the playoff block */}
          <div className="mt-8">
            {/* Phones: cards */}
            <ol className="space-y-2 md:hidden">
              {rest.map((r) => (
                <li key={r.teamId}>
                  <Link
                    href={`/teams/${r.team.code}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:bg-surface-2"
                  >
                    <span className="text-muted"><Rank rank={r.rank} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base text-ink-strong">{r.team.name}</p>
                      <p className="text-xs font-medium text-muted tabular-nums">
                        Sets {r.setsWon}-{r.setsLost} · Diff {signed(r.diff)} · P {r.played}
                      </p>
                    </div>
                    <span className="text-xl tabular-nums text-ink-strong">
                      <Flash value={`${r.wins}-${r.losses}`} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>

            {/* Tablet / desktop: table */}
            <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
              <table className="w-full text-sm tabular-nums">
                <thead className="bg-surface text-left text-xs text-muted">
                  <tr>
                    {["#", "Team", "P", "W", "L", "Sets", "Pts for", "Pts ag.", "Diff"].map((h) => (
                      <th key={h} className={`px-3 py-3 font-semibold ${h === "Team" ? "" : "text-center"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {rest.map((r) => (
                    <tr key={r.teamId}>
                      <td className="px-3 py-3 text-center text-muted"><Rank rank={r.rank} size="sm" /></td>
                      <td className="px-3 py-3">
                        <Link href={`/teams/${r.team.code}`} className="text-base text-ink-strong hover:text-accent-ink">{r.team.name}</Link>
                      </td>
                      <td className="px-3 text-center">{r.played}</td>
                      <td className="px-3 text-center text-ink-strong"><Flash value={r.wins} /></td>
                      <td className="px-3 text-center">{r.losses}</td>
                      <td className="px-3 text-center"><Flash value={`${r.setsWon}-${r.setsLost}`} /></td>
                      <td className="px-3 text-center">{r.ptsFor}</td>
                      <td className="px-3 text-center">{r.ptsAgainst}</td>
                      <td className={`px-3 text-center ${r.diff > 0 ? "text-accent-ink" : r.diff < 0 ? "text-danger/80" : ""}`}>{signed(r.diff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
