"use client";

import Link from "next/link";
import Flash from "@/components/ui/Flash";
import Skeleton, { ErrorNote, PageTitle } from "@/components/ui/Skeleton";
import { computeStandings } from "@/lib/tournament";
import { useLiveData } from "@/components/providers/LiveDataProvider";

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

function Qual({ rank }) {
  if (rank <= 2) return <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-black">Q1</span>;
  if (rank <= 4) return <span className="rounded-full border border-accent/60 px-2 py-0.5 text-[11px] text-accent">Elim</span>;
  return null;
}

export function useStandings() {
  const { teams, matches } = useLiveData();
  return computeStandings(teams, matches);
}

export function MiniStandings({ limit = 4 }) {
  const rows = useStandings().slice(0, limit);
  return (
    <ol className="divide-y divide-line/70">
      {rows.map((r) => (
        <li key={r.teamId} className="flex items-center gap-3 py-2.5">
          <span className="w-6 text-center text-muted tabular-nums">{r.rank}</span>
          <Link href={`/teams/${r.team.code}`} className="min-w-0 flex-1 truncate text-ink-strong hover:text-accent">
            {r.team.name}
          </Link>
          <span className="text-sm tabular-nums text-muted">
            <Flash value={`${r.wins}-${r.losses}`} />
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function StandingsView() {
  const { loaded, error } = useLiveData();
  const rows = useStandings();

  return (
    <div>
      <PageTitle title="Standings" subtitle="Tie wins → sets won → point diff → points for. Top 2 to Qualifier 1, 3rd–4th to the Eliminator.">
        <Link href="/teams" className="flex h-11 items-center rounded-full border border-line px-4 text-sm text-muted hover:text-ink">
          All teams
        </Link>
      </PageTitle>
      <p className="-mt-2 mb-3 text-xs font-medium text-muted lg:hidden">Tap a team for its history and player stats.</p>
      {error && <ErrorNote message={error} />}
      {!loaded ? (
        <Skeleton rows={6} className="h-16" />
      ) : (
        <>
          {/* Phones: cards */}
          <ol className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.teamId}>
                <Link
                  href={`/teams/${r.team.code}`}
                  className={`flex items-center gap-3 rounded-2xl border bg-surface p-3 active:bg-surface-2 ${r.rank <= 4 ? "border-accent/30" : "border-line"}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full text-lg ${r.rank <= 4 ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"}`}>
                    {r.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base text-ink-strong">{r.team.name}</p>
                      <Qual rank={r.rank} />
                    </div>
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
                  {["#", "Team", "P", "W", "L", "Sets", "Pts for", "Pts ag.", "Diff", ""].map((h) => (
                    <th key={h} className={`px-3 py-3 font-semibold ${h === "Team" ? "" : "text-center"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {rows.map((r) => (
                  <tr key={r.teamId} className={r.rank <= 4 ? "bg-accent/[0.04]" : ""}>
                    <td className="px-3 py-3 text-center text-muted">{r.rank}</td>
                    <td className="px-3 py-3">
                      <Link href={`/teams/${r.team.code}`} className="text-base text-ink-strong hover:text-accent">{r.team.name}</Link>
                    </td>
                    <td className="px-3 text-center">{r.played}</td>
                    <td className="px-3 text-center text-ink-strong"><Flash value={r.wins} /></td>
                    <td className="px-3 text-center">{r.losses}</td>
                    <td className="px-3 text-center"><Flash value={`${r.setsWon}-${r.setsLost}`} /></td>
                    <td className="px-3 text-center">{r.ptsFor}</td>
                    <td className="px-3 text-center">{r.ptsAgainst}</td>
                    <td className={`px-3 text-center ${r.diff > 0 ? "text-accent" : r.diff < 0 ? "text-danger/80" : ""}`}>{signed(r.diff)}</td>
                    <td className="px-3 text-center"><Qual rank={r.rank} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
