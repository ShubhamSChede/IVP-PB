import { getEditor } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { tieResult } from "@/lib/tournament";
import { advanceTournament } from "@/lib/tournament/advance";

// PATCH /api/matches/:id  — body: any subset of the editable columns below.
// Field-level writes: only the columns sent are touched, so two editors
// scoring different courts of the same tie never overwrite each other.

const SCORE_FIELDS = ["c1_a", "c1_b", "c2_a", "c2_b", "c3_a", "c3_b"];
const TEXT_FIELDS = ["label", "wave", "start_time", "end_time", "notes"];
const isUuid = (v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

function sanitize(body) {
  const patch = {};
  for (const f of SCORE_FIELDS) {
    if (!(f in body)) continue;
    const v = body[f];
    if (v === null || v === "") patch[f] = null;
    else if (Number.isInteger(v) && v >= 0 && v <= 99) patch[f] = v;
    else throw new Error(`${f} must be a whole number 0–99`);
  }
  for (const f of TEXT_FIELDS) {
    if (f in body) patch[f] = body[f] == null ? null : String(body[f]).slice(0, 200);
  }
  for (const f of ["team_a_id", "team_b_id"]) {
    if (!(f in body)) continue;
    if (body[f] !== null && !isUuid(body[f])) throw new Error(`${f} is not a team id`);
    patch[f] = body[f];
  }
  for (const f of ["race_to", "cap"]) {
    if (!(f in body)) continue;
    if (!Number.isInteger(body[f]) || body[f] < 1 || body[f] > 99) throw new Error(`${f} must be 1–99`);
    patch[f] = body[f];
  }
  if ("is_live" in body) patch.is_live = Boolean(body.is_live);
  const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  if ("lineups" in body) {
    // { c1: { a: [playerId, playerId], b: [...] }, c2: ..., c3: ... }
    if (!isObj(body.lineups)) throw new Error("lineups must be an object");
    const clean = {};
    for (const c of ["c1", "c2", "c3"]) {
      const court = body.lineups[c];
      if (court == null) continue;
      if (!isObj(court)) throw new Error(`lineups.${c} must be an object`);
      clean[c] = {};
      for (const side of ["a", "b"]) {
        const ids = court[side] ?? [];
        if (!Array.isArray(ids) || ids.length > 2 || !ids.every(isUuid)) throw new Error(`lineups.${c}.${side} must be up to 2 player ids`);
        clean[c][side] = [...new Set(ids)];
      }
    }
    patch.lineups = clean;
  }
  if ("court_officials" in body) {
    if (!isObj(body.court_officials)) throw new Error("court_officials must be an object");
    patch.court_officials = Object.fromEntries(
      ["c1", "c2", "c3"].filter((c) => body.court_officials[c]).map((c) => [c, String(body.court_officials[c]).trim().slice(0, 60)])
    );
  }
  return patch;
}

function activityFor(before, after, names) {
  const A = names(after.team_a_id);
  const B = names(after.team_b_id);
  const r0 = tieResult(before);
  const r1 = tieResult(after);
  const logs = [];

  r1.courts.forEach((c, i) => {
    const old = r0.courts[i];
    if (!c.done || (old.done && old.a === c.a && old.b === c.b)) return;
    logs.push({
      kind: old.done ? "edit" : "score",
      message: `${old.done ? "Corrected · " : ""}Court ${c.number}: ${A} ${c.a}–${c.b} ${B}`,
    });
  });

  if (r1.winnerId && r1.winnerId !== r0.winnerId) {
    const [w, l] = r1.winnerSide === "a" ? [A, B] : [B, A];
    const [sw, sl] = r1.winnerSide === "a" ? [r1.setsA, r1.setsB] : [r1.setsB, r1.setsA];
    logs.push({ kind: "result", message: `${w} beat ${l} ${sw}–${sl}${after.stage === "playoff" ? ` in ${after.label.split(" (")[0]}` : ""}` });
  }
  if (after.is_live && !before.is_live) logs.push({ kind: "live", message: `On court now: ${A} v ${B}` });

  return logs.map((l) => ({ ...l, match_id: after.id }));
}

export async function PATCH(request, { params }) {
  const editor = await getEditor();
  if (!editor) return Response.json({ error: "Edit mode is locked" }, { status: 401 });

  const { id } = await params;
  let patch;
  try {
    patch = sanitize(await request.json());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  if (!Object.keys(patch).length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  const teamsTouched = "team_a_id" in patch || "team_b_id" in patch;
  if (teamsTouched) patch.pairing_locked = true; // manual override sticks

  const db = getAdminSupabase();
  const [{ data: before }, { data: teams }] = await Promise.all([
    db.from("matches").select("*").eq("id", id).maybeSingle(),
    db.from("teams").select("id,name"),
  ]);
  if (!before) return Response.json({ error: "Match not found" }, { status: 404 });

  const { data: after, error } = await db
    .from("matches")
    .update({ ...patch, updated_by: editor.name })
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const names = (tid) => teams.find((t) => t.id === tid)?.name ?? "TBD";
  const logs = activityFor(before, after, names).map((l) => ({ ...l, actor: editor.name }));
  if (logs.length) await db.from("activity_log").insert(logs);

  const scoresTouched = SCORE_FIELDS.some((f) => f in patch);
  const changed = scoresTouched || teamsTouched ? await advanceTournament(db) : [];

  return Response.json({ match: after, changed });
}
