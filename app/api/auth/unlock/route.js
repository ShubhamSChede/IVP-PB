import { cookies } from "next/headers";
import { EDIT_COOKIE, createEditToken, editCookieOptions, isValidEditCode } from "@/lib/auth";

// Basic brute-force guard (per server instance): 8 wrong tries per IP per 10 min.
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRIES = 8;

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && now - entry.first < WINDOW_MS && entry.count >= MAX_TRIES) {
    return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const { code, name } = await request.json().catch(() => ({}));
  const displayName = String(name ?? "").trim().slice(0, 40) || "Organiser";

  if (!isValidEditCode(String(code ?? "").trim())) {
    const fresh = !entry || now - entry.first >= WINDOW_MS;
    attempts.set(ip, fresh ? { first: now, count: 1 } : { ...entry, count: entry.count + 1 });
    return Response.json({ error: "Wrong code" }, { status: 401 });
  }

  attempts.delete(ip);
  (await cookies()).set(EDIT_COOKIE, createEditToken(displayName), editCookieOptions);
  return Response.json({ editor: { name: displayName } });
}
