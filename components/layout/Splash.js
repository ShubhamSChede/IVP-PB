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
      {/* eslint-disable-next-line @next/next/no-img-element -- must render before JS; plain img is fine here */}
      <img src="/logo-mark.png" alt="IVP" width={281} height={216} className="splash-ball h-auto w-28" />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-accent-ink">Pickleball Tournament</p>
      <h1 className="mt-2 text-center text-2xl text-ink-strong">{title}</h1>
      <p className="mt-1 text-sm text-muted">Live scores · Fixtures · Standings</p>
      <div className="mt-8 h-1 w-40 overflow-hidden bg-line">
        <div className="splash-bar h-full w-2/5 bg-accent" />
      </div>
    </div>
  );
}
