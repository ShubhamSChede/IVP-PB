"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusPill } from "@/components/matches/TieCard";
import Sheet from "@/components/ui/Sheet";
import { EditIconButton, Field, GhostButton, PrimaryButton, TextInput } from "@/components/ui/Form";
import Skeleton, { ErrorNote, PageTitle } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { sourceLabel, tieResult } from "@/lib/tournament";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

const FIELDS = [
  ["wave", "Wave"],
  ["start_time", "Start"],
  ["end_time", "End"],
  ["mins", "Minutes"],
  ["phase", "Phase"],
  ["title", "Title (for breaks / non-match rows)"],
  ["format", "Format"],
  ["warmup", "Warm-up court"],
  ["officials", "Officials"],
];

function EditRowSheet({ item, onClose }) {
  const { applyRows, removeRow } = useLiveData();
  const { handleAuthError } = useEditor();
  const toast = useToast();
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, item?.[k] ?? ""])));
  const [busy, setBusy] = useState(false);
  const isNew = !item?.id;

  async function save() {
    setBusy(true);
    const patch = { ...form, mins: form.mins === "" ? null : Number(form.mins) || null };
    try {
      const { row } = isNew
        ? await api("/api/admin/schedule_items", { body: { row: { ...patch, sort: item.sort } } })
        : await api("/api/admin/schedule_items", { method: "PATCH", body: { id: item.id, patch } });
      applyRows("schedule_items", row);
      toast("Schedule saved");
      onClose();
    } catch (e) {
      handleAuthError(e);
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this schedule row?")) return;
    try {
      await api("/api/admin/schedule_items", { method: "DELETE", body: { id: item.id } });
      removeRow("schedule_items", item.id);
      onClose();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? "Add schedule row" : `Edit ${item.wave ?? "row"}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {FIELDS.slice(0, 3).map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </Field>
          ))}
        </div>
        {FIELDS.slice(3).map(([k, label]) => (
          <Field key={k} label={label}>
            <TextInput
              value={form[k]}
              inputMode={k === "mins" ? "numeric" : undefined}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          </Field>
        ))}
        {item?.match_id && <p className="text-xs font-medium text-muted">Linked to {item.match_id}, so the fixture name fills in automatically.</p>}
        <PrimaryButton busy={busy} onClick={save}>Save</PrimaryButton>
        {!isNew && !item.match_id && (
          <GhostButton danger className="w-full" onClick={remove}>Delete row</GhostButton>
        )}
      </div>
    </Sheet>
  );
}

export default function ScheduleView() {
  const { schedule_items: items, matches, teamsById, loaded, error } = useLiveData();
  const { isEditor } = useEditor();
  const [editing, setEditing] = useState(null);

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const rows = items.map((it) => {
    const m = it.match_id ? matchById.get(it.match_id) : null;
    const r = m ? tieResult(m) : null;
    const name = (side) => teamsById.get(side === "a" ? m.team_a_id : m.team_b_id)?.name ??
      (m.stage === "playoff" ? sourceLabel(side === "a" ? m.a_source : m.b_source) : "TBD");
    return { it, m, r, fixture: m ? `${name("a")} v ${name("b")}` : it.title };
  });

  // "Now": a live / in-play tie, else the first tie not finished yet.
  const nowIdx = (() => {
    const live = rows.findIndex(({ m, r }) => m && r.status !== "completed" && (m.is_live || r.status === "in_progress"));
    if (live >= 0) return live;
    return rows.findIndex(({ m, r }) => m && r.status !== "completed");
  })();

  const jumpToNow = () => document.getElementById("wave-now")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div>
      <PageTitle title="Schedule" subtitle="Courts 3–5 play each tie at the same time">
        {nowIdx >= 0 && (
          <button onClick={jumpToNow} className="h-11 rounded-md border border-accent/50 px-4 text-sm text-accent-ink">
            Jump to now
          </button>
        )}
      </PageTitle>
      {error && <ErrorNote message={error} />}
      {!loaded ? (
        <Skeleton rows={6} className="h-20" />
      ) : (
        <ol className="relative">
          {rows.map(({ it, m, r, fixture }, i) => {
            const isNow = i === nowIdx;
            const done = r?.status === "completed";
            const isBreak = !m;
            return (
              <li key={it.id} id={isNow ? "wave-now" : undefined} className="grid scroll-mt-40 grid-cols-[4.25rem_minmax(0,1fr)] gap-3">
                {/* Time rail */}
                <div className="relative pt-4 text-right">
                  <p className={`text-sm tabular-nums ${isNow ? "text-accent-ink" : done ? "text-muted" : "text-ink-strong"}`}>{it.start_time?.replace(" ", " ")}</p>
                  <p className="text-[11px] font-medium text-muted">{it.mins ? `${it.mins}m` : ""}</p>
                </div>
                <div className="relative min-w-0 border-l border-line pb-3 pl-4">
                  <span
                    className={`absolute top-5 -left-[5px] size-2.5 rounded-full ${
                      isNow ? "bg-accent shadow-[0_0_10px_var(--accent)]" : done ? "bg-muted" : "border border-line bg-bg"
                    }`}
                  />
                  <div
                    className={`rounded-2xl border p-3.5 ${
                      isNow ? "border-accent/60 bg-accent/[0.06]" : isBreak ? "border-dashed border-line bg-transparent" : "border-line bg-surface"
                    } ${done ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted">
                          {it.wave} · {it.phase}
                        </p>
                        {m ? (
                          <Link href="/matches" className="mt-0.5 block truncate text-base text-ink-strong">{fixture}</Link>
                        ) : (
                          <p className="mt-0.5 text-base wrap-break-word text-ink-strong">{fixture}</p>
                        )}
                      </div>
                      {m && r.status !== "pending" ? (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusPill status={r.status} live={m.is_live} />
                          <span className="text-sm tabular-nums text-ink-strong">{r.setsA}–{r.setsB}</span>
                        </div>
                      ) : m?.is_live ? (
                        <StatusPill status="pending" live />
                      ) : null}
                      {isEditor && <EditIconButton label={`Edit ${it.wave}`} onClick={() => setEditing(it)} />}
                    </div>
                    <p className="mt-1.5 text-xs font-medium leading-relaxed wrap-break-word text-muted">
                      {[it.format, it.warmup && `Warm-up: ${it.warmup}`].filter(Boolean).join(" · ")}
                    </p>
                    {it.officials && !/^Ct1: ___/.test(it.officials) && (
                      <p className="mt-1 text-xs font-medium wrap-break-word text-muted">Officials: {it.officials}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {isEditor && loaded && (
        <GhostButton className="mt-2 w-full" onClick={() => setEditing({ sort: (items.at(-1)?.sort ?? 0) + 1 })}>
          + Add schedule row
        </GhostButton>
      )}
      {editing && <EditRowSheet item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
