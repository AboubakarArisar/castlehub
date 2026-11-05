"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hackathonSchema, publishProblems } from "@/lib/hackathons";
import { fieldErrors } from "@/lib/rules";
import { requireAdmin, type Viewer } from "@/lib/session";
import { isOwnUpload } from "@/lib/storage";
import type { FormState } from "./profile";

// Every action re-checks admin rights on the server and writes to the audit log.

function log(admin: Viewer, action: string, targetId: string, summary: string) {
  return db.adminAction.create({ data: { adminId: admin.id, adminHandle: admin.handle, action, targetId, summary } });
}

const refresh = () => revalidatePath("/", "layout");

/** Create or edit an event. intent=publish also publishes it, once it has everything it needs. */
export async function saveHackathon(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = hackathonSchema.safeParse(Object.fromEntries(
    ["title", "slug", "summary", "brief", "theme", "rules", "prizes", "linkUrl", "coverUrl", "opensAt", "closesAt"].map((k) => [k, String(formData.get(k) ?? "")]),
  ));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const existing = id ? await db.hackathon.findUnique({ where: { id }, select: { coverUrl: true, publishedAt: true } }) : null;
  if (id && !existing) return { errors: { form: "That hackathon no longer exists." } };
  // A new cover must be an upload; an unchanged one may have been uploaded by another admin.
  if (data.coverUrl && data.coverUrl !== existing?.coverUrl && !isOwnUpload(data.coverUrl, admin.id)) return { errors: { coverUrl: "Upload the cover again" } };

  const publish = formData.get("intent") === "publish";
  // A published event must stay complete; drafts can be saved half-finished.
  if (publish || existing?.publishedAt) {
    const problems = publishProblems(data);
    if (Object.keys(problems).length) return { errors: problems };
  }

  let saved: { id: string; slug: string };
  try {
    saved = id
      ? await db.hackathon.update({ where: { id }, data: { ...data, ...(publish && !existing?.publishedAt && { publishedAt: new Date() }) }, select: { id: true, slug: true } })
      : await db.hackathon.create({ data: { ...data, createdById: admin.id, ...(publish && { publishedAt: new Date() }) }, select: { id: true, slug: true } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { errors: { slug: "Another hackathon already uses that address" } };
    throw e;
  }

  const action = publish && !existing?.publishedAt ? "hackathon_publish" : id ? "hackathon_edit" : "hackathon_create";
  await log(admin, action, saved.id, `${data.title} (/hackathons/${saved.slug})`);
  refresh();
  if (!id) redirect(`/admin/hackathons/${saved.id}?saved=1`);
  return { ok: true };
}

async function eventFor(id: string) {
  const h = await db.hackathon.findUnique({ where: { id }, select: { id: true, title: true, slug: true, publishedAt: true } });
  if (!h) throw new Error("That hackathon no longer exists.");
  return h;
}

export async function setArchived(id: string, archive: boolean) {
  const admin = await requireAdmin();
  const h = await eventFor(id);
  if (archive && !h.publishedAt) throw new Error("Publish the hackathon before archiving it.");
  await db.hackathon.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await log(admin, archive ? "hackathon_archive" : "hackathon_unarchive", id, h.title);
  refresh();
}

/** Close submissions early, reopen them, or go back to following the dates (null). */
export async function setSubmissionOverride(id: string, override: "OPEN" | "CLOSED" | null) {
  const admin = await requireAdmin();
  const h = await eventFor(id);
  await db.hackathon.update({ where: { id }, data: { override } });
  const action = override === "OPEN" ? "hackathon_reopen" : override === "CLOSED" ? "hackathon_close" : "hackathon_schedule";
  await log(admin, action, id, h.title);
  refresh();
}

async function buildFor(id: string) {
  const b = await db.hackathonSubmission.findUnique({ where: { id }, select: { name: true, author: { select: { handle: true } }, hackathon: { select: { title: true } } } });
  if (!b) throw new Error("That build no longer exists.");
  return { b, summary: `${b.name} by @${b.author.handle} (${b.hackathon.title})` };
}

/** Editorial pick shown as "featured"; it isn't a ranking or a prize. */
export async function setFeatured(id: string, featured: boolean) {
  const admin = await requireAdmin();
  const { summary } = await buildFor(id);
  await db.hackathonSubmission.update({ where: { id }, data: { featuredAt: featured ? new Date() : null } });
  await log(admin, featured ? "build_feature" : "build_unfeature", id, summary);
  refresh();
}

export async function hideBuild(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!reason) throw new Error("Give a reason for hiding this build.");
  const { summary } = await buildFor(id);
  await db.hackathonSubmission.update({ where: { id }, data: { hiddenAt: new Date(), hiddenReason: reason, featuredAt: null } });
  await log(admin, "build_hide", id, `${summary}: ${reason}`);
  refresh();
}

export async function restoreBuild(id: string) {
  const admin = await requireAdmin();
  const { summary } = await buildFor(id);
  await db.hackathonSubmission.update({ where: { id }, data: { hiddenAt: null, hiddenReason: null } });
  await log(admin, "build_restore", id, summary);
  refresh();
}
