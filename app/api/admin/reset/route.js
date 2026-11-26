import { getEditor } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { resetEvent } from "@/lib/resetEvent";

// POST /api/admin/reset { confirm: "RESET", chat?: boolean } — editors only.

export async function POST(request) {
  const editor = await getEditor();
  if (!editor) return Response.json({ error: "Edit mode is locked" }, { status: 401 });
  const { confirm, chat } = await request.json().catch(() => ({}));
  if (confirm !== "RESET") return Response.json({ error: "Type RESET to confirm" }, { status: 400 });

  try {
    await resetEvent(getAdminSupabase(), { chat: Boolean(chat) });
  } catch (e) {
    return Response.json({ error: e.message || "Reset failed" }, { status: 500 });
  }
  console.log(`[reset] event reset by ${editor.name}${chat ? " (with chat)" : ""}`);
  return Response.json({ ok: true, chat: Boolean(chat) });
}
