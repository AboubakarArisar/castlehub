import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { deleteStored, saveWallImage } from "@/lib/storage";
import { MAX_PNG_BYTES, pngSize, strokesSchema, TILE_PX, wallSide, type Stroke, type TileState } from "@/lib/wall";

// Castle Wall server logic. Every write identifies the tile from the signed-in builder (their own
// tile), never from an id sent by the browser, so ownership can't be forged.

export class WallError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type Viewer = { id: string; handle: string | null; suspendedAt: Date | null } | null;

/** Signed in, has a handle, not suspended, not restricted from the wall. */
export async function requireWallArtist(viewer: Viewer) {
  if (!viewer) throw new WallError("Sign in to draw on the wall.", 401);
  if (!viewer.handle) throw new WallError("Pick a handle first.", 403);
  if (viewer.suspendedAt) throw new WallError("Your account is suspended.", 403);
  const u = await db.user.findUnique({ where: { id: viewer.id }, select: { wallRestrictedAt: true } });
  if (u?.wallRestrictedAt) throw new WallError("A moderator has paused your access to the Castle Wall.", 403);
  return viewer as { id: string; handle: string };
}

export type WallTileView = {
  id: string;
  x: number;
  y: number;
  state: Exclude<TileState, "available">;
  owner: { handle: string; name: string | null; image: string | null } | null;
  image: string | null;
  publishedAt: string | null;
};

/** Changes whenever anything on the wall changes (count + latest update). One cheap query. */
export async function getWallStamp() {
  const agg = await db.wallTile.aggregate({ _count: true, _max: { updatedAt: true } });
  return { count: agg._count, stamp: `${agg._count}-${agg._max.updatedAt?.getTime() ?? 0}` };
}

/**
 * The wall for viewers: every claimed square with its public state. Hidden squares show no
 * owner or image; drafts and pending submissions are never included.
 * `stamp` changes whenever anything visible changes, so clients can skip unchanged polls.
 */
export async function getWall() {
  const [tiles, { count, stamp }] = await Promise.all([
    db.wallTile.findMany({
      select: {
        id: true, x: true, y: true, hiddenAt: true, publishedKey: true, publishedAt: true, publishedVersion: true,
        owner: { select: { handle: true, name: true, image: true, suspendedAt: true } },
      },
    }),
    getWallStamp(),
  ]);
  const view: WallTileView[] = tiles.map((t) => {
    const hidden = Boolean(t.hiddenAt || t.owner.suspendedAt);
    const published = !hidden && Boolean(t.publishedKey);
    return {
      id: t.id,
      x: t.x,
      y: t.y,
      state: hidden ? "hidden" : published ? "published" : "claimed",
      owner: hidden ? null : { handle: t.owner.handle!, name: t.owner.name, image: t.owner.image },
      image: published ? `/api/wall/image/${t.id}?v=${t.publishedVersion}` : null,
      publishedAt: published ? t.publishedAt!.toISOString() : null,
    };
  });
  return {
    side: wallSide(count),
    stamp,
    tiles: view,
  };
}

/** Claim a free square. The (x, y) and owner uniques make this atomic under concurrency. */
export async function claimTile(viewer: Viewer, x: number, y: number) {
  const me = await requireWallArtist(viewer);
  const side = wallSide(await db.wallTile.count());
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= side || y >= side) throw new WallError("That square isn't on the wall.");
  try {
    return await db.wallTile.create({ data: { x, y, ownerId: me.id }, select: { id: true, x: true, y: true } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const mine = await db.wallTile.findUnique({ where: { ownerId: me.id }, select: { id: true } });
      throw new WallError(mine ? "You already have a square. Release it first to claim another." : "Someone just claimed that square. Pick another!", 409);
    }
    throw e;
  }
}

/** The signed-in builder's own tile, with everything the editor needs. */
export function myTile(userId: string) {
  return db.wallTile.findUnique({
    where: { ownerId: userId },
    select: {
      id: true, x: true, y: true, draft: true, draftUpdatedAt: true, review: true, reviewNote: true,
      submittedAt: true, publishedAt: true, publishedVersion: true, hiddenAt: true, hiddenReason: true, publishedKey: true,
    },
  });
}

