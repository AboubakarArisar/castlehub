import "server-only";
import type { NotificationKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type Note = { userId: string; actorId: string; kind: NotificationKind; postId?: string; projectId?: string; commentId?: string };

/** Save notifications, skipping anyone notifying themselves. Never throws: a failed notification must not fail the action. */
export async function notify(notes: Note[]) {
  const rows = notes.filter((n) => n.userId !== n.actorId);
  if (rows.length === 0) return;
  await db.notification.createMany({ data: rows }).catch((e) => console.error("notify failed", e));
}

/** For toggles (reactions, upvotes): one notification per person per thing, however often they click. */
export async function notifyOnce(note: Note) {
  if (note.userId === note.actorId) return;
  const { userId, actorId, kind, postId, projectId } = note;
  const seen = await db.notification.findFirst({ where: { userId, actorId, kind, postId, projectId }, select: { id: true } });
  if (!seen) await notify([note]);
}

/** Notify builders @mentioned in a text (except those in `skip`, who already get a notification). */
export async function notifyMentions(handles: string[], base: Omit<Note, "userId" | "kind">, skip: string[] = []) {
  if (handles.length === 0) return;
  const users = await db.user.findMany({ where: { handle: { in: handles } }, select: { id: true } });
  await notify(users.filter((u) => !skip.includes(u.id)).map((u) => ({ ...base, userId: u.id, kind: "MENTION" as const })));
}
