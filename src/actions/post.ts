"use server";

import { revalidatePath } from "next/cache";
import { ReactionKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { notifyMentions, notifyOnce } from "@/lib/notify";
import { fieldErrors, mentionedHandles, postSchema } from "@/lib/rules";
import { requireBuilder } from "@/lib/session";
import { isOwnUpload } from "@/lib/storage";
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

  const post = await db.post.create({ data: { authorId: viewer.id, body, imageUrl, projectId }, select: { id: true } });
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
  await db.post.deleteMany({ where: { id: postId, authorId: viewer.id } });
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
