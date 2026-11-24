import { getEditor } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

// POST /api/chat { author, body } — anyone can post; editors are tagged.
// Per-IP limits (per server instance): 1 message / 1.5s, 12 / minute.

const recent = new Map(); // ip -> timestamps
const clean = (s, max) =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮]/g, "") // control & bidi chars
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (times.length && now - times.at(-1) < 1500) return Response.json({ error: "Slow down a little" }, { status: 429 });
  if (times.length >= 12) return Response.json({ error: "Too many messages — wait a minute" }, { status: 429 });

  const payload = await request.json().catch(() => ({}));
  const editor = await getEditor();
  const author = editor?.name ?? clean(payload.author, 40);
  const body = clean(payload.body, 500);
  if (!author) return Response.json({ error: "Pick a name first" }, { status: 400 });
  if (!body) return Response.json({ error: "Message is empty" }, { status: 400 });

  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) recent.clear(); // keep memory bounded

  const { data, error } = await getAdminSupabase()
    .from("chat_messages")
    .insert({ author, body, is_editor: Boolean(editor) })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}
