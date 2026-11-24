import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Edit mode = one shared code. A correct code gets a signed, httpOnly cookie
// carrying the editor's display name. No user accounts.

export const EDIT_COOKIE = "pb_edit";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — covers a full tournament day

function sign(payload) {
  return createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isValidEditCode(code) {
  return Boolean(process.env.EDIT_CODE) && safeEqual(code ?? "", process.env.EDIT_CODE);
}

export function createEditToken(name) {
  const payload = Buffer.from(
    JSON.stringify({ name, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readEditToken(token) {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? { name: data.name } : null;
  } catch {
    return null;
  }
}

export const editCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/** Returns { name } for a valid editor, else null. Use in route handlers. */
export async function getEditor() {
  const store = await cookies();
  return readEditToken(store.get(EDIT_COOKIE)?.value);
}
