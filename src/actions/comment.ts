"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { commentSchema, fieldErrors } from "@/lib/rules";
import { requireBuilder } from "@/lib/session";
import type { FormState } from "./profile";

export type CommentTarget = { postId: string } | { projectId: string };

export async function createComment(target: CommentTarget, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireBuilder();
  const parsed = commentSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const exists =
    "postId" in target
      ? await db.post.findUnique({ where: { id: target.postId }, select: { id: true } })
      : await db.project.findUnique({ where: { id: target.projectId }, select: { id: true } });
  if (!exists) return { errors: { body: "This was deleted." } };

  await db.comment.create({ data: { authorId: viewer.id, body: parsed.data.body, ...target } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Authors can delete their comments; post and project owners can delete comments on their own things. */
export async function deleteComment(commentId: string) {
  const viewer = await requireBuilder();
  const c = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, post: { select: { authorId: true } }, project: { select: { ownerId: true } } },
  });
  if (!c) return;
  const allowed = c.authorId === viewer.id || c.post?.authorId === viewer.id || c.project?.ownerId === viewer.id;
  if (!allowed) throw new Error("You can't delete this comment.");
  await db.comment.delete({ where: { id: commentId } });
  revalidatePath("/", "layout");
}
