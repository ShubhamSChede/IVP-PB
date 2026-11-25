"use client";

import Link from "next/link";
import Skeleton, { ErrorNote, PageTitle } from "@/components/ui/Skeleton";
import { computeStandings } from "@/lib/tournament";
import { useLiveData } from "@/components/providers/LiveDataProvider";

export default function TeamsView() {
  const { teams, matches, playersByTeam, loaded, error } = useLiveData();
  const rankOf = new Map(computeStandings(teams, matches).map((s) => [s.teamId, s]));

  return (
    <div>
      <PageTitle title="Teams" subtitle="Tap a team for match history, form and player stats." />
      {error && <ErrorNote message={error} />}
      {!loaded ? (
        <Skeleton rows={6} className="h-32" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const s = rankOf.get(t.id);
            const roster = playersByTeam.get(t.id) ?? [];
            return (
              <li key={t.id}>
                <Link href={`/teams/${t.code}`} className="press block rounded-2xl border border-line bg-surface p-4 active:bg-surface-2">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-sm text-accent-ink">{t.code}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg text-ink-strong">{t.name}</p>
                      <p className="truncate text-sm font-medium text-muted">{t.captain ? `Capt. ${t.captain}` : "No captain set"}</p>
                    </div>
                    {s?.played > 0 && (
                      <div className="text-right">
                        <p className="text-lg tabular-nums text-ink-strong">{s.wins}-{s.losses}</p>
                        <p className="text-xs font-medium text-muted">#{s.rank}</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs font-medium leading-relaxed text-muted">
                    {roster.map((p) => p.name + (p.gender === "F" ? " (F)" : "")).join(" · ") || "No players yet"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
