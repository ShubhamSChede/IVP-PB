"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { Field, PrimaryButton, Select, TextInput } from "@/components/ui/Form";
import { COURTS, COURT_NUMBERS } from "@/lib/tournament";
import { useLiveData } from "@/components/providers/LiveDataProvider";

// Who played which court (2 per side) + the umpire per court.
// Feeds player and pair stats on the team analysis page.

function PairPicker({ team, players, value, onChange, label }) {
  const [p1 = "", p2 = ""] = value ?? [];
  const set = (i, v) => {
    const next = [p1, p2];
    next[i] = v;
    onChange(next);
  };
  return (
    <div>
      <p className="mb-1.5 truncate text-sm font-medium text-muted">{label ?? team?.name}</p>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <Select key={i} value={[p1, p2][i]} onChange={(e) => set(i, e.target.value)} aria-label={`${team?.name} player ${i + 1}`}>
            <option value="">Player {i + 1}</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === [p1, p2][1 - i]}>
                {p.name}
                {p.gender === "F" ? " (F)" : ""}
              </option>
            ))}
          </Select>
        ))}
      </div>
    </div>
  );
}

export default function LineupSheet({ match, open, onClose, onSave }) {
  const { teamsById, playersByTeam } = useLiveData();
  const A = teamsById.get(match.team_a_id);
  const B = teamsById.get(match.team_b_id);
  const [lineups, setLineups] = useState(() => structuredClone(match.lineups ?? {}));
  const [officials, setOfficials] = useState(() => ({ ...(match.court_officials ?? {}) }));
  const [busy, setBusy] = useState(false);

  const setSide = (court, side, pair) =>
    setLineups((l) => ({ ...l, [court]: { ...(l[court] ?? {}), [side]: pair.filter(Boolean) } }));

  async function save() {
    setBusy(true);
    try {
      await onSave({ lineups, court_officials: officials });
      onClose();
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Lineups & umpires">
      <p className="mb-4 text-sm font-medium text-muted">
        Optional. Recording pairs unlocks player and pair stats on the team pages.
      </p>
      <div className="space-y-5">
        {COURTS.map((c, i) => (
          <section key={c} className="space-y-3 rounded-2xl border border-line p-3">
            <h3 className="text-base text-ink-strong">Court {COURT_NUMBERS[i]}</h3>
            <PairPicker team={A} players={playersByTeam.get(match.team_a_id) ?? []} value={lineups[c]?.a} onChange={(p) => setSide(c, "a", p)} />
            <PairPicker team={B} players={playersByTeam.get(match.team_b_id) ?? []} value={lineups[c]?.b} onChange={(p) => setSide(c, "b", p)} />
            <Field label="Umpire">
              <TextInput
                value={officials[c] ?? ""}
                onChange={(e) => setOfficials((o) => ({ ...o, [c]: e.target.value.slice(0, 60) }))}
                placeholder="Name"
              />
            </Field>
          </section>
        ))}
        <PrimaryButton busy={busy} onClick={save}>Save lineups</PrimaryButton>
      </div>
    </Sheet>
  );
}
