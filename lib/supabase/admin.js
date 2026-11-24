import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Only ever imported by API route handlers,
// and only after the edit session has been verified.
let client;

export function getAdminSupabase() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}
