"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Icon from "@/components/ui/Icon";
import { Field, GhostButton, PrimaryButton, TextInput } from "@/components/ui/Form";
import { api } from "@/lib/api";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

// Edit a team's name, captain and roster (names + gender) in one sheet.
// Saves only what changed.

export default function TeamEditSheet({ team, open, onClose }) {
  const { playersByTeam, applyRows, removeRow } = useLiveData();
  const { handleAuthError } = useEditor();
  const toast = useToast();
  const original = playersByTeam.get(team.id) ?? [];

  const [name, setName] = useState(team.name);
  const [captain, setCaptain] = useState(team.captain ?? "");
  const [roster, setRoster] = useState(() => original.map((p) => ({ ...p })));
  const [busy, setBusy] = useState(false);

  const update = (i, patch) => setRoster((r) => r.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const females = roster.filter((p) => !p._deleted && p.gender === "F").length;

  async function save() {
    setBusy(true);
    try {
      if (name.trim() !== team.name || captain.trim() !== (team.captain ?? "")) {
        const { row } = await api("/api/admin/teams", { method: "PATCH", body: { id: team.id, patch: { name: name.trim() || team.name, captain: captain.trim() } } });
        applyRows("teams", row);
      }
      let sort = 0;
      for (const p of roster) {
        if (p._deleted) {
          if (p.id) {
            await api("/api/admin/players", { method: "DELETE", body: { id: p.id } });
            removeRow("players", p.id);
          }
          continue;
        }
        sort++;
        const clean = { name: p.name.trim(), gender: p.gender || null, sort };
        if (!clean.name) continue;
        if (!p.id) {
          const { row } = await api("/api/admin/players", { body: { row: { ...clean, team_id: team.id } } });
          applyRows("players", row);
        } else {
          const o = original.find((x) => x.id === p.id);
          if (o && (o.name !== clean.name || (o.gender ?? null) !== clean.gender || o.sort !== sort)) {
            const { row } = await api("/api/admin/players", { method: "PATCH", body: { id: p.id, patch: clean } });
            applyRows("players", row);
          }
        }
      }
      toast(`${name.trim() || team.name} saved`);
      onClose();
    } catch (e) {
      handleAuthError(e);
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Edit ${team.code}`}>
      <div className="space-y-4">
        <Field label="Team name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </Field>
        <Field label="Captain">
          <TextInput value={captain} onChange={(e) => setCaptain(e.target.value)} maxLength={40} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Players</span>
            <span className={`text-xs ${females ? "text-muted" : "text-warn"}`}>
              {females ? `${females} female` : "Needs at least 1 female player"}
            </span>
          </div>
          <ul className="space-y-2">
            {roster.map((p, i) =>
              p._deleted ? null : (
                <li key={p.id ?? `new-${i}`} className="flex items-center gap-2">
                  <TextInput value={p.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={40} placeholder="Player name" />
                  <button
                    type="button"
                    onClick={() => update(i, { gender: p.gender === "F" ? "M" : p.gender === "M" ? null : "F" })}
                    className={`h-12 w-12 shrink-0 rounded-xl border text-sm ${p.gender === "F" ? "border-accent bg-accent/15 text-accent-ink" : p.gender === "M" ? "border-line text-ink" : "border-line text-muted/60"}`}
                    aria-label={`Gender: ${p.gender ?? "not set"}. Tap to change.`}
                  >
                    {p.gender ?? "–"}
                  </button>
                  <button
                    type="button"
                    onClick={() => update(i, { _deleted: true })}
                    className="grid h-12 w-10 shrink-0 place-items-center text-muted hover:text-danger"
                    aria-label={`Remove ${p.name}`}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </li>
              )
            )}
          </ul>
          <GhostButton type="button" className="mt-2 w-full" onClick={() => setRoster((r) => [...r, { name: "", gender: null }])}>
            + Add player
          </GhostButton>
          <p className="mt-2 text-xs font-medium text-muted/80">Tap the F/M button to set gender.</p>
        </div>

        <PrimaryButton busy={busy} onClick={save}>Save team</PrimaryButton>
      </div>
    </Sheet>
  );
}
