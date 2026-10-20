"use server";

import { revalidatePath } from "next/cache";
import { ReactionKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fieldErrors, postSchema } from "@/lib/rules";
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

  await db.post.create({ data: { authorId: viewer.id, body, imageUrl, projectId } });
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
  if (count === 0) await db.postReaction.createMany({ data: [row], skipDuplicates: true });
  revalidatePath("/", "layout");
}
