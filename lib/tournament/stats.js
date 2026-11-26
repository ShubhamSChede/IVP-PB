import { computeStandings } from "./standings.js";
import { COURT_NUMBERS, tieResult } from "./tie.js";

// Team analysis for /teams/[code]: history, totals, court-by-court record,
// form, and player/pair stats from per-court lineups (when recorded).

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function stageName(m) {
  return m.stage === "playoff" ? m.label.split(" (")[0] : `Round ${m.round}`;
}

/** Where the team finished / stands in the playoffs, if anywhere. */
function playoffOutcome(teamId, matches) {
  const r = (id) => {
    const m = matches.find((x) => x.id === id);
    return m ? tieResult(m) : null;
  };
  const gf = r("PL-GF");
  if (gf?.winnerId === teamId) return "Champion";
  if (gf?.loserId === teamId) return "Runner-up";
  if (r("PL-Q2")?.loserId === teamId) return "3rd place";
  if (r("PL-EL")?.loserId === teamId) return "4th place";
  return null;
}

export function teamAnalysis(teamId, { teams, players, matches }) {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;
  const roster = players.filter((p) => p.team_id === teamId);
  const name = (pid) => players.find((p) => p.id === pid)?.name ?? "?";

  const standings = computeStandings(teams, matches);
  const standing = standings.find((s) => s.teamId === teamId);

  const history = [];
  const totals = { played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, ptsFor: 0, ptsAgainst: 0, closeWon: 0, closeLost: 0 };
  const courtRecord = COURT_NUMBERS.map((n) => ({ court: n, won: 0, lost: 0 }));
  const playerStats = new Map(roster.map((p) => [p.id, { player: p, sets: 0, won: 0, ptsFor: 0, ptsAgainst: 0 }]));
  const pairStats = new Map();
  const opponents = new Map(); // h2h

  const ordered = [...matches].sort((a, b) => a.sort - b.sort);
  for (const m of ordered) {
    const side = m.team_a_id === teamId ? "a" : m.team_b_id === teamId ? "b" : null;
    if (!side) continue;
    const opp = side === "a" ? m.team_b_id : m.team_a_id;
    const r = tieResult(m);
    const mine = (x) => (side === "a" ? x.a : x.b);
    const theirs = (x) => (side === "a" ? x.b : x.a);

    const courts = r.courts.map((c) => {
      const lineup = m.lineups?.[c.key] ?? {};
      const ours = (lineup[side] ?? []).filter(Boolean);
      const them = (lineup[side === "a" ? "b" : "a"] ?? []).filter(Boolean);
      const won = c.winner ? c.winner === side : null;

      if (c.done) {
        const rec = courtRecord[c.index];
        if (won) rec.won++; else if (won === false) rec.lost++;
        const margin = Math.abs(c.a - c.b);
        if (margin <= 2 && won !== null) won ? totals.closeWon++ : totals.closeLost++;
        for (const pid of ours) {
          const ps = playerStats.get(pid);
          if (!ps) continue;
          ps.sets++;
          if (won) ps.won++;
          ps.ptsFor += mine(c);
          ps.ptsAgainst += theirs(c);
        }
        if (ours.length === 2) {
          const k = pairKey(ours[0], ours[1]);
          const ps = pairStats.get(k) ?? { ids: [ours[0], ours[1]], sets: 0, won: 0 };
          ps.sets++;
          if (won) ps.won++;
          pairStats.set(k, ps);
        }
      }
      return {
        number: c.number,
        us: mine(c),
        them: theirs(c),
        done: c.done,
        won,
        ourPlayers: ours.map(name),
        theirPlayers: them.map(name),
        umpire: m.court_officials?.[c.key] || null,
      };
    });

    const setsUs = side === "a" ? r.setsA : r.setsB;
    const setsThem = side === "a" ? r.setsB : r.setsA;
    const result = r.winnerId ? (r.winnerId === teamId ? "W" : "L") : null;

    if (r.status === "completed") {
      totals.played++;
      totals.setsWon += setsUs;
      totals.setsLost += setsThem;
      totals.ptsFor += side === "a" ? r.ptsA : r.ptsB;
      totals.ptsAgainst += side === "a" ? r.ptsB : r.ptsA;
      if (result === "W") totals.wins++;
      if (result === "L") totals.losses++;
      if (opp) {
        const h = opponents.get(opp) ?? { won: 0, lost: 0 };
        result === "W" ? h.won++ : h.lost++;
        opponents.set(opp, h);
      }
    }

    history.push({
      matchId: m.id,
      stage: stageName(m),
      time: m.start_time,
      opponentId: opp,
      status: r.status,
      live: m.is_live,
      result,
      setsUs,
      setsThem,
      courts,
    });
  }

  const setsTotal = totals.setsWon + totals.setsLost;
  const diff = totals.ptsFor - totals.ptsAgainst;
  const playerRows = [...playerStats.values()].sort((a, b) => b.won - a.won || b.sets - a.sets || a.player.sort - b.player.sort);
  const pairs = [...pairStats.values()]
    .map((p) => ({ ...p, names: p.ids.map(name), rate: p.won / p.sets }))
    .sort((a, b) => b.won - a.won || b.rate - a.rate);

  return {
    team,
    roster,
    standing,
    playoff: playoffOutcome(teamId, matches),
    history,
    form: history.filter((h) => h.result).map((h) => h.result),
    totals: {
      ...totals,
      diff,
      setWinPct: setsTotal ? Math.round((totals.setsWon / setsTotal) * 100) : null,
      avgSetMargin: setsTotal ? Math.round((diff / setsTotal) * 10) / 10 : null,
    },
    courtRecord,
    players: playerRows,
    bestPair: pairs.find((p) => p.sets >= 1) ?? null,
    pairs,
    headToHead: [...opponents.entries()].map(([id, h]) => ({ opponentId: id, ...h })),
    hasLineups: playerRows.some((p) => p.sets > 0),
  };
}
