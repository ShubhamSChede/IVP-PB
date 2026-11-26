"use client";

import { useState } from "react";
import TieCard from "./TieCard";
import Icon from "@/components/ui/Icon";
import Skeleton, { ErrorNote, PageTitle } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { currentStage, podium, swissMatches, tieResult } from "@/lib/tournament";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

const TABS = [
  { key: 1, short: "R1", long: "Round 1" },
  { key: 2, short: "R2", long: "Round 2" },
  { key: 3, short: "R3", long: "Round 3" },
  { key: "playoffs", short: "Playoffs", long: "Playoffs" },
];

export function Podium({ matches }) {
  const { teamsById } = useLiveData();
  const places = podium(matches);
  if (!places.some((p) => p.teamId)) return null;
  return (
    <section className="theme-dark mb-4 rounded-md border-t-2 border-accent bg-bg p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent-ink">Final podium</h2>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {places.map((p, i) => (
          <li key={p.place} className="rounded-md border border-line bg-surface p-3">
            <p className="text-xs font-medium text-muted">{p.place}</p>
            <p className={`truncate ${i === 0 ? "text-xl text-accent-ink" : "text-base text-ink-strong"}`}>
              {teamsById.get(p.teamId)?.name ?? "TBD"}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RerunButton({ scope }) {
  const { applyRows } = useLiveData();
  const { handleAuthError } = useEditor();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(force = false) {
    setBusy(true);
    try {
      const { changed } = await api("/api/pairing", { body: { scope, force } });
      applyRows("matches", changed);
      toast("Pairings re-run");
    } catch (e) {
      handleAuthError(e);
      if (e.data?.needsForce && window.confirm(`${e.message} Re-pair anyway? Scores stay, teams change.`)) return run(true);
      if (!e.data?.needsForce) toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      disabled={busy}
      onClick={() =>
        window.confirm("Clear this stage's teams and re-pair from current results?") && run()
      }
      className="flex h-11 items-center gap-2 rounded-md border border-line px-4 text-sm text-muted hover:text-ink disabled:opacity-50"
    >
      <Icon name="refresh" size={16} /> {busy ? "Re-pairing…" : "Re-run pairing"}
    </button>
  );
}

export default function MatchesView() {
  const { matches, loaded, error } = useLiveData();
  const { isEditor } = useEditor();
  const [picked, setPicked] = useState(null);

  const stage = picked ?? (loaded ? currentStage(matches) : 1);
  const list = stage === "playoffs" ? matches.filter((m) => m.stage === "playoff") : swissMatches(matches, stage);
  const done = list.filter((m) => tieResult(m).status === "completed").length;

  return (
    <div>
      <PageTitle title="Matches" subtitle="Each tie is 3 sets on Courts 3–5 at once. Best of 3 wins." />

      {/* Stage tabs — full-width segmented control on phones */}
      <div className="sticky top-[calc(5.5rem+2px+env(safe-area-inset-top))] z-30 -mx-4 mb-4 bg-bg/85 px-4 py-2 backdrop-blur-xl md:-mx-6 md:px-6 lg:top-[calc(6rem+2px)]">
      <div role="tablist" className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-1 sm:inline-grid">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={stage === t.key}
            onClick={() => setPicked(t.key)}
            className={`h-11 rounded-xl px-3 text-sm transition-colors sm:px-5 ${
              stage === t.key ? "bg-accent text-on-accent" : "text-muted hover:text-ink"
            }`}
          >
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.long}</span>
          </button>
        ))}
      </div>
      </div>

      {error && <ErrorNote message={error} />}

      {!loaded ? (
        <Skeleton rows={4} className="h-52" />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted">
              {done}/{list.length} completed
              {stage === 2 || stage === 3 ? " · auto-paired when the previous round finishes" : ""}
            </p>
            {isEditor && stage !== 1 && <RerunButton scope={stage === "playoffs" ? "playoffs" : `round:${stage}`} />}
          </div>
          {stage === "playoffs" && <Podium matches={matches} />}
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((m) => (
              <TieCard key={m.id} match={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
