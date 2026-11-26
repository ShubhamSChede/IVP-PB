"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { GhostButton, TextInput } from "@/components/ui/Form";
import { api } from "@/lib/api";
import { useEditor } from "@/components/providers/EditorProvider";
import { useLiveData } from "@/components/providers/LiveDataProvider";
import { useToast } from "@/components/providers/ToastProvider";

// Edit mode only: the two reset buttons (same as `npm run reset:event`).

const ACTIONS = {
  event: {
    label: "Reset event",
    desc: "Clears all scores, R2 / R3 / playoff pairings, lineups and the live feed. Keeps teams, players, the R1 draw, schedule, rules and chat.",
  },
  all: {
    label: "Reset event + chat",
    desc: "Clears all scores, R2 / R3 / playoff pairings, lineups and the live feed, AND deletes every chat message (with reactions and pins). Keeps teams, players, the R1 draw, schedule and rules.",
  },
};

function ConfirmSheet({ kind, onClose }) {
  const { reload } = useLiveData();
  const { handleAuthError } = useEditor();
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const a = ACTIONS[kind];
  const ok = typed.trim().toUpperCase() === "RESET";

  async function run() {
    setBusy(true);
    try {
      await api("/api/admin/reset", { body: { confirm: "RESET", chat: kind === "all" } });
      await reload();
      toast(kind === "all" ? "Event and chat reset" : "Event reset. Chat kept");
      onClose();
    } catch (e) {
      handleAuthError(e);
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={a.label} center>
      <p className="text-sm font-medium text-ink">{a.desc}</p>
      <p className="mt-3 text-sm font-semibold text-danger">This can&apos;t be undone, and every open phone updates instantly.</p>
      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-muted" htmlFor="reset-confirm">
        Type RESET to confirm
      </label>
      <TextInput
        id="reset-confirm"
        className="mt-1.5"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoCapitalize="characters"
        autoComplete="off"
        placeholder="RESET"
      />
      <button
        onClick={run}
        disabled={!ok || busy}
        className="mt-4 h-12 w-full rounded-md bg-danger text-[13px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-40"
      >
        {busy ? "Resetting…" : a.label}
      </button>
    </Sheet>
  );
}

export default function DangerZone() {
  const { isEditor } = useEditor();
  const [open, setOpen] = useState(null);
  if (!isEditor) return null;
  return (
    <section className="mt-8 rounded-2xl border border-danger/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-danger">Danger zone · organisers</p>
      <p className="mt-1 text-sm font-medium text-muted">Start the tournament over, e.g. after testing.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(ACTIONS).map(([k, a]) => (
          <GhostButton key={k} danger className="w-full" onClick={() => setOpen(k)}>
            {a.label}
          </GhostButton>
        ))}
      </div>
      {open && <ConfirmSheet kind={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
