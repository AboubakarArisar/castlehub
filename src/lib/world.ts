import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { placeFor, placeWhere } from "@/lib/places";
import { builderCategories, type CategoryKey } from "@/lib/world-math";

// Public World Map data. Only builders who opted in, have a handle and aren't suspended.
// Responses carry what their public profile already shows, plus a city/country centre.

export const onMap = { onWorldMap: true, suspendedAt: null, handle: { not: null }, countryCode: { not: null } } satisfies Prisma.UserWhereInput;

const mapUser = {
  id: true, name: true, handle: true, image: true, headline: true, skills: true, countryCode: true, cityId: true,
  projects: { select: { type: true } },
} satisfies Prisma.UserSelect;

export type WorldMarker = {
  key: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  /** Builders per interest, so filters work without another request. */
  categories: Partial<Record<CategoryKey, number>>;
  avatars: { handle: string; image: string | null }[];
};

/**
 * Markers grouped by place, totals for the counter, and collaboration arcs.
 * ponytail: loads every opted-in builder's small row per request; move the grouping into SQL past ~20k builders.
 */
export async function getWorld() {
  const [users, projects, links] = await Promise.all([
    db.user.findMany({ where: onMap, select: mapUser, orderBy: { createdAt: "asc" } }),
    db.project.count({ where: { owner: onMap } }),
    // Confirmed collaborations only, between two builders who are both on the map.
    db.projectCollaborator.findMany({
      where: { user: onMap, project: { owner: onMap } },
      select: { user: { select: { countryCode: true, cityId: true } }, project: { select: { owner: { select: { countryCode: true, cityId: true } } } } },
      take: 300,
    }),
  ]);

  const markers = new Map<string, WorldMarker>();
  for (const u of users) {
    const place = placeFor(u.countryCode, u.cityId);
    if (!place) continue;
    const m = markers.get(place.key) ?? { ...place, count: 0, categories: {}, avatars: [] };
    m.count++;
    for (const c of builderCategories({ headline: u.headline, skills: u.skills, projectTypes: u.projects.map((p) => p.type) })) {
      m.categories[c] = (m.categories[c] ?? 0) + 1;
    }
    if (m.avatars.length < 4) m.avatars.push({ handle: u.handle!, image: u.image });
    markers.set(place.key, m);
  }

  const arcs = new Map<string, { from: [number, number]; to: [number, number] }>();
  for (const l of links) {
    const a = placeFor(l.project.owner.countryCode, l.project.owner.cityId);
    const b = placeFor(l.user.countryCode, l.user.cityId);
    if (!a || !b || a.key === b.key) continue;
    const id = [a.key, b.key].sort().join("-");
    if (!arcs.has(id) && arcs.size < 30) arcs.set(id, { from: [a.lat, a.lng], to: [b.lat, b.lng] });
  }

  return {
    markers: [...markers.values()],
    arcs: [...arcs.values()],
    stats: { builders: users.length, countries: new Set(users.map((u) => u.countryCode)).size, projects },
  };
}

const PAGE = 12;

/** Builder cards for one place (optionally one interest), 12 at a time. */
export async function getPlaceBuilders(key: string, category: CategoryKey | null, page: number) {
  const where = placeWhere(key);
  if (!where) return null;
  const users = await db.user.findMany({
    where: { ...onMap, ...where },
    select: {
      ...mapUser, bio: true,
      projects: { select: { type: true, name: true, slug: true, tagline: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  const matching = category
    ? users.filter((u) => builderCategories({ headline: u.headline, skills: u.skills, projectTypes: u.projects.map((p) => p.type) }).includes(category))
    : users;
  const slice = matching.slice(page * PAGE, page * PAGE + PAGE);
  return {
    total: matching.length,
    hasMore: (page + 1) * PAGE < matching.length,
    builders: slice.map((u) => ({
      handle: u.handle!,
      name: u.name,
      image: u.image,
      headline: u.headline,
      bio: u.bio && u.bio.length > 160 ? `${u.bio.slice(0, 160)}…` : u.bio,
      skills: u.skills.slice(0, 6),
      projects: u.projects.slice(0, 3).map((p) => ({ name: p.name, slug: p.slug, tagline: p.tagline })),
    })),
  };
}
export type PlaceBuilders = NonNullable<Awaited<ReturnType<typeof getPlaceBuilders>>>;

/** Builders on the map whose name or handle matches, with where they are. */
export async function searchMapBuilders(q: string) {
  const text = { contains: q, mode: "insensitive" as const };
  const users = await db.user.findMany({
    where: { ...onMap, OR: [{ name: text }, { handle: text }] },
    select: { handle: true, name: true, image: true, countryCode: true, cityId: true },
    take: 8,
  });
  return users.flatMap((u) => {
    const place = placeFor(u.countryCode, u.cityId);
    return place ? [{ handle: u.handle!, name: u.name, image: u.image, place: place.key, label: place.label }] : [];
  });
}

/** One random builder on the map (optionally with an interest), and where they are. */
export async function randomMapBuilder(category: CategoryKey | null) {
  const users = await db.user.findMany({ where: onMap, select: mapUser });
  const pool = category
    ? users.filter((u) => builderCategories({ headline: u.headline, skills: u.skills, projectTypes: u.projects.map((p) => p.type) }).includes(category))
    : users;
  const u = pool[Math.floor(Math.random() * pool.length)];
  const place = u && placeFor(u.countryCode, u.cityId);
  return u && place ? { handle: u.handle!, place: place.key } : null;
}
