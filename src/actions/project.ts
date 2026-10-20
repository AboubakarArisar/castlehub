"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notify, notifyOnce } from "@/lib/notify";
import { fieldErrors, isoWeek, projectSchema, slugify } from "@/lib/rules";
import { requireBuilder } from "@/lib/session";
import { creditBuild, revokeBuild } from "@/lib/streak-store";
import { isOwnUpload } from "@/lib/storage";
import type { FormState } from "./profile";

function readProject(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    type: formData.get("type"),
    tags: formData.get("tags") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    mediaUrl: formData.get("mediaUrl") ?? "",
    iconUrl: formData.get("iconUrl") ?? undefined,
    images: formData.getAll("images").map(String).filter(Boolean),
    launch: formData.get("launch") === "on",
    collaborators: formData.get("collaborators") ?? "",
  });
}

/** Resolve typed handles to builders; the owner is skipped, unknown handles are an error. */
async function resolveCollaborators(ownerId: string, handles: string[]) {
  const users = await db.user.findMany({ where: { handle: { in: handles } }, select: { id: true, handle: true } });
  const missing = handles.filter((h) => !users.some((u) => u.handle === h));
  if (missing.length) return { error: `No builder called @${missing[0]}` };
  return { ids: users.map((u) => u.id).filter((id) => id !== ownerId) };
}

function badUploads(userId: string, icon: string | undefined, images: string[]): Record<string, string> | null {
  if (icon && !isOwnUpload(icon, userId)) return { iconUrl: "Upload the icon again" };
  if (images.some((u) => !isOwnUpload(u, userId))) return { images: "Upload the images again" };
  return null;
}

async function uniqueSlug(ownerId: string, name: string, exceptId?: string) {
  const base = slugify(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const taken = await db.project.findUnique({ where: { ownerId_slug: { ownerId, slug } }, select: { id: true } });
    if (!taken || taken.id === exceptId) return slug;
  }
}

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireBuilder();
  const parsed = readProject(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { images, launch, collaborators, ...p } = parsed.data;
  const bad = badUploads(viewer.id, p.iconUrl, images);
  if (bad) return { errors: bad };
  const team = await resolveCollaborators(viewer.id, collaborators);
  if (team.error) return { errors: { collaborators: team.error } };
  const recent = await db.project.count({ where: { ownerId: viewer.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= 5) return { errors: { form: "That's a lot of projects in an hour. Try again a little later." } };

  const slug = await uniqueSlug(viewer.id, p.name);
  const project = await db.project.create({
    data: {
      ...p,
      slug,
      ownerId: viewer.id,
      launchWeek: launch ? isoWeek() : null,
      images: { create: images.map((url, position) => ({ url, position })) },
      collaborators: { create: team.ids!.map((userId) => ({ userId })) },
    },
    select: { id: true },
  });
  await notify(team.ids!.map((userId) => ({ userId, actorId: viewer.id, kind: "COLLABORATOR_ADDED" as const, projectId: project.id })));
  const day = await creditBuild(viewer.id).catch((e) => void console.error("streak credit failed", e));
  if (day) await db.project.update({ where: { id: project.id }, data: { buildDay: day } });
  revalidatePath("/", "layout");
  redirect(`/${viewer.handle}/${slug}`);
}

export async function updateProject(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireBuilder();
  const existing = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, launchWeek: true, collaborators: { select: { userId: true } } },
  });
  if (!existing || existing.ownerId !== viewer.id) return { errors: { form: "You can only edit your own projects." } };

  const parsed = readProject(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { images, launch, collaborators, ...p } = parsed.data;
  const bad = badUploads(viewer.id, p.iconUrl, images);
  if (bad) return { errors: bad };
  const team = await resolveCollaborators(viewer.id, collaborators);
  if (team.error) return { errors: { collaborators: team.error } };
  const before = new Set(existing.collaborators.map((c) => c.userId));

  const slug = await uniqueSlug(viewer.id, p.name, projectId);
  await db.$transaction([
    db.projectImage.deleteMany({ where: { projectId } }),
    db.projectCollaborator.deleteMany({ where: { projectId } }),
    db.project.update({
      where: { id: projectId },
      data: {
        ...p,
        iconUrl: p.iconUrl ?? null,
        websiteUrl: p.websiteUrl ?? null,
        mediaUrl: p.mediaUrl ?? null,
        slug,
        // Keep an existing launch week; entering now uses the current week.
        launchWeek: launch ? (existing.launchWeek ?? isoWeek()) : null,
        images: { create: images.map((url, position) => ({ url, position })) },
        collaborators: { create: team.ids!.map((userId) => ({ userId })) },
      },
    }),
  ]);
  await notify(team.ids!.filter((id) => !before.has(id)).map((userId) => ({ userId, actorId: viewer.id, kind: "COLLABORATOR_ADDED" as const, projectId })));
  revalidatePath("/", "layout");
  redirect(`/${viewer.handle}/${slug}`);
}

export async function deleteProject(projectId: string) {
  const viewer = await requireBuilder();
  const project = await db.project.findFirst({ where: { id: projectId, ownerId: viewer.id }, select: { buildDay: true } });
  if (!project) throw new Error("You can only delete your own projects.");
  await db.project.delete({ where: { id: projectId } });
  await revokeBuild(viewer.id, project.buildDay);
  revalidatePath("/", "layout");
  redirect(`/${viewer.handle}`);
}

export async function toggleProjectUpvote(projectId: string) {
  const viewer = await requireBuilder();
  const row = { userId: viewer.id, projectId };
  const { count } = await db.projectUpvote.deleteMany({ where: row });
  if (count === 0) {
    await db.projectUpvote.createMany({ data: [row], skipDuplicates: true });
    const project = await db.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
    if (project) await notifyOnce({ userId: project.ownerId, actorId: viewer.id, kind: "PROJECT_UPVOTE", projectId });
  }
  revalidatePath("/", "layout");
}
