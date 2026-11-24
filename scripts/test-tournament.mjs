// Checks lib/tournament against the workbook's rules.  Run: npm run test:logic
import assert from "node:assert/strict";
import {
  computeStandings,
  isValidSetScore,
  pairSwissRound,
  podium,
  resolveSource,
  tieResult,
  isSwissComplete,
  teamAnalysis,
} from "../lib/tournament/index.js";

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// Valid finished set scores (race 15, cap 17), winner first.
const SET_SCORES = [...Array.from({ length: 14 }, (_, l) => [15, l]), [16, 14], [17, 15], [17, 16]];
function playSet() {
  const [w, l] = pick(SET_SCORES);
  return rand() < 0.5 ? [w, l] : [l, w];
}
function playTie(m) {
  for (const c of ["c1", "c2", "c3"]) [m[`${c}_a`], m[`${c}_b`]] = playSet();
}

function freshTournament() {
  const teams = Array.from({ length: 10 }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}`, sort: i + 1 }));
  const matches = [];
  for (let t = 1; t <= 15; t++) {
    const round = Math.ceil(t / 5);
    const m = { id: `SW-R${round}-T${t}`, stage: "swiss", round, sort: t, race_to: 15, cap: 17, team_a_id: null, team_b_id: null };
    if (round === 1) { m.team_a_id = `t${2 * t - 1}`; m.team_b_id = `t${2 * t}`; }
    matches.push(m);
  }
  const pl = [
    ["PL-Q1", "standing:1", "standing:2"],
    ["PL-EL", "standing:3", "standing:4"],
    ["PL-Q2", "loser:PL-Q1", "winner:PL-EL"],
    ["PL-GF", "winner:PL-Q1", "winner:PL-Q2"],
  ];
  pl.forEach(([id, a, b], i) =>
    matches.push({ id, stage: "playoff", round: null, sort: 16 + i, race_to: 15, cap: 17, a_source: a, b_source: b, team_a_id: null, team_b_id: null })
  );
  return { teams, matches };
}

// Literal port of Swiss_Engine R2 formulas (rows 18–22) for cross-checking.
function excelRound2(teams, matches) {
  const K = computeStandings(teams, matches, { rounds: [1] }).map((r) => r.teamId);
  const met = (a, b) => matches.some((m) => m.round === 1 && ((m.team_a_id === a && m.team_b_id === b) || (m.team_a_id === b && m.team_b_id === a)));
  const swap = met(K[4], K[5]);
  return [
    [K[0], K[1]],
    [K[2], K[3]],
    [K[4], swap ? K[6] : K[5]],
    [swap ? K[5] : K[6], K[7]],
    [K[8], K[9]],
  ];
}

// ── unit checks ───────────────────────────────────────────────
for (const [a, b] of [[15, 0], [15, 13], [16, 14], [17, 15], [17, 16], [0, 15]]) assert.ok(isValidSetScore(a, b), `${a}-${b} valid`);
for (const [a, b] of [[15, 14], [15, 15], [16, 13], [18, 16], [17, 14], [14, 10]]) assert.ok(!isValidSetScore(a, b), `${a}-${b} invalid`);
assert.ok(isValidSetScore(21, 19, 21, 23) && isValidSetScore(23, 22, 21, 23) && !isValidSetScore(21, 20, 21, 23));

const r = tieResult({ c1_a: 15, c1_b: 10, c2_a: 15, c2_b: 12, c3_a: null, c3_b: null, team_a_id: "A", team_b_id: "B" });
assert.equal(r.status, "in_progress");
assert.equal(r.winnerId, "A", "2 sets decides the tie early");
assert.equal(tieResult({}).status, "pending");

// ── team analysis (with lineups) ─────────────────────────────
{
  const teams = [{ id: "A", name: "A", sort: 1 }, { id: "B", name: "B", sort: 2 }];
  const players = ["a1", "a2", "a3", "b1", "b2", "b3"].map((id, i) => ({ id, team_id: id[0].toUpperCase(), name: id, sort: i }));
  const m = {
    id: "SW-R1-T01", stage: "swiss", round: 1, sort: 1, team_a_id: "A", team_b_id: "B", race_to: 15, cap: 17,
    c1_a: 15, c1_b: 13, c2_a: 9, c2_b: 15, c3_a: 16, c3_b: 14,
    lineups: { c1: { a: ["a1", "a2"], b: ["b1", "b2"] }, c2: { a: ["a1", "a3"], b: ["b1", "b3"] }, c3: { a: ["a2", "a1"], b: ["b2", "b3"] } },
  };
  const t = teamAnalysis("A", { teams, players, matches: [m] });
  assert.equal(t.totals.wins, 1);
  assert.deepEqual([t.totals.setsWon, t.totals.setsLost, t.totals.diff], [2, 1, -2]);
  assert.equal(t.totals.closeWon, 2, "15-13 and 16-14 are close wins");
  assert.equal(t.players.find((p) => p.player.id === "a1").sets, 3);
  assert.equal(t.players.find((p) => p.player.id === "a1").won, 2);
  assert.equal(t.bestPair.names.join("+"), "a1+a2", "a1+a2 won both sets together");
  assert.equal(t.bestPair.won, 2);
  assert.deepEqual(t.form, ["W"]);
  assert.deepEqual(t.courtRecord.map((c) => [c.won, c.lost]), [[1, 0], [0, 1], [1, 0]]);
  const tb = teamAnalysis("B", { teams, players, matches: [m] });
  assert.deepEqual([tb.totals.losses, tb.history[0].result, tb.history[0].courts[1].won], [1, "L", true]);
}

// ── full random tournaments ───────────────────────────────────
let swaps = 0;
const RUNS = 5000;
for (let run = 0; run < RUNS; run++) {
  const { teams, matches } = freshTournament();
  const pairedRound = (round) => {
    const { pairs, rematch } = pairSwissRound(teams, matches, round);
    assert.equal(rematch, false, `no rematch in R${round}`);
    matches.filter((m) => m.round === round).forEach((m, i) => ([m.team_a_id, m.team_b_id] = pairs[i]));
    return pairs;
  };

  matches.filter((m) => m.round === 1).forEach(playTie);

  const ours = pairedRound(2);
  const excel = excelRound2(teams, matches);
  assert.deepEqual(ours, excel, `R2 matches the workbook (run ${run})`);
  if (excel[2][1] !== computeStandings(teams, matches, { rounds: [1] })[5].teamId) swaps++;
  matches.filter((m) => m.round === 2).forEach(playTie);

  const r3 = pairedRound(3);
  const seedsAfterR2 = computeStandings(teams, matches, { rounds: [1, 2] }).map((x) => x.teamId);
  assert.equal(r3[0][0], seedsAfterR2[0], "R3 tie 11 led by top seed");
  matches.filter((m) => m.round === 3).forEach(playTie);

  // every team plays exactly 3 different opponents
  for (const t of teams) {
    const opps = matches.filter((m) => m.stage === "swiss" && (m.team_a_id === t.id || m.team_b_id === t.id)).map((m) => (m.team_a_id === t.id ? m.team_b_id : m.team_a_id));
    assert.equal(new Set(opps).size, 3);
  }
  assert.ok(isSwissComplete(matches));

  // playoffs
  const standings = computeStandings(teams, matches);
  const ctx = () => ({ standings, matches, swissComplete: true });
  for (const id of ["PL-Q1", "PL-EL", "PL-Q2", "PL-GF"]) {
    const m = matches.find((x) => x.id === id);
    m.team_a_id = resolveSource(m.a_source, ctx());
    m.team_b_id = resolveSource(m.b_source, ctx());
    assert.ok(m.team_a_id && m.team_b_id && m.team_a_id !== m.team_b_id, `${id} resolved`);
    playTie(m);
  }
  const q1 = matches.find((m) => m.id === "PL-Q1");
  assert.deepEqual([q1.team_a_id, q1.team_b_id], [standings[0].teamId, standings[1].teamId]);
  const places = podium(matches).map((p) => p.teamId);
  assert.equal(new Set(places).size, 4, "4 distinct podium teams");
  assert.ok(places.every((id) => standings.slice(0, 4).some((s) => s.teamId === id)), "podium = top 4");
}

console.log(`✓ unit checks passed (scores, ties, team analysis + lineups)`);
console.log(`✓ ${RUNS} random tournaments: R2 identical to workbook formula (seed 5 v 7 rematch-swap: ${swaps} runs, plain 5 v 6: ${RUNS - swaps} runs), R3 zero rematches, playoffs + podium valid`);
