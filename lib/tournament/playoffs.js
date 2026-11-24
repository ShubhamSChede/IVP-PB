import { tieResult } from "./tie.js";

// IPL-style playoffs (replaces IPL_Playoffs sheet).
// Each playoff slot has a source: 'standing:1', 'winner:PL-Q1', 'loser:PL-Q1'.

const SHORT = { "PL-Q1": "Q1", "PL-EL": "Eliminator", "PL-Q2": "Q2", "PL-GF": "Final" };

/** Team id for a slot, or null when not yet decided. */
export function resolveSource(source, { standings, matches, swissComplete }) {
  if (!source) return null;
  const [kind, ref] = source.split(":");
  if (kind === "standing") {
    return swissComplete ? standings[Number(ref) - 1]?.teamId ?? null : null;
  }
  const m = matches.find((x) => x.id === ref);
  if (!m) return null;
  const r = tieResult(m);
  return kind === "winner" ? r.winnerId : kind === "loser" ? r.loserId : null;
}

/** Human label for an undecided slot: "Swiss #1", "Winner Q1". */
export function sourceLabel(source) {
  if (!source) return "TBD";
  const [kind, ref] = source.split(":");
  if (kind === "standing") return `Swiss #${ref}`;
  const name = SHORT[ref] ?? ref;
  return `${kind === "winner" ? "Winner" : "Loser"} ${name}`;
}

/** Final podium; each place is null until decided. */
export function podium(matches) {
  const get = (id) => {
    const m = matches.find((x) => x.id === id);
    return m ? tieResult(m) : null;
  };
  const gf = get("PL-GF");
  const q2 = get("PL-Q2");
  const el = get("PL-EL");
  return [
    { place: "Champion", teamId: gf?.winnerId ?? null },
    { place: "Runner-up", teamId: gf?.loserId ?? null },
    { place: "3rd", teamId: q2?.loserId ?? null },
    { place: "4th", teamId: el?.loserId ?? null },
  ];
}
