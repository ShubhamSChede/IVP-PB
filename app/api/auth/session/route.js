import { getEditor } from "@/lib/auth";

export async function GET() {
  return Response.json({ editor: await getEditor() });
}
