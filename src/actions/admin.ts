"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, type Viewer } from "@/lib/session";
import { revokeBuild } from "@/lib/streak-store";
import { deleteStored } from "@/lib/storage";

const snip = (s: string) => (s.length > 140 ? `${s.slice(0, 140)}…` : s);

function log(admin: Viewer, action: string, targetId: string, summary: string) {
  return db.adminAction.create({ data: { adminId: admin.id, adminHandle: admin.handle, action, targetId, summary } });
}

export async function adminDeletePost(id: string) {
  const admin = await requireAdmin();
  const post = await db.post.findUnique({ where: { id }, select: { body: true, authorId: true, buildDay: true, author: { select: { handle: true } } } });
  if (!post) return;
  const voices = await db.comment.findMany({ where: { postId: id, kind: "VOICE" }, select: { audioKey: true } });
  await db.post.delete({ where: { id } });
  await deleteStored(voices.map((v) => v.audioKey));
  await revokeBuild(post.authorId, post.buildDay);
  await log(admin, "delete_post", id, `@${post.author.handle}: ${snip(post.body)}`);
  revalidatePath("/", "layout");
}

export async function adminDeleteComment(id: string) {
  const admin = await requireAdmin();
  const comment = await db.comment.findUnique({ where: { id }, select: { body: true, kind: true, audioKey: true, audioDuration: true, author: { select: { handle: true } } } });
  if (!comment) return;
  await db.comment.delete({ where: { id } });
  await deleteStored([comment.audioKey]);
  const summary = comment.kind === "VOICE" ? `voice comment (${Math.round(comment.audioDuration ?? 0)}s)` : snip(comment.body);
  await log(admin, "delete_comment", id, `@${comment.author.handle}: ${summary}`);
  revalidatePath("/", "layout");
}

export async function adminDeleteProject(id: string) {
  const admin = await requireAdmin();
  const project = await db.project.findUnique({ where: { id }, select: { name: true, slug: true, ownerId: true, buildDay: true, owner: { select: { handle: true } } } });
  if (!project) return;
  const voices = await db.comment.findMany({ where: { projectId: id, kind: "VOICE" }, select: { audioKey: true } });
  await db.project.delete({ where: { id } });
  await deleteStored(voices.map((v) => v.audioKey));
  await revokeBuild(project.ownerId, project.buildDay);
  await log(admin, "delete_project", id, `${project.name} (/${project.owner.handle}/${project.slug})`);
  revalidatePath("/", "layout");
}

export async function adminSetSuspended(userId: string, suspend: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You can't suspend yourself");
  const user = await db.user.update({
    where: { id: userId },
    data: { suspendedAt: suspend ? new Date() : null },
    select: { handle: true, name: true },
  });
  await log(admin, suspend ? "suspend" : "unsuspend", userId, `${user.name ?? "unnamed"} (@${user.handle ?? "no handle"})`);
  revalidatePath("/", "layout");
}
