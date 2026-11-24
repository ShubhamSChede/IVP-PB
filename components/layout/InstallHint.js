"use client";

import { useSyncExternalStore } from "react";

// "Add to Home Screen" tip, hidden once the site is already running as an app.
const subscribe = () => () => {};
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

export default function InstallHint() {
  const standalone = useSyncExternalStore(subscribe, isStandalone, () => true);
  if (standalone) return null;
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-accent/40 p-4">
      <p className="text-base text-ink-strong">Use it like an app</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-muted">
        iPhone: tap <span className="text-ink">Share</span> → <span className="text-ink">Add to Home Screen</span>.
        Android: tap <span className="text-ink">⋮</span> → <span className="text-ink">Add to Home screen</span>.
        It opens full-screen with live scores.
      </p>
    </div>
  );
}
