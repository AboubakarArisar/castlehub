import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audioDuration, MAX_VOICE_BYTES, MAX_VOICE_SECONDS, sniffAudio } from "@/lib/audio";
import { notify } from "@/lib/notify";
import { getViewer } from "@/lib/session";
import { deleteStored, saveAudio } from "@/lib/storage";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Publish a voice comment on a post or project. Everything is checked here, on the server:
// who is posting, the target, the file's real type, size and length.
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return fail("Sign in to leave a voice comment.", 401);
  if (!viewer.handle) return fail("Pick a handle first.", 403);
  if (viewer.suspendedAt) return fail("Your account is suspended.", 403);

  const recent = await db.comment.count({ where: { authorId: viewer.id, kind: "VOICE", createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 10) return fail("That's a lot of voice notes. Try again in a few minutes.", 429);

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  const postId = String(form?.get("postId") ?? "") || null;
  const projectId = String(form?.get("projectId") ?? "") || null;
  if (!(file instanceof File) || Boolean(postId) === Boolean(projectId)) return fail("Missing recording or target.");
  if (file.size === 0) return fail("That recording is empty.");
  if (file.size > MAX_VOICE_BYTES) return fail("That recording is too large.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffAudio(bytes);
  if (!kind) return fail("That doesn't look like an audio recording.");
  const seconds = audioDuration(bytes, kind);
  if (seconds === null) return fail("Couldn't read the recording's length. Try recording again.");
  if (seconds > MAX_VOICE_SECONDS + 0.5) return fail(`Voice comments are up to ${MAX_VOICE_SECONDS} seconds.`);
  if (seconds < 0.3) return fail("That recording is too short.");

  const ownerId = postId
    ? (await db.post.findUnique({ where: { id: postId }, select: { authorId: true } }))?.authorId
    : (await db.project.findUnique({ where: { id: projectId! }, select: { ownerId: true } }))?.ownerId;
  if (!ownerId) return fail("This was deleted.", 404);

  const key = await saveAudio(bytes, viewer.id, kind);
  let comment;
  try {
    comment = await db.comment.create({
      data: { authorId: viewer.id, body: "", kind: "VOICE", audioKey: key, audioDuration: Math.round(seconds * 10) / 10, audioMime: kind.mime, audioSize: bytes.length, ...(postId ? { postId } : { projectId }) },
      select: { id: true },
    });
  } catch (e) {
    await deleteStored([key]); // never leave an orphaned recording behind
    throw e;
  }
  await notify([{ userId: ownerId, actorId: viewer.id, kind: postId ? "POST_COMMENT" : "PROJECT_COMMENT", commentId: comment.id, ...(postId ? { postId } : { projectId: projectId! }) }]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: comment.id });
}
