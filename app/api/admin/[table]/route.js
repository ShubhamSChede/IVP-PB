import { getEditor } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Generic editor CRUD for simple tables. Only columns in the allowlist can be
// written. Matches have their own route (scores have side effects).
//   POST   /api/admin/:table  { row }          → insert
//   PATCH  /api/admin/:table  { id, patch }    → update one row
//   DELETE /api/admin/:table  { id }           → delete one row

const TABLES = {
  teams: { pk: "id", cols: ["name", "captain", "color", "sort"], insert: false, remove: false },
  players: { pk: "id", cols: ["team_id", "name", "gender", "sort"], insert: true, remove: true },
  schedule_items: {
    pk: "id",
    cols: ["wave", "start_time", "end_time", "mins", "phase", "match_id", "title", "format", "warmup", "officials", "sort"],
    insert: true,
    remove: true,
  },
  rules: { pk: "id", cols: ["code", "category", "topic", "ruling", "sort"], insert: true, remove: true },
  settings: { pk: "key", cols: ["label", "value", "notes", "sort"], insert: false, remove: false },
  activity_log: { pk: "id", cols: ["kind", "message", "match_id"], insert: true, remove: true },
  chat_messages: { pk: "id", cols: [], insert: false, remove: true },
};

function pick(obj, cols) {
  const out = {};
  for (const c of cols) if (obj && c in obj) out[c] = obj[c];
  return out;
}

async function guard(params) {
  const editor = await getEditor();
  if (!editor) return { res: Response.json({ error: "Edit mode is locked" }, { status: 401 }) };
  const { table } = await params;
  const cfg = TABLES[table];
  if (!cfg) return { res: Response.json({ error: "Unknown table" }, { status: 404 }) };
  return { editor, table, cfg, db: getAdminSupabase() };
}

const hasUpdatedBy = (table) => !["activity_log", "chat_messages"].includes(table);

export async function PATCH(request, { params }) {
  const g = await guard(params);
  if (g.res) return g.res;
  const { id, patch } = await request.json().catch(() => ({}));
  const values = pick(patch, g.cfg.cols);
  if (id == null || !Object.keys(values).length) return Response.json({ error: "Nothing to update" }, { status: 400 });
  if (hasUpdatedBy(g.table)) values.updated_by = g.editor.name;

  const { data, error } = await g.db.from(g.table).update(values).eq(g.cfg.pk, id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ row: data });
}

export async function POST(request, { params }) {
  const g = await guard(params);
  if (g.res) return g.res;
  if (!g.cfg.insert) return Response.json({ error: "Insert not allowed" }, { status: 405 });
  const { row } = await request.json().catch(() => ({}));
  const values = pick(row, g.cfg.cols);
  if (g.table === "activity_log") values.actor = g.editor.name;
  else values.updated_by = g.editor.name;

  const { data, error } = await g.db.from(g.table).insert(values).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ row: data });
}

export async function DELETE(request, { params }) {
  const g = await guard(params);
  if (g.res) return g.res;
  if (!g.cfg.remove) return Response.json({ error: "Delete not allowed" }, { status: 405 });
  const { id } = await request.json().catch(() => ({}));
  if (id == null) return Response.json({ error: "Missing id" }, { status: 400 });

  const { error } = await g.db.from(g.table).delete().eq(g.cfg.pk, id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ deleted: id });
}
