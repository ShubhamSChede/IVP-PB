"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useEditor } from "@/components/providers/EditorProvider";
import { useToast } from "@/components/providers/ToastProvider";

const NAME_KEY = "pb_name";

export default function UnlockSheet({ open, onClose }) {
  const { unlock } = useEditor();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(NAME_KEY) ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ed = await unlock(code.trim(), name.trim());
      localStorage.setItem(NAME_KEY, name.trim());
      setCode("");
      onClose();
      toast(`Edit mode on — hi ${ed.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "h-12 w-full rounded-xl border border-line bg-bg px-4 text-base text-ink-strong placeholder:text-muted/70 focus:border-accent focus:outline-none";

  return (
    <Sheet open={open} onClose={onClose} title="Unlock edit mode">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Your name (shown to other editors)</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Asha" autoComplete="nickname" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Edit code</span>
          <input
            className={input}
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoComplete="off"
            required
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          disabled={busy || !code.trim()}
          className="h-12 w-full rounded-xl bg-accent text-base font-bold text-black transition-opacity disabled:opacity-40"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </Sheet>
  );
}
