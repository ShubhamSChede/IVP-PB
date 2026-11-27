"use client";

import { useEffect, useState } from "react";
import { useLiveData } from "@/components/providers/LiveDataProvider";

// Full-screen loading screen shown when the app is opened.
// Server-rendered visible, so it appears instantly (before JS loads).
// The rally + "five stages" run on pure CSS from first paint (no JS needed),
// one stage per second. It fades out once live data has loaded — never before
// MIN_MS (so all five stages play), never after MAX_MS (slow networks).
// Timers are measured from page load, so they stay in sync with the CSS.
// Client-side page changes don't show it again.

const MIN_MS = 5200;
const MAX_MS = 8000;

const STAGES = [
  ["Denial", "It's not a real sport."],
  ["Anger", "It's not even that hard. Play tennis instead."],
  ["Bargaining", "My friends are playing it… maybe I'll try."],
  ["Fun", "Oh, this is really satisfying. I see why people love it now."],
  ["Acceptance", "Do what you love, love what you do."],
];

function Paddle() {
  return (
    <svg viewBox="0 0 28 58" width="28" height="58" aria-hidden="true">
      <rect x="2" y="2" width="24" height="34" rx="11" fill="var(--text-strong)" stroke="var(--accent)" strokeWidth="2.5" />
      <rect x="7" y="9" width="14" height="4" rx="2" fill="var(--accent)" opacity="0.55" />
      <rect x="10.5" y="35" width="7" height="21" rx="2" fill="var(--accent)" />
      <rect x="10.5" y="44" width="7" height="2" fill="var(--text-strong)" opacity="0.35" />
      <rect x="10.5" y="49" width="7" height="2" fill="var(--text-strong)" opacity="0.35" />
    </svg>
  );
}

function Rally() {
  return (
    <div className="splash-court relative mt-9 h-[104px] w-60" aria-hidden="true">
      {/* Floor + net */}
      <span className="absolute inset-x-0 bottom-0 h-px bg-line" />
      <span className="absolute bottom-0 left-1/2 h-7 w-[3px] -translate-x-1/2 bg-ink-strong/80" />
      <span className="absolute bottom-7 left-1/2 h-[3px] w-3 -translate-x-1/2 bg-ink-strong/80" />

      {/* Paddles (right one mirrored, half a beat behind) */}
      <span className="absolute bottom-1 left-2"><span className="splash-paddle block"><Paddle /></span></span>
      <span className="absolute bottom-1 right-2 -scale-x-100"><span className="splash-paddle splash-paddle-b block"><Paddle /></span></span>

      {/* Ball: X travels linearly, Y arcs — two animations make a parabola */}
      <span className="splash-ball-x absolute bottom-0 left-0 block">
        <span className="splash-shadow absolute bottom-0 left-0 block h-1 w-3.5 rounded-[50%] bg-ink-strong/15" />
        <span className="splash-ball-y absolute bottom-[34px] left-0 block size-3.5">
          <svg viewBox="0 0 14 14" width="14" height="14">
            <circle cx="7" cy="7" r="6.5" fill="var(--accent)" stroke="var(--accent-hover)" strokeWidth="1" />
            <circle cx="4.6" cy="5" r="1" fill="var(--accent-hover)" />
            <circle cx="9.2" cy="5.4" r="1" fill="var(--accent-hover)" />
            <circle cx="6.8" cy="9.4" r="1" fill="var(--accent-hover)" />
          </svg>
        </span>
      </span>
    </div>
  );
}

export default function Splash() {
  const { loaded, settingsMap } = useLiveData();
  const [minDone, setMinDone] = useState(false);
  const [maxDone, setMaxDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const since = performance.now(); // ms since the page started loading
    const a = setTimeout(() => setMinDone(true), Math.max(0, MIN_MS - since));
    const b = setTimeout(() => setMaxDone(true), Math.max(0, MAX_MS - since));
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const hiding = (loaded && minDone) || maxDone;

  useEffect(() => {
    if (!hiding) return;
    const t = setTimeout(() => setGone(true), 400); // after the fade
    return () => clearTimeout(t);
  }, [hiding]);

  if (gone) return null;

  const title = settingsMap.event_title || "IVP Pickleball 2026";

  return (
    <div
      aria-hidden={hiding}
      role="status"
      aria-label="Loading"
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-bg px-8 ${hiding ? "splash-out" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- must render before JS; plain img is fine here */}
      <img src="/logo-mark.png" alt="IVP" width={281} height={216} className="splash-logo h-auto w-24" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-accent-ink">Pickleball Tournament</p>
      <h1 className="mt-2 text-center text-2xl text-ink-strong">{title}</h1>

      <Rally />

      {/* The five stages of pickleball — one per second */}
      <div className="relative mt-8 h-[4.5rem] w-full max-w-xs text-center">
        {STAGES.map(([stage, quote], i) => (
          <div
            key={stage}
            className={`splash-stage absolute inset-0 ${i === STAGES.length - 1 ? "splash-stage-last" : ""}`}
            style={{ animationDelay: `${i}s` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">
              Stage {i + 1} · <span className="text-accent-ink">{stage}</span>
            </p>
            <p className="mt-1.5 text-[15px] font-medium italic leading-snug text-ink-strong">&ldquo;{quote}&rdquo;</p>
          </div>
        ))}
      </div>

      {/* Stage progress */}
      <div className="mt-3 grid w-40 grid-cols-5 gap-1">
        {STAGES.map(([stage], i) => (
          <span key={stage} className="h-1 overflow-hidden bg-line">
            <span className="splash-seg block h-full bg-accent" style={{ animationDelay: `${i}s` }} />
          </span>
        ))}
      </div>
    </div>
  );
}
