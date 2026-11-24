import { computeStandings } from "./standings.js";
import { tieResult } from "./tie.js";

// Swiss auto-pairing (replaces the Swiss_Engine sheet).
// Rank teams on results so far, then: highest unpaired seed plays the
// highest-ranked opponent it hasn't met. Backtracks if a greedy choice would
// force a rematch lower down. This reproduces the workbook exactly:
//   R2: 1v2, 3v4, 5v6 (→ 5v7 + 6v8 if 5 & 6 met in R1), 7v8, 9v10
//   R3: top seed vs highest unplayed opponent, zero rematches at the bottom.

export const SWISS_ROUNDS = [1, 2, 3];

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function swissMatches(matches, round) {
  return matches
    .filter((m) => m.stage === "swiss" && m.round === round)
    .sort((a, b) => a.sort - b.sort);
}

/** All 5 ties of the round have teams and all 6 court scores. */
export function isRoundComplete(matches, round) {
  const list = swissMatches(matches, round);
  return (
    list.length > 0 &&
    list.every((m) => m.team_a_id && m.team_b_id && tieResult(m).status === "completed")
  );
}

export function isSwissComplete(matches) {
  return SWISS_ROUNDS.every((r) => isRoundComplete(matches, r));
}

function playedPairs(matches, beforeRound) {
  const set = new Set();
  for (const m of matches) {
    if (m.stage === "swiss" && m.round < beforeRound && m.team_a_id && m.team_b_id) {
      set.add(pairKey(m.team_a_id, m.team_b_id));
    }
  }
  return set;
}

function backtrack(seeds, played, allowRematch) {
  if (seeds.length === 0) return [];
  const [top, ...rest] = seeds;
  for (let i = 0; i < rest.length; i++) {
    const opp = rest[i];
    if (!allowRematch && played.has(pairKey(top, opp))) continue;
    const sub = backtrack([...rest.slice(0, i), ...rest.slice(i + 1)], played, allowRematch);
    if (sub) return [[top, opp], ...sub];
  }
  return null;
}

/**
 * Pairings for `round` (2 or 3) from results of the earlier rounds.
 * Returns { pairs: [[teamAId, teamBId], ...] in tie order, seeds, rematch }.
 */
export function pairSwissRound(teams, matches, round) {
  const earlier = SWISS_ROUNDS.filter((r) => r < round);
  const seeds = computeStandings(teams, matches, { rounds: earlier }).map((r) => r.teamId);
  const played = playedPairs(matches, round);
  const clean = backtrack(seeds, played, false);
  // A rematch is only possible in tiny/odd fields; never with 10 teams & 3 rounds.
  return clean
    ? { pairs: clean, seeds, rematch: false }
    : { pairs: backtrack(seeds, played, true), seeds, rematch: true };
}
