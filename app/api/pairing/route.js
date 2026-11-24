import { getEditor } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { tieResult } from "@/lib/tournament";
import { advanceTournament } from "@/lib/tournament/advance";

// POST /api/pairing  { scope: "round:2" | "round:3" | "playoffs", force?: boolean }
// "Re-run pairing": clears the saved teams for that stage and lets the engine
// fill them again from current results. Refuses if scores already exist,
// unless force (the UI asks the editor to confirm first).

export async function POST(request) {
  const editor = await getEditor();
  if (!editor) return Response.json({ error: "Edit mode is locked" }, { status: 401 });

  const { scope, force } = await request.json().catch(() => ({}));
  const db = getAdminSupabase();
  let q = db.from("matches").select("*");
  if (scope === "round:2" || scope === "round:3") q = q.eq("stage", "swiss").eq("round", Number(scope.slice(6)));
  else if (scope === "playoffs") q = q.eq("stage", "playoff");
  else return Response.json({ error: "Unknown scope" }, { status: 400 });

  const { data: list } = await q;
  const scored = list.filter((m) => tieResult(m).status !== "pending");
  if (scored.length && !force) {
    return Response.json(
      { error: `${scored.length} tie(s) in this stage already have scores.`, needsForce: true },
      { status: 409 }
    );
  }

  await db
    .from("matches")
    .update({ team_a_id: null, team_b_id: null, pairing_locked: false, updated_by: editor.name })
    .in("id", list.map((m) => m.id));

  await advanceTournament(db);
  await db.from("activity_log").insert({
    kind: "edit",
    message: `Pairings re-run for ${scope === "playoffs" ? "playoffs" : `Round ${scope.slice(6)}`}`,
    actor: editor.name,
  });

  const { data: matches } = await db.from("matches").select("*").order("sort");
  return Response.json({ changed: matches });
}
