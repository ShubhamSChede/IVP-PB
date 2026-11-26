// A tie = 3 sets played in parallel on Courts 3–5. Best of 3 sets wins.
// Ported from Swiss_Matches columns L–R of the workbook.

export const COURTS = ["c1", "c2", "c3"];
/** Venue court numbers shown to people (data keys stay c1–c3). */
export const COURT_NUMBERS = [3, 4, 5];

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Is a finished set score possible under "race to N, win by 2, hard cap"?
 * e.g. race 15 / cap 17 → valid: 15-0…15-13, 16-14, 17-15, 17-16.
 * Forfeits (0–15) are valid. Used only to warn editors, never to block.
 */
export function isValidSetScore(a, b, raceTo = 15, cap = 17) {
  const w = Math.max(a, b);
  const l = Math.min(a, b);
  if (w === l) return false;
  if (w === raceTo) return l <= raceTo - 2;
  if (w > raceTo && w < cap) return w - l === 2;
  if (w === cap) return l >= cap - 2;
  return false;
}

/** Everything derivable from one match row. */
export function tieResult(match) {
  let setsA = 0;
  let setsB = 0;
  let ptsA = 0;
  let ptsB = 0;
  let entered = 0;

  const courts = COURTS.map((c, i) => {
    const a = match[`${c}_a`];
    const b = match[`${c}_b`];
    if (isNum(a)) { entered++; ptsA += a; }
    if (isNum(b)) { entered++; ptsB += b; }
    const done = isNum(a) && isNum(b);
    const winner = done && a !== b ? (a > b ? "a" : "b") : null;
    if (winner === "a") setsA++;
    if (winner === "b") setsB++;
    return {
      key: c,
      number: COURT_NUMBERS[i],
      index: i,
      a: isNum(a) ? a : null,
      b: isNum(b) ? b : null,
      done,
      winner,
      valid: done ? isValidSetScore(a, b, match.race_to, match.cap) : true,
    };
  });

  const status = entered === 6 ? "completed" : entered > 0 ? "in_progress" : "pending";

  // Two sets decides it, even before the third court finishes (playoff advancement).
  let winnerSide = null;
  if (setsA >= 2 || setsB >= 2) winnerSide = setsA > setsB ? "a" : "b";
  else if (status === "completed" && setsA !== setsB) winnerSide = setsA > setsB ? "a" : "b";

  return {
    courts,
    setsA,
    setsB,
    ptsA,
    ptsB,
    status,
    winnerSide,
    winnerId: winnerSide === "a" ? match.team_a_id : winnerSide === "b" ? match.team_b_id : null,
    loserId: winnerSide === "a" ? match.team_b_id : winnerSide === "b" ? match.team_a_id : null,
    hasInvalidScore: courts.some((c) => !c.valid),
  };
}
