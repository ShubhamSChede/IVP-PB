"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { EditIconButton, Field, GhostButton, PrimaryButton, TextArea, TextInput } from "@/components/ui/Form";
import Skeleton, { ErrorNote, PageTitle } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

const HIDDEN_SETTINGS = new Set(["event_title", "how_to_run"]);

function useSaver() {
  const { applyRows, removeRow } = useLiveData();
  const { handleAuthError } = useEditor();
  const toast = useToast();
  return { applyRows, removeRow, toast, fail: (e) => (handleAuthError(e), toast(e.message, "error")) };
}

function RuleSheet({ rule, onClose }) {
  const { applyRows, removeRow, toast, fail } = useSaver();
  const [form, setForm] = useState({ code: rule.code ?? "", category: rule.category ?? "", topic: rule.topic ?? "", ruling: rule.ruling ?? "" });
  const [busy, setBusy] = useState(false);
  const isNew = !rule.id;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    try {
      const { row } = isNew
        ? await api("/api/admin/rules", { body: { row: { ...form, sort: rule.sort } } })
        : await api("/api/admin/rules", { method: "PATCH", body: { id: rule.id, patch: form } });
      applyRows("rules", row);
      toast("Rule saved");
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm(`Delete ${rule.code || "this rule"}?`)) return;
    try {
      await api("/api/admin/rules", { method: "DELETE", body: { id: rule.id } });
      removeRow("rules", rule.id);
      onClose();
    } catch (e) {
      fail(e);
    }
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? "Add rule" : `Edit ${rule.code}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <Field label="Code"><TextInput value={form.code} onChange={set("code")} placeholder="R21" /></Field>
          <Field label="Category"><TextInput value={form.category} onChange={set("category")} /></Field>
        </div>
        <Field label="Topic"><TextInput value={form.topic} onChange={set("topic")} /></Field>
        <Field label="Ruling"><TextArea value={form.ruling} onChange={set("ruling")} rows={6} /></Field>
        <PrimaryButton busy={busy} onClick={save}>Save rule</PrimaryButton>
        {!isNew && <GhostButton danger className="w-full" onClick={remove}>Delete rule</GhostButton>}
      </div>
    </Sheet>
  );
}

function SettingSheet({ setting, onClose }) {
  const { applyRows, toast, fail } = useSaver();
  const [form, setForm] = useState({ label: setting.label ?? "", value: setting.value ?? "", notes: setting.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  async function save() {
    setBusy(true);
    try {
      const { row } = await api("/api/admin/settings", { method: "PATCH", body: { id: setting.key, patch: form } });
      applyRows("settings", row);
      toast("Saved");
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open onClose={onClose} title={`Edit ${setting.label}`}>
      <div className="space-y-3">
        <Field label="Label"><TextInput value={form.label} onChange={set("label")} /></Field>
        <Field label="Value"><TextInput value={form.value} onChange={set("value")} /></Field>
        <Field label="Notes"><TextArea value={form.notes} onChange={set("notes")} rows={3} /></Field>
        <PrimaryButton busy={busy} onClick={save}>Save</PrimaryButton>
      </div>
    </Sheet>
  );
}

export default function RulesView() {
  const { rules, settings, loaded, error } = useLiveData();
  const { isEditor } = useEditor();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [editRule, setEditRule] = useState(null);
  const [editSetting, setEditSetting] = useState(null);
  const [tab, setTab] = useState("rules");

  const cats = ["All", ...new Set(rules.map((r) => r.category).filter(Boolean))];
  const q = query.trim().toLowerCase();
  const shown = rules.filter(
    (r) =>
      (cat === "All" || r.category === cat) &&
      (!q || [r.code, r.topic, r.ruling, r.category].some((x) => x?.toLowerCase().includes(q)))
  );
  const controls = settings.filter((s) => !HIDDEN_SETTINGS.has(s.key));
  const eventTitle = settings.find((s) => s.key === "event_title");

  return (
    <div>
      <PageTitle title="Rules" subtitle="Rally scoring. Umpire and linesmen decisions are final." />

      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 sm:inline-grid sm:w-80">
        {[["rules", "On-court rules"], ["format", "Format"]].map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-11 rounded-xl text-sm ${tab === k ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <ErrorNote message={error} />}
      {!loaded ? (
        <Skeleton rows={5} className="h-28" />
      ) : tab === "rules" ? (
        <>
          <div className="sticky top-[calc(5.5rem+2px+env(safe-area-inset-top))] z-30 -mx-4 mb-3 space-y-2 bg-bg/85 px-4 py-2 backdrop-blur-xl md:-mx-6 md:px-6 lg:top-[calc(6rem+2px)]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rules: kitchen, serve, ceiling…"
              className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-strong placeholder:text-muted/70 focus:border-accent focus:outline-none"
            />
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-6 md:px-6">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`h-9 shrink-0 rounded-md border px-3.5 text-xs ${cat === c ? "border-accent bg-accent text-on-accent" : "border-line text-muted"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm font-medium text-muted">No rules match “{query}”.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {shown.map((r) => (
                <li key={r.id} className={`rounded-2xl border p-4 ${r.code === "SPIRIT" ? "border-accent/40 bg-accent/[0.06]" : "border-line bg-surface"}`}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded-lg bg-accent/15 px-2 py-1 text-xs text-accent-ink">{r.code === "SPIRIT" ? "★" : r.code}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base leading-snug text-ink-strong">{r.topic}</h3>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{r.category}</p>
                    </div>
                    {isEditor && <EditIconButton label={`Edit ${r.code}`} onClick={() => setEditRule(r)} />}
                  </div>
                  <p className="mt-2.5 text-sm font-medium leading-relaxed text-ink">{r.ruling}</p>
                </li>
              ))}
            </ul>
          )}
          {isEditor && (
            <GhostButton className="mt-3 w-full" onClick={() => setEditRule({ sort: (rules.filter((r) => r.code !== "SPIRIT").at(-1)?.sort ?? 0) + 1 })}>
              + Add rule
            </GhostButton>
          )}
        </>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {isEditor && eventTitle && (
            <li className="flex items-start gap-3 rounded-2xl border border-dashed border-accent/40 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">Site title (editors only)</p>
                <p className="text-lg text-ink-strong">{eventTitle.value}</p>
              </div>
              <EditIconButton label="Edit site title" onClick={() => setEditSetting(eventTitle)} />
            </li>
          )}
          {controls.map((s) => (
            <li key={s.key} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">{s.label}</p>
                <p className="text-lg text-ink-strong">{s.value}</p>
                {s.notes && <p className="mt-1 text-sm font-medium leading-relaxed text-muted">{s.notes}</p>}
              </div>
              {isEditor && <EditIconButton label={`Edit ${s.label}`} onClick={() => setEditSetting(s)} />}
            </li>
          ))}
        </ul>
      )}

      {editRule && <RuleSheet rule={editRule} onClose={() => setEditRule(null)} />}
      {editSetting && <SettingSheet setting={editSetting} onClose={() => setEditSetting(null)} />}
    </div>
  );
}
