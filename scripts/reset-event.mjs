// Wipes all scores, auto-pairings, live flags and the feed — keeps teams,
// players, schedule and rules. Use after testing.
//   npm run reset:event              (keeps chat)
//   npm run reset:event -- --chat    (also clears chat)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const blank = { c1_a: null, c1_b: null, c2_a: null, c2_b: null, c3_a: null, c3_b: null, is_live: false, lineups: {}, court_officials: {}, notes: null, pairing_locked: false, updated_by: null };
const check = ({ error }) => { if (error) throw error; };

check(await db.from("matches").update(blank).eq("stage", "swiss").eq("round", 1));
check(await db.from("matches").update({ ...blank, team_a_id: null, team_b_id: null }).or("round.neq.1,stage.eq.playoff"));
check(await db.from("activity_log").delete().gt("id", 0));
const withChat = process.argv.includes("--chat");
if (withChat) check(await db.from("chat_messages").delete().gt("id", 0));
console.log(`✓ Event reset: scores, pairings (R2, R3, playoffs) and feed cleared${withChat ? ", chat cleared" : " (chat kept — add --chat to clear it)"}.`);
