"use server";

import { revalidatePath } from "next/cache";
import { ReactionKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { notifyMentions, notifyOnce } from "@/lib/notify";
import { fieldErrors, mentionedHandles, postSchema } from "@/lib/rules";
import { requireBuilder } from "@/lib/session";
import { creditBuild, revokeBuild } from "@/lib/streak-store";
import { isValidTimeZone } from "@/lib/streaks";
import { deleteStored, isOwnUpload } from "@/lib/storage";
import type { FormState } from "./profile";

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireBuilder();
  const parsed = postSchema.safeParse({
    body: formData.get("body") ?? "",
    imageUrl: formData.get("imageUrl") ?? undefined,
    projectId: formData.get("projectId") ?? undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { body, imageUrl, projectId } = parsed.data;

  if (imageUrl && !isOwnUpload(imageUrl, viewer.id)) return { errors: { imageUrl: "Upload the image again" } };
  if (projectId) {
    const own = await db.project.findFirst({ where: { id: projectId, ownerId: viewer.id }, select: { id: true } });
    if (!own) return { errors: { projectId: "You can only tag your own projects" } };
  }

  // Rate limit, and no streak credit for re-posting the same thing.
  const since = (ms: number) => ({ gte: new Date(Date.now() - ms) });
  const [recent, last] = await Promise.all([
    db.post.count({ where: { authorId: viewer.id, createdAt: since(10 * 60_000) } }),
    db.post.findFirst({ where: { authorId: viewer.id, createdAt: since(24 * 3600_000) }, orderBy: { createdAt: "desc" }, select: { body: true, imageUrl: true } }),
  ]);
  if (recent >= 10) return { errors: { body: "You're posting fast. Take a breather and try again in a few minutes." } };
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const duplicate = Boolean(last && norm(last.body) === norm(body) && (last.imageUrl ?? undefined) === imageUrl);

  // The browser's timezone, saved once so build days follow the builder's own calendar.
  const tz = formData.get("tz");
  if (!viewer.timezone && isValidTimeZone(tz)) await db.user.update({ where: { id: viewer.id }, data: { timezone: tz } });

  const post = await db.post.create({ data: { authorId: viewer.id, body, imageUrl, projectId }, select: { id: true } });
  if (!duplicate) {
    const day = await creditBuild(viewer.id).catch((e) => void console.error("streak credit failed", e));
    if (day) await db.post.update({ where: { id: post.id }, data: { buildDay: day } });
  }
  await notifyMentions(mentionedHandles(body), { actorId: viewer.id, postId: post.id });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Authors can edit the text of their post (the image and project tag stay). */
export async function updatePost(postId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireBuilder();
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true, imageUrl: true, body: true } });
  if (!post || post.authorId !== viewer.id) return { errors: { body: "You can only edit your own posts." } };
  const parsed = postSchema.safeParse({ body: formData.get("body") ?? "", imageUrl: post.imageUrl ?? undefined });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (parsed.data.body === post.body) return { ok: true };

  await db.post.update({ where: { id: postId }, data: { body: parsed.data.body, editedAt: new Date() } });
  // Only people newly mentioned by the edit get a notification.
  const before = new Set(mentionedHandles(post.body));
  await notifyMentions(mentionedHandles(parsed.data.body).filter((h) => !before.has(h)), { actorId: viewer.id, postId });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePost(postId: string) {
  const viewer = await requireBuilder();
  const post = await db.post.findFirst({ where: { id: postId, authorId: viewer.id }, select: { buildDay: true } });
  if (!post) return;
  const voices = await db.comment.findMany({ where: { postId, kind: "VOICE" }, select: { audioKey: true } });
  await db.post.delete({ where: { id: postId } });
  await deleteStored(voices.map((v) => v.audioKey));
  // Deleted posts give back their streak credit, so posting-then-deleting can't keep a streak.
  await revokeBuild(viewer.id, post.buildDay);
  revalidatePath("/", "layout");
}

export async function togglePostReaction(postId: string, kind: ReactionKind) {
  const viewer = await requireBuilder();
  if (!Object.values(ReactionKind).includes(kind)) throw new Error("Unknown reaction");
  const row = { userId: viewer.id, postId, kind };
  const { count } = await db.postReaction.deleteMany({ where: row });
  if (count === 0) {
    await db.postReaction.createMany({ data: [row], skipDuplicates: true });
    const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post) await notifyOnce({ userId: post.authorId, actorId: viewer.id, kind: "POST_REACTION", postId });
  }
  revalidatePath("/", "layout");
}