/** Release your own square: frees it and deletes its drawing, submission and published art. */
export async function releaseMyTile(viewer: Viewer) {
  if (!viewer) throw new WallError("Sign in first.", 401);
  const t = await db.wallTile.findUnique({ where: { ownerId: viewer.id }, select: { id: true, submittedKey: true, publishedKey: true } });
  if (!t) throw new WallError("You don't have a square.", 404);
  await db.wallTile.delete({ where: { id: t.id } });
  await deleteStored([t.submittedKey, t.publishedKey]);
}

export async function saveDraft(viewer: Viewer, raw: unknown) {
  const me = await requireWallArtist(viewer);
  const parsed = strokesSchema.safeParse(raw);
  if (!parsed.success) throw new WallError(parsed.error.issues[0]?.message ?? "That drawing couldn't be saved.");
  const { count } = await db.wallTile.updateMany({
    where: { ownerId: me.id },
    data: { draft: parsed.data as unknown as Prisma.InputJsonValue, draftUpdatedAt: new Date() },
  });
  if (!count) throw new WallError("Claim a square first.", 404);
}

/** Submit for review: the exact PNG a moderator approves is the one that appears on the wall. */
export async function submitMyTile(viewer: Viewer, png: Uint8Array, rawStrokes: unknown) {
  const me = await requireWallArtist(viewer);
  const tile = await db.wallTile.findUnique({ where: { ownerId: me.id }, select: { id: true, submittedKey: true, publishedKey: true, submittedAt: true } });
  if (!tile) throw new WallError("Claim a square first.", 404);
  if (tile.submittedAt && Date.now() - tile.submittedAt.getTime() < 60_000) throw new WallError("You just submitted. Give it a minute before sending a new version.", 429);
  if (png.length > MAX_PNG_BYTES) throw new WallError("That drawing is too large to submit.");
  const size = pngSize(png);
  if (!size || size.width !== TILE_PX || size.height !== TILE_PX) throw new WallError("The artwork must be a 512 × 512 PNG.");
  const strokes = strokesSchema.safeParse(rawStrokes);
  if (!strokes.success || strokes.data.length === 0) throw new WallError("Draw something before submitting.");

  const key = await saveWallImage(png, tile.id);
  await db.wallTile.update({
    where: { id: tile.id },
    data: { submittedKey: key, submittedAt: new Date(), review: "PENDING", reviewNote: null, draft: strokes.data as unknown as Prisma.InputJsonValue, draftUpdatedAt: new Date() },
  });
  // The previous pending submission (if any, and not the live one) is no longer needed.
  if (tile.submittedKey && tile.submittedKey !== tile.publishedKey) await deleteStored([tile.submittedKey]);
}

export async function reportTile(viewer: Viewer, tileId: string, reason: string, note: string | null) {
  const me = await requireWallArtist(viewer);
  const tile = await db.wallTile.findUnique({ where: { id: tileId }, select: { ownerId: true, publishedKey: true, hiddenAt: true } });
  if (!tile?.publishedKey || tile.hiddenAt) throw new WallError("That artwork isn't on the wall.", 404);
  if (tile.ownerId === me.id) throw new WallError("You can't report your own square.");
  const today = await db.wallReport.count({ where: { reporterId: me.id, createdAt: { gte: new Date(Date.now() - 864e5) } } });
  if (today >= 20) throw new WallError("You've sent a lot of reports today. Thank you! Try again tomorrow.", 429);
  await db.wallReport.upsert({
    where: { tileId_reporterId: { tileId, reporterId: me.id } },
    create: { tileId, reporterId: me.id, reason: reason as never, note },
    update: { reason: reason as never, note, resolvedAt: null, createdAt: new Date() },
  });
}

export const asStrokes = (v: unknown): Stroke[] => {
  const r = strokesSchema.safeParse(v);
  return r.success ? r.data : [];
};
