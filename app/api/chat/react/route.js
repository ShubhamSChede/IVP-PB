import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Reactions. Each device gets a random httpOnly cookie; the public table only
// ever sees a hash of it ("reactor"), so nobody can react on someone's behalf.
//   GET  /api/chat/react                          → { reactor }
//   POST /api/chat/react { messageId, emoji }     → set / change reaction
//   POST /api/chat/react { messageId, emoji: null } → remove it

const EMOJIS = new Set(["like", "dislike", "heart", "laugh", "cry"]);
const COOKIE = "pb_cid";
const recent = new Map(); // ip -> timestamps (30 / minute)

async function reactorId() {
  const jar = await cookies();
  let cid = jar.get(COOKIE)?.value;
  if (!cid || !/^[a-f0-9]{32}$/.test(cid)) {
    cid = randomBytes(16).toString("hex");
    jar.set(COOKIE, cid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return createHash("sha256").update(cid).digest("hex").slice(0, 24);
}

export async function GET() {
  return Response.json({ reactor: await reactorId() });
}

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= 30) return Response.json({ error: "Too many reactions — wait a minute" }, { status: 429 });
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) recent.clear();

  const { messageId, emoji } = await request.json().catch(() => ({}));
  const id = Number(messageId);
  if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: "Bad message" }, { status: 400 });
  if (emoji != null && !EMOJIS.has(emoji)) return Response.json({ error: "Bad reaction" }, { status: 400 });

  const reactor = await reactorId();
  const key = `${id}:${reactor}`;
  const db = getAdminSupabase();

  if (emoji == null) {
    const { error } = await db.from("chat_reactions").delete().eq("id", key);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ reactor, removed: key });
  }

  const { data, error } = await db
    .from("chat_reactions")
    .upsert({ id: key, message_id: id, reactor, emoji, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) {
    const gone = error.code === "23503"; // message deleted meanwhile
    return Response.json({ error: gone ? "That message was deleted" : error.message }, { status: gone ? 404 : 500 });
  }
  return Response.json({ reactor, row: data });
}
