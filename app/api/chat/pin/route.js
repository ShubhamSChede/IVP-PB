import { getEditor } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

// POST /api/chat/pin { id, pinned } — organisers only. At most 2 pins:
// pinning a third replaces the oldest pin (same as WhatsApp).

const MAX_PINS = 2;

export async function POST(request) {
  const editor = await getEditor();
  if (!editor) return Response.json({ error: "Edit mode is locked" }, { status: 401 });
  const { id, pinned } = await request.json().catch(() => ({}));
  const msgId = Number(id);
  if (!Number.isSafeInteger(msgId) || msgId <= 0) return Response.json({ error: "Bad message" }, { status: 400 });

  const db = getAdminSupabase();
  const rows = [];

  if (pinned) {
    const { data: current, error } = await db
      .from("chat_messages")
      .select("id")
      .not("pinned_at", "is", null)
      .neq("id", msgId)
      .order("pinned_at", { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const drop = current.slice(0, Math.max(0, current.length - (MAX_PINS - 1)));
    if (drop.length) {
      const { data } = await db.from("chat_messages").update({ pinned_at: null, pinned_by: null }).in("id", drop.map((r) => r.id)).select();
      rows.push(...(data ?? []));
    }
  }

  const { data, error } = await db
    .from("chat_messages")
    .update(pinned ? { pinned_at: new Date().toISOString(), pinned_by: editor.name } : { pinned_at: null, pinned_by: null })
    .eq("id", msgId)
    .select()
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "That message was deleted" }, { status: 404 });
  rows.push(data);
  return Response.json({ rows, replaced: rows.length - 1 });
}
