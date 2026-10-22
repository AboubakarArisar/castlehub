import { db } from "@/lib/db";
import { readStored } from "@/lib/storage";

// Plays a voice comment's audio while the comment exists. Once it's deleted, this 404s at once.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{1,40}$/.test(id)) return new Response(null, { status: 404 });
  const c = await db.comment.findFirst({ where: { id, kind: "VOICE" }, select: { audioKey: true, audioMime: true } });
  if (!c?.audioKey) return new Response(null, { status: 404 });
  const res = await readStored(c.audioKey, request.headers.get("range"), c.audioMime ?? "audio/webm");
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-content-type-options", "nosniff");
  return res;
}
