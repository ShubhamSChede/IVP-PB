"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

// Thumb-friendly score input: [−] [ 15 ] [+]  (44px targets, numeric keypad).
// Optimistic: shows the draft instantly, saves after a short pause (so tapping
// + five times = one write), and falls back to the server value on failure.

const DEBOUNCE_MS = 450;

export default function ScoreStepper({ value, onSave, label, highlight = false, max = 99 }) {
  const [draft, setDraft] = useState(null); // string while editing; null = show server value
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);
  const seq = useRef(0);
  const latest = useRef(null);

  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });
  // Unmounting (e.g. the court gets locked) with a save still pending: send it.
  useEffect(
    () => () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      const v = latest.current;
      saveRef.current(v === "" || v == null ? null : Number(v));
    },
    []
  );

  async function commit(next) {
    clearTimeout(timer.current);
    timer.current = null;
    const mine = ++seq.current;
    setSaving(true);
    try {
      await onSave(next === "" || next == null ? null : Number(next));
    } finally {
      if (seq.current === mine) {
        setSaving(false);
        setDraft(null);
      }
    }
  }

  function schedule(next) {
    setDraft(next);
    latest.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), DEBOUNCE_MS);
  }

  function step(delta) {
    const base = draft !== null ? (draft === "" ? null : Number(draft)) : value;
    const next = base == null ? (delta > 0 ? 1 : 0) : Math.min(max, Math.max(0, base + delta));
    schedule(String(next));
  }

  const shown = draft ?? (value ?? "");

  return (
    <div className={`flex min-w-0 items-center rounded-xl border ${highlight ? "border-accent/60" : "border-line"} bg-bg`}>
      <button
        type="button"
        onClick={() => step(-1)}
        className="grid h-12 w-11 shrink-0 place-items-center rounded-l-xl text-muted active:bg-surface-2"
        aria-label={`${label}: minus one`}
      >
        <Icon name="minus" size={20} />
      </button>
      <input
        value={shown}
        onChange={(e) => schedule(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => {
          if (timer.current) commit(latest.current); // flush a pending save right away
        }}
        onFocus={(e) => e.target.select()}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        placeholder="–"
        className={`h-12 w-full min-w-0 bg-transparent text-center text-xl tabular-nums outline-none placeholder:text-muted/60 ${
          highlight ? "text-accent-ink" : "text-ink-strong"
        } ${saving ? "opacity-60" : ""}`}
      />
      <button
        type="button"
        onClick={() => step(1)}
        className="grid h-12 w-11 shrink-0 place-items-center rounded-r-xl text-muted active:bg-surface-2"
        aria-label={`${label}: plus one`}
      >
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}
