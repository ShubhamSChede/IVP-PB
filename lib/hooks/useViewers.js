"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// How many devices have the site open right now (Supabase realtime presence).
// Each device joins with a random id kept in localStorage, so several tabs on
// one phone count once. Nothing is stored in the database.

function deviceId() {
  try {
    let id = localStorage.getItem("pb_device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("pb_device", id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2); // private mode: count per tab
  }
}

export function useViewers() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    const channel = sb.channel("viewers", { config: { presence: { key: deviceId() } } });
    channel
      .on("presence", { event: "sync" }, () => setCount(Object.keys(channel.presenceState()).length))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ at: Date.now() });
      });
    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  return count;
}
