import "server-only";
import {
  computeStandings,
  isRoundComplete,
  isSwissComplete,
  pairSwissRound,
  resolveSource,
  swissMatches,
} from "./index.js";

const ACTOR = "Auto-pairing";

/**
 * Fill any slots that can now be decided:
 *  - Swiss R2/R3 pairings once the previous round is complete
 *  - Playoff teams once their source (standing / winner / loser) is known
 *
 * Idempotent and safe under concurrent calls: each write is conditional on
 * `pairing_locked = false`, so if two editors finish a round at the same
 * moment, only one write lands. Returns the match rows it changed.
 */
export async function advanceTournament(db) {
  const [{ data: teams, error: e1 }, { data: matches, error: e2 }] = await Promise.all([
    db.from("teams").select("*").order("sort"),
    db.from("matches").select("*").order("sort"),
  ]);
  if (e1 || e2) throw e1 || e2;

  const nameOf = (id) => teams.find((t) => t.id === id)?.name ?? "TBD";
  const changed = [];
  const logs = [];

  const lockIn = async (m, a, b) => {
    const { data } = await db
      .from("matches")
      .update({ team_a_id: a, team_b_id: b, pairing_locked: true, updated_by: ACTOR })
      .eq("id", m.id)
      .eq("pairing_locked", false)
      .select()
      .maybeSingle();
    if (data) {
      Object.assign(m, data); // so later steps see the new teams
      changed.push(data);
    }
    return Boolean(data);
  };

  // Swiss rounds 2 & 3 — only when no tie in the round is locked yet.
  for (const round of [2, 3]) {
    const list = swissMatches(matches, round);
    if (list.some((m) => m.pairing_locked) || !isRoundComplete(matches, round - 1)) continue;

    // Claim the whole round in ONE statement. Postgres row locks make a
    // concurrent claim see 0 rows, so exactly one request pairs the round.
    const { data: claimed } = await db
      .from("matches")
      .update({ pairing_locked: true, updated_by: ACTOR })
      .eq("stage", "swiss")
      .eq("round", round)
      .eq("pairing_locked", false)
      .select("id");
    if (claimed?.length !== list.length) {
      // Partial claim (should not happen) — release it so the next save retries.
      if (claimed?.length) await db.from("matches").update({ pairing_locked: false }).in("id", claimed.map((c) => c.id));
      continue;
    }

    const { pairs } = pairSwissRound(teams, matches, round);
    const rows = await Promise.all(
      list.map((m, i) =>
        db
          .from("matches")
          .update({ team_a_id: pairs[i][0], team_b_id: pairs[i][1], updated_by: ACTOR })
          .eq("id", m.id)
          .select()
          .single()
          .then(({ data }) => data)
      )
    );
    rows.forEach((row, i) => {
      if (!row) return;
      Object.assign(list[i], row); // so later steps (round 3, playoffs) see the new teams
      changed.push(row);
    });
    logs.push({
      kind: "pairing",
      message: `Round ${round} pairings are out: ${list
        .map((m) => `${nameOf(m.team_a_id)} v ${nameOf(m.team_b_id)}`)
        .join(" · ")}`,
      actor: ACTOR,
    });
  }

  // Playoffs, in bracket order so Q2/GF can use fresh Q1/EL results.
  const ctx = {
    standings: computeStandings(teams, matches),
    matches,
    swissComplete: isSwissComplete(matches),
  };
  for (const m of matches.filter((x) => x.stage === "playoff")) {
    if (m.pairing_locked) continue;
    const a = resolveSource(m.a_source, ctx);
    const b = resolveSource(m.b_source, ctx);
    if (a && b && (await lockIn(m, a, b))) {
      logs.push({
        kind: "pairing",
        match_id: m.id,
        message: `${m.label.split(" (")[0]}: ${nameOf(a)} v ${nameOf(b)}`,
        actor: ACTOR,
      });
    }
  }

  if (logs.length) await db.from("activity_log").insert(logs);
  return changed;
}
