import { tieResult } from "./tie.js";

// Ported from the Standings sheet's "Sort Score":
// 1) tie wins → 2) sets won → 3) point diff → 4) points for → 5) original team order.
// Only COMPLETED ties count, so standings don't jump around mid-tie.

/**
 * @param teams   rows from `teams`
 * @param matches rows from `matches`
 * @param rounds  which Swiss rounds to include (Swiss engine ranks after R1, then after R1+R2)
 */
export function computeStandings(teams, matches, { rounds = [1, 2, 3] } = {}) {
  const rows = new Map(
    teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        team: t,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        ptsFor: 0,
        ptsAgainst: 0,
        diff: 0,
      },
    ])
  );

  for (const m of matches) {
    if (m.stage !== "swiss" || !rounds.includes(m.round)) continue;
    const A = rows.get(m.team_a_id);
    const B = rows.get(m.team_b_id);
    if (!A || !B) continue;
    const r = tieResult(m);
    if (r.status !== "completed") continue;

    A.played++; B.played++;
    A.setsWon += r.setsA; A.setsLost += r.setsB;
    B.setsWon += r.setsB; B.setsLost += r.setsA;
    A.ptsFor += r.ptsA; A.ptsAgainst += r.ptsB;
    B.ptsFor += r.ptsB; B.ptsAgainst += r.ptsA;
    if (r.winnerSide === "a") { A.wins++; B.losses++; }
    if (r.winnerSide === "b") { B.wins++; A.losses++; }
  }

  const list = [...rows.values()];
  for (const r of list) r.diff = r.ptsFor - r.ptsAgainst;

  list.sort(
    (x, y) =>
      y.wins - x.wins ||
      y.setsWon - x.setsWon ||
      y.diff - x.diff ||
      y.ptsFor - x.ptsFor ||
      (x.team.sort ?? 0) - (y.team.sort ?? 0)
  );

  return list.map((r, i) => ({ ...r, rank: i + 1 }));
}
