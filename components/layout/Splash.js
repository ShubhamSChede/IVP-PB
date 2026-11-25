"use client";

import { useEffect, useState } from "react";
import { useLiveData } from "@/components/providers/LiveDataProvider";

// Full-screen loading screen shown when the app is opened.
// Server-rendered visible, so it appears instantly (before JS loads), then
// fades out once live data has loaded — never sooner than MIN_MS, so it
// doesn't flicker, and never later than MAX_MS, so a slow network can't
// trap people on it. Client-side page changes don't show it again.

const MIN_MS = 900;
const MAX_MS = 6000;

export default function Splash() {
  const { loaded, settingsMap } = useLiveData();
  const [minDone, setMinDone] = useState(false);
  const [maxDone, setMaxDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setMinDone(true), MIN_MS);
    const b = setTimeout(() => setMaxDone(true), MAX_MS);
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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg px-8 ${hiding ? "splash-out" : ""}`}
    >
      <div className="splash-ball relative grid size-24 place-items-center rounded-full bg-accent">
        {[
          [50, 20], [24, 38], [76, 38], [50, 52], [30, 72], [70, 72], [50, 86],
        ].map(([x, y], i) => (
          <span
            key={i}
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#063d1c]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
      </div>
      <h1 className="mt-7 text-center text-2xl text-ink-strong">{title}</h1>
      <p className="mt-1 text-sm font-medium text-muted">Live scores · Fixtures · Standings</p>
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-line">
        <div className="splash-bar h-full w-2/5 rounded-full bg-accent" />
      </div>
    </div>
  );
}
