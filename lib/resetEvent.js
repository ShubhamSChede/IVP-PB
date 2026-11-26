// Wipes all scores, auto-pairings, live flags, lineups and the feed. Keeps
// teams, players, the R1 draw, schedule, rules and settings. With
// { chat: true } also deletes every chat message (reactions go with them).
// Shared by the edit-mode buttons (/api/admin/reset) and `npm run reset:event`.
// `db` must be a service-role Supabase client.

const BLANK = {
  c1_a: null, c1_b: null, c2_a: null, c2_b: null, c3_a: null, c3_b: null,
  is_live: false, lineups: {}, court_officials: {}, notes: null, pairing_locked: false, updated_by: null,
};

const check = ({ error }) => {
  if (error) throw error;
};

export async function resetEvent(db, { chat = false } = {}) {
  check(await db.from("matches").update(BLANK).eq("stage", "swiss").eq("round", 1));
  check(await db.from("matches").update({ ...BLANK, team_a_id: null, team_b_id: null }).or("round.neq.1,stage.eq.playoff"));
  check(await db.from("activity_log").delete().gt("id", 0));
  if (chat) check(await db.from("chat_messages").delete().gt("id", 0));
  return { chat };
}
