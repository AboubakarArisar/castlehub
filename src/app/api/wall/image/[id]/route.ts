import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { readStored } from "@/lib/storage";

// Wall artwork. The approved version is public (unless hidden); a pending submission is only
// visible to its artist and to admins (?kind=submitted).

// A wall view requests one image per square, so remember each tile's public state for 30 s
// instead of querying the database for every image. Together with the 60 s browser cache, a
// hidden or removed artwork stops loading within about a minute.
// ponytail: per-instance memory cache; use a shared cache (e.g. Vercel Runtime Cache) if instances multiply.
const TTL = 30_000;
const publicState = new Map<string, { key: string | null; at: number }>();

// Keyed by tile and version: an approval bumps the version (and the URL), so new art is never
// blocked by a stale "not published yet" entry.
async function publishedKey(id: string, version: string) {
  const cacheKey = `${id}:${version}`;
  const hit = publicState.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) return hit.key;
  const t = await db.wallTile.findUnique({
    where: { id },
    select: { publishedKey: true, hiddenAt: true, owner: { select: { suspendedAt: true } } },
  });
  const key = t?.publishedKey && !t.hiddenAt && !t.owner.suspendedAt ? t.publishedKey : null;
  if (publicState.size > 5000) publicState.clear();
  publicState.set(cacheKey, { key, at: Date.now() });
  return key;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{1,40}$/.test(id)) return new Response(null, { status: 404 });

  const search = new URL(request.url).searchParams;
  if (search.get("kind") === "submitted") {
    const [viewer, t] = await Promise.all([getViewer(), db.wallTile.findUnique({ where: { id }, select: { ownerId: true, submittedKey: true } })]);
    if (!t?.submittedKey || !viewer || (viewer.id !== t.ownerId && !viewer.isAdmin)) return new Response(null, { status: 404 });
    const res = await readStored(t.submittedKey, null, "image/png");
    res.headers.set("cache-control", "private, no-store");
    return res;
  }

  const key = await publishedKey(id, (search.get("v") ?? "").slice(0, 12));
  if (!key) return new Response(null, { status: 404 });
  const res = await readStored(key, null, "image/png");
  // Browser-only, short cache: no shared/CDN copies, so a hidden or removed artwork stops
  // loading everywhere within a minute.
  res.headers.set("cache-control", "private, max-age=60");
  res.headers.set("x-content-type-options", "nosniff");
  return res;
}
