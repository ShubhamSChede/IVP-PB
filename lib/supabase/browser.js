"use client";

import { createClient } from "@supabase/supabase-js";

// Read-only client for the browser (anon key). Used for initial reads and
// realtime subscriptions. RLS blocks every write from this key.
let client;

export function getBrowserSupabase() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 20 } },
      }
    );
  }
  return client;
}
