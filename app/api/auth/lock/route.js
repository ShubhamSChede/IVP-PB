import { cookies } from "next/headers";
import { EDIT_COOKIE } from "@/lib/auth";

export async function POST() {
  (await cookies()).delete(EDIT_COOKIE);
  return Response.json({ editor: null });
}
