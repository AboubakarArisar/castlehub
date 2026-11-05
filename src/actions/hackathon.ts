"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hackathonStatus, readSubmission, type SubmissionInput } from "@/lib/hackathons";
import { fieldErrors } from "@/lib/rules";
import { requireBuilder } from "@/lib/session";
import { isOwnUpload } from "@/lib/storage";
import type { FormState } from "./profile";

const closedMessage = (closesAt: Date | null) =>
  `Submissions are closed${closesAt ? ` (the deadline was ${closesAt.toUTCString().replace("GMT", "UTC")})` : ""}. Your changes weren't saved.`;

/** The event, if it's accepting builds right now (checked at the moment of saving). */
async function openEvent(hackathonId: string) {
  const h = await db.hackathon.findUnique({
    where: { id: hackathonId },
    select: { id: true, slug: true, opensAt: true, closesAt: true, override: true, publishedAt: true, archivedAt: true },
  });
  if (!h || !h.publishedAt) return { error: "That hackathon doesn't exist." };
  if (hackathonStatus(h) !== "open") return { error: closedMessage(h.closesAt) };
  return { event: h };
}

/** Images must be files this member uploaded through /api/upload. */
function badUploads(userId: string, b: SubmissionInput): Record<string, string> | null {
  if (b.coverUrl && !isOwnUpload(b.coverUrl, userId)) return { coverUrl: "Upload the cover image again" };
  if (b.images.some((u) => !isOwnUpload(u, userId))) return { images: "Upload the screenshots again" };
  return null;
}

const ALREADY = "You already have a build in this hackathon. Open it from “my builds” to edit it.";

export async function submitBuild(hackathonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireBuilder();
  const parsed = readSubmission(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const bad = badUploads(viewer.id, parsed.data);
  if (bad) return { errors: bad };
  const { event, error } = await openEvent(hackathonId);
  if (!event) return { errors: { form: error } };

  const existing = await db.hackathonSubmission.findUnique({
    where: { hackathonId_authorId: { hackathonId, authorId: viewer.id } },
    select: { id: true, withdrawnAt: true },
  });
  let id: string;
  if (existing && !existing.withdrawnAt) return { errors: { form: ALREADY } };
  if (existing) {
    // Re-entering after withdrawing reuses the same entry (still one per member). A hidden
    // entry stays hidden: only an admin can restore it.
    const { count } = await db.hackathonSubmission.updateMany({
      where: { id: existing.id, withdrawnAt: { not: null } },
      data: { ...parsed.data, withdrawnAt: null },
    });
    if (!count) return { errors: { form: ALREADY } };
    id = existing.id;
  } else {
    try {
      ({ id } = await db.hackathonSubmission.create({ data: { ...parsed.data, hackathonId, authorId: viewer.id }, select: { id: true } }));
    } catch (e) {
      // Two submits at once (double click, two tabs): the unique index lets only one in.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { errors: { form: ALREADY } };
      throw e;
    }
  }
  revalidatePath("/hackathons", "layout");
  redirect(`/hackathons/${event.slug}/builds/${id}?submitted=1`);
}

export async function updateBuild(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireBuilder();
  const existing = await db.hackathonSubmission.findUnique({ where: { id }, select: { authorId: true, hackathonId: true, withdrawnAt: true } });
  if (!existing || existing.authorId !== viewer.id) return { errors: { form: "You can only edit your own build." } };
  if (existing.withdrawnAt) return { errors: { form: "This build was withdrawn. Submit it again from the hackathon page." } };
  const parsed = readSubmission(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const bad = badUploads(viewer.id, parsed.data);
  if (bad) return { errors: bad };
  const { event, error } = await openEvent(existing.hackathonId);
  if (!event) return { errors: { form: error } };

  // hiddenAt and featuredAt are moderator fields and are never touched here.
  await db.hackathonSubmission.update({ where: { id }, data: parsed.data });
  revalidatePath("/hackathons", "layout");
  redirect(`/hackathons/${event.slug}/builds/${id}?saved=1`);
}

export async function withdrawBuild(id: string): Promise<FormState> {
  const viewer = await requireBuilder();
  const existing = await db.hackathonSubmission.findUnique({ where: { id }, select: { authorId: true, hackathonId: true } });
  if (!existing || existing.authorId !== viewer.id) return { errors: { form: "You can only withdraw your own build." } };
  const { event, error } = await openEvent(existing.hackathonId);
  if (!event) return { errors: { form: error } };
  await db.hackathonSubmission.update({ where: { id }, data: { withdrawnAt: new Date() } });
  revalidatePath("/hackathons", "layout");
  redirect(`/hackathons/${event.slug}/builds/${id}?withdrawn=1`);
}
