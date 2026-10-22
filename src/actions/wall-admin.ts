"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteStored } from "@/lib/storage";

// Castle Wall moderation. Every action re-checks admin rights here and lands in the audit log.

async function audit(action: string, targetId: string, summary: string) {
  const admin = await requireAdmin();
  await db.adminAction.create({ data: { adminId: admin.id, adminHandle: admin.handle, action, targetId, summary } });
}
const where = (t: { x: number; y: number; owner: { handle: string | null } }) => `square ${t.x + 1},${t.y + 1} by @${t.owner.handle}`;
const tileInfo = { id: true, x: true, y: true, submittedKey: true, publishedKey: true, owner: { select: { handle: true } } } as const;
const done = () => {
  revalidatePath("/admin/wall");
  revalidatePath("/castle-wall");
};

/** Approve the pending submission: that exact image becomes the public artwork. */
export async function approveTile(tileId: string) {
  await requireAdmin();
  const t = await db.wallTile.findUnique({ where: { id: tileId }, select: { ...tileInfo, review: true } });
  if (!t?.submittedKey || t.review !== "PENDING") return;
  await db.wallTile.update({
    where: { id: tileId },
    data: { publishedKey: t.submittedKey, publishedAt: new Date(), publishedVersion: { increment: 1 }, review: "APPROVED", reviewNote: null },
  });
  if (t.publishedKey && t.publishedKey !== t.submittedKey) await deleteStored([t.publishedKey]);
  await audit("wall_approve", tileId, where(t));
  done();
}

/** Turn a submission down with a note the artist sees. The live version (if any) stays. */
export async function rejectTile(tileId: string, formData: FormData) {
  await requireAdmin();
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || "This version can't go on the wall.";
  const t = await db.wallTile.findUnique({ where: { id: tileId }, select: { ...tileInfo, review: true } });
  if (!t || t.review !== "PENDING") return;
  await db.wallTile.update({ where: { id: tileId }, data: { review: "REJECTED", reviewNote: note, submittedKey: t.submittedKey === t.publishedKey ? t.submittedKey : null } });
  if (t.submittedKey && t.submittedKey !== t.publishedKey) await deleteStored([t.submittedKey]);
  await audit("wall_reject", tileId, `${where(t)}: ${note}`);
  done();
}

export async function hideTile(tileId: string, formData: FormData) {
  await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || "Hidden after review";
  const t = await db.wallTile.findUnique({ where: { id: tileId }, select: tileInfo });
  if (!t) return;
  await db.wallTile.update({ where: { id: tileId }, data: { hiddenAt: new Date(), hiddenReason: reason } });
  await db.wallReport.updateMany({ where: { tileId, resolvedAt: null }, data: { resolvedAt: new Date() } });
  await audit("wall_hide", tileId, `${where(t)}: ${reason}`);
  done();
}

export async function restoreTile(tileId: string) {
  await requireAdmin();
  const t = await db.wallTile.findUnique({ where: { id: tileId }, select: tileInfo });
  if (!t) return;
  await db.wallTile.update({ where: { id: tileId }, data: { hiddenAt: null, hiddenReason: null } });
  await audit("wall_restore", tileId, where(t));
  done();
}

/** Remove the artwork (the square stays with its owner, who can draw something else). */
export async function removeArtwork(tileId: string) {
  await requireAdmin();
  const t = await db.wallTile.findUnique({ where: { id: tileId }, select: tileInfo });
  if (!t) return;
  await db.wallTile.update({
    where: { id: tileId },
    data: { publishedKey: null, publishedAt: null, submittedKey: null, review: "REJECTED", reviewNote: "Removed by a moderator.", hiddenAt: null, hiddenReason: null, draft: [], draftUpdatedAt: new Date() },
  });
  await deleteStored([t.publishedKey, t.submittedKey]);
  await db.wallReport.updateMany({ where: { tileId, resolvedAt: null }, data: { resolvedAt: new Date() } });
  await audit("wall_remove_art", tileId, where(t));
  done();
}

/** Free the square entirely (abandoned or abusive), deleting its artwork. */
export async function releaseTile(tileId: string) {
  await requireAdmin();
  const t = await db.wallTile.findUnique({ where: { id: tileId }, select: tileInfo });
  if (!t) return;
  await db.wallTile.delete({ where: { id: tileId } });
  await deleteStored([t.publishedKey, t.submittedKey]);
  await audit("wall_release", tileId, where(t));
  done();
}

/** Give the (empty) square to another builder; the previous owner's artwork is deleted, not transferred. */
export async function reassignTile(tileId: string, formData: FormData) {
  await requireAdmin();
  const handle = String(formData.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase();
  const [t, to] = await Promise.all([
    db.wallTile.findUnique({ where: { id: tileId }, select: tileInfo }),
    db.user.findUnique({ where: { handle }, select: { id: true, wallTile: { select: { id: true } }, wallRestrictedAt: true, suspendedAt: true } }),
  ]);
  if (!t || !to || to.wallTile || to.wallRestrictedAt || to.suspendedAt) return;
  await db.wallTile.update({
    where: { id: tileId },
    data: { ownerId: to.id, claimedAt: new Date(), draft: [], publishedKey: null, publishedAt: null, submittedKey: null, review: "NONE", reviewNote: null, hiddenAt: null, hiddenReason: null },
  });
  await deleteStored([t.publishedKey, t.submittedKey]);
  await audit("wall_reassign", tileId, `${where(t)} → @${handle}`);
  done();
}

/** Stop (or allow again) someone from claiming, drawing or reporting on the wall. */
export async function setWallRestricted(userId: string, restricted: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;
  const u = await db.user.update({ where: { id: userId }, data: { wallRestrictedAt: restricted ? new Date() : null }, select: { handle: true } });
  await audit(restricted ? "wall_restrict" : "wall_unrestrict", userId, `@${u.handle}`);
  done();
}

export async function dismissReports(tileId: string) {
  await requireAdmin();
  const t = await db.wallTile.findUnique({ where: { id: tileId }, select: tileInfo });
  if (!t) return;
  await db.wallReport.updateMany({ where: { tileId, resolvedAt: null }, data: { resolvedAt: new Date() } });
  await audit("wall_dismiss_reports", tileId, where(t));
  done();
}
