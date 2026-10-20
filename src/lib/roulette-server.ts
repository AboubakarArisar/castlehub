import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma, ProjectType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { placeFor } from "@/lib/places";
import { buildReel, FILTERS, pickFair, type Mode } from "@/lib/roulette";
import { PROJECT_TYPES } from "@/lib/rules";
import { builderCategories, type CategoryKey } from "@/lib/world-math";

// Who and what can come up: builders with a handle who aren't suspended (never yourself),
// and projects by such builders. Only public profile/project fields leave the server.

const eligibleBuilder = (viewerId: string | null): Prisma.UserWhereInput => ({
  handle: { not: null },
  suspendedAt: null,
  ...(viewerId && { id: { not: viewerId } }),
});
const eligibleProject = (type: ProjectType | null): Prisma.ProjectWhereInput => ({
  owner: { handle: { not: null }, suspendedAt: null },
  ...(type && { type }),
});

const pick = (max: number) => randomInt(max);
const clip = (s: string | null, n: number) => (s && s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

export async function rouletteCounts(viewerId: string | null) {
  const [builders, projects] = await Promise.all([db.user.count({ where: eligibleBuilder(viewerId) }), db.project.count({ where: eligibleProject(null) })]);
  return { builders, projects };
}

/** Eligible ids for a mode and filter (only ids and the fields the filter needs). */
async function candidates(mode: Mode, filter: string | null, viewerId: string | null) {
  if (mode === "projects") {
    const type = (PROJECT_TYPES as readonly string[]).includes(filter ?? "") ? (filter as ProjectType) : null;
    const rows = await db.project.findMany({ where: eligibleProject(type), select: { id: true } });
    return rows.map((r) => r.id);
  }
  // ponytail: interests are derived in JS from each builder's small row; precompute them if this grows past ~20k builders.
  const rows = await db.user.findMany({
    where: eligibleBuilder(viewerId),
    select: { id: true, headline: true, skills: true, projects: { select: { type: true } } },
  });
  const category = FILTERS.builders.some((f) => f.key === filter) ? (filter as CategoryKey) : null;
  return rows
    .filter((u) => !category || builderCategories({ headline: u.headline, skills: u.skills, projectTypes: u.projects.map((p) => p.type) }).includes(category))
    .map((u) => u.id);
}

async function builderCard(id: string) {
  const u = await db.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, handle: true, name: true, image: true, headline: true, bio: true, skills: true,
      onWorldMap: true, countryCode: true, cityId: true,
      projects: { select: { name: true, slug: true, tagline: true, iconUrl: true, type: true }, orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  return {
    kind: "builder" as const,
    id: u.id,
    handle: u.handle!,
    name: u.name,
    image: u.image,
    headline: u.headline,
    bio: clip(u.bio, 240),
    skills: u.skills.slice(0, 8),
    // Only when they chose to be on the World Map.
    location: u.onWorldMap ? (placeFor(u.countryCode, u.cityId)?.label ?? null) : null,
    projects: u.projects,
  };
}

async function projectCard(id: string) {
  const p = await db.project.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, slug: true, name: true, tagline: true, description: true, type: true, tags: true, iconUrl: true,
      images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      owner: { select: { handle: true, name: true, image: true } },
    },
  });
  return {
    kind: "project" as const,
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: clip(p.description.replace(/[*_`#>[\]()]/g, "").replace(/\s+/g, " "), 220),
    type: p.type,
    tags: p.tags.slice(0, 5),
    cover: p.images[0]?.url ?? null,
    iconUrl: p.iconUrl,
    owner: { handle: p.owner.handle!, name: p.owner.name, image: p.owner.image },
  };
}

export type RouletteResult = Awaited<ReturnType<typeof builderCard>> | Awaited<ReturnType<typeof projectCard>>;
export type ReelFace = { id: string; seed: string; image: string | null; name: string };

/** One spin: a fair pick, its card, a reel of real faces, and whether it's a first encounter. */
export async function spin(input: { mode: Mode; filter: string | null; seen: string[]; last: string | null }, viewerId: string | null) {
  const ids = await candidates(input.mode, input.filter, viewerId);
  const picked = pickFair(ids, input.seen, input.last, pick);
  if (!picked) return { result: null, total: 0 } as const;

  const others = buildReel(ids.filter((i) => i !== picked.id), pick).slice(0, 18);
  const unique = [...new Set(others)];
  const [result, faces] = await Promise.all([
    input.mode === "builders" ? builderCard(picked.id) : projectCard(picked.id),
    input.mode === "builders"
      ? db.user.findMany({ where: { id: { in: unique } }, select: { id: true, handle: true, image: true, name: true } }).then((rows) => rows.map((r) => ({ id: r.id, seed: r.handle ?? r.id, image: r.image, name: r.name ?? r.handle ?? "" })))
      : db.project.findMany({ where: { id: { in: unique } }, select: { id: true, slug: true, iconUrl: true, name: true } }).then((rows) => rows.map((r) => ({ id: r.id, seed: r.slug, image: r.iconUrl, name: r.name }))),
  ]);
  const byId = new Map(faces.map((f) => [f.id, f]));
  const reel: ReelFace[] = others.flatMap((id) => byId.get(id) ?? []);

  // Private discovery history: a new row means this is the first time they've met.
  let firstEncounter = false;
  if (viewerId) {
    const { count } = await db.discovery.createMany({
      data: [input.mode === "builders" ? { userId: viewerId, builderId: picked.id } : { userId: viewerId, projectId: picked.id }],
      skipDuplicates: true,
    });
    firstEncounter = count === 1;
  }

  return { result, reel, firstEncounter, newRound: picked.newRound, remaining: picked.remaining, total: ids.length } as const;
}
