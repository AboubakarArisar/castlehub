import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hackathonStatus } from "@/lib/hackathons";
import type { Viewer } from "@/lib/session";

// Hackathon reads. Public queries never include drafts, or hidden or withdrawn builds;
// authors see their own entries whatever their state, and admins see everything.

/** Builds anyone can see. */
export const PUBLIC_BUILD = { withdrawnAt: null, hiddenAt: null } satisfies Prisma.HackathonSubmissionWhereInput;

const eventSelect = {
  id: true, slug: true, title: true, summary: true, brief: true, theme: true, rules: true, prizes: true,
  coverUrl: true, linkUrl: true, opensAt: true, closesAt: true, override: true, publishedAt: true, archivedAt: true,
  _count: { select: { submissions: { where: PUBLIC_BUILD } } },
} satisfies Prisma.HackathonSelect;

const withStatus = <T extends Parameters<typeof hackathonStatus>[0]>(h: T) => ({ ...h, status: hackathonStatus(h) });

export type HackathonView = ReturnType<typeof withStatus<Prisma.HackathonGetPayload<{ select: typeof eventSelect }>>>;

/** Every published event, newest schedule first. */
export async function listHackathons() {
  const rows = await db.hackathon.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ opensAt: "desc" }, { createdAt: "desc" }],
    select: eventSelect,
  });
  return rows.map(withStatus);
}

/** One event by slug. Drafts only exist for admins (for previewing). */
export async function getHackathon(slug: string, viewer: Viewer | null) {
  const h = await db.hackathon.findUnique({ where: { slug }, select: eventSelect });
  if (!h || (!h.publishedAt && !viewer?.isAdmin)) return null;
  return withStatus(h);
}

export const buildCardSelect = {
  id: true, name: true, tagline: true, coverUrl: true, images: true, tech: true, featuredAt: true, createdAt: true,
  withdrawnAt: true, hiddenAt: true,
  author: { select: { id: true, handle: true, name: true, image: true } },
} satisfies Prisma.HackathonSubmissionSelect;

export type BuildCard = Prisma.HackathonSubmissionGetPayload<{ select: typeof buildCardSelect }>;

export const GALLERY_PAGE = 24;

/** Visible builds of an event: search by build name or creator, newest or featured first. */
export async function getBuilds(hackathonId: string, { q, sort, page }: { q: string; sort: "newest" | "featured"; page: number }) {
  const text = { contains: q, mode: "insensitive" as const };
  const rows = await db.hackathonSubmission.findMany({
    where: {
      hackathonId,
      ...PUBLIC_BUILD,
      ...(q && { OR: [{ name: text }, { author: { handle: text } }, { author: { name: text } }] }),
    },
    orderBy: sort === "featured" ? [{ featuredAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] : [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * GALLERY_PAGE,
    take: GALLERY_PAGE + 1,
    select: buildCardSelect,
  });
  return { builds: rows.slice(0, GALLERY_PAGE), hasMore: rows.length > GALLERY_PAGE };
}

/** One build, if this viewer may see it: public, their own, or any for admins. */
export async function getBuild(slug: string, id: string, viewer: Viewer | null) {
  const b = await db.hackathonSubmission.findUnique({
    where: { id },
    select: {
      ...buildCardSelect,
      description: true, demoUrl: true, repoUrl: true, videoUrl: true, hiddenReason: true, updatedAt: true,
      hackathon: { select: { id: true, slug: true, title: true, opensAt: true, closesAt: true, override: true, publishedAt: true, archivedAt: true } },
    },
  });
  if (!b || b.hackathon.slug !== slug) return null;
  const mine = viewer?.id === b.author.id;
  if (!b.hackathon.publishedAt && !viewer?.isAdmin) return null;
  if ((b.hiddenAt || b.withdrawnAt) && !mine && !viewer?.isAdmin) return null;
  return { ...b, mine, status: hackathonStatus(b.hackathon) };
}

/** This member's entry for an event (any state), if they have one. */
export function myBuildFor(hackathonId: string, userId: string) {
  return db.hackathonSubmission.findUnique({
    where: { hackathonId_authorId: { hackathonId, authorId: userId } },
    select: { id: true, withdrawnAt: true, hiddenAt: true },
  });
}

/** All of a member's entries across events, newest first. */
export async function myBuilds(userId: string) {
  const rows = await db.hackathonSubmission.findMany({
    where: { authorId: userId, hackathon: { publishedAt: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: {
      ...buildCardSelect,
      hackathon: { select: { slug: true, title: true, opensAt: true, closesAt: true, override: true, publishedAt: true, archivedAt: true } },
    },
  });
  return rows.map((b) => ({ ...b, status: hackathonStatus(b.hackathon) }));
}
