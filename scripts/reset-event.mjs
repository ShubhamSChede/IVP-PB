// Wipes all scores, auto-pairings, live flags and the feed — keeps teams,
// players, schedule and rules. Same as the edit-mode "Reset" buttons.
//   npm run reset:event              (keeps chat)
//   npm run reset:event -- --chat    (also clears chat)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { resetEvent } from "../lib/resetEvent.js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const withChat = process.argv.includes("--chat");
await resetEvent(db, { chat: withChat });
console.log(`✓ Event reset: scores, pairings (R2, R3, playoffs) and feed cleared${withChat ? ", chat cleared" : " (chat kept — add --chat to clear it)"}.`);
