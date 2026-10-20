import "server-only";
import type { Prisma, ProjectType, ReactionKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const authorSelect = { id: true, name: true, handle: true, image: true, headline: true } as const;

// ── Feed ───────────────────────────────────────────────────

const postInclude = {
  author: { select: authorSelect },
  project: { select: { name: true, slug: true, tagline: true, type: true, iconUrl: true, launchWeek: true, owner: { select: { handle: true } } } },
  // ponytail: reactions are loaded per post and counted in JS; move to grouped counts if posts get heavy traffic.
  reactions: { select: { kind: true, userId: true } },
  // Two newest comments as a preview under each post; the full thread lives on /post/[id].
  comments: { include: { author: { select: authorSelect } }, orderBy: { createdAt: "desc" }, take: 2 },
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

type RawPost = Prisma.PostGetPayload<{ include: typeof postInclude }>;

function shapePost(p: RawPost, viewerId?: string) {
  const counts: Record<ReactionKind, number> = { UPVOTE: 0, SHIP_IT: 0, NEED_THIS: 0, HOW: 0 };
  const mine = new Set<ReactionKind>();
  for (const r of p.reactions) {
    counts[r.kind]++;
    if (r.userId === viewerId) mine.add(r.kind);
  }
  return { ...p, reactions: undefined, counts, mine: [...mine], comments: [...p.comments].reverse() };
}
export type FeedPost = ReturnType<typeof shapePost>;

export async function getFeed(viewerId?: string, where: Prisma.PostWhereInput = {}, take = 30, skip = 0) {
  const rows = await db.post.findMany({ where, include: postInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take, skip });
  return rows.map((p) => shapePost(p, viewerId));
}

export async function getPost(id: string, viewerId?: string) {
  const p = await db.post.findUnique({ where: { id }, include: postInclude });
  return p ? shapePost(p, viewerId) : null;
}

// ── Comments ───────────────────────────────────────────────

export function getComments(target: { postId: string } | { projectId: string }) {
  return db.comment.findMany({
    where: target,
    include: { author: { select: authorSelect } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}
export type CommentRow = Awaited<ReturnType<typeof getComments>>[number];

// ── Projects ───────────────────────────────────────────────

const projectCard = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  type: true,
  iconUrl: true,
  launchWeek: true,
  createdAt: true,
  owner: { select: { handle: true, name: true } },
  _count: { select: { upvotes: true } },
} satisfies Prisma.ProjectSelect;

export type ProjectCard = Prisma.ProjectGetPayload<{ select: typeof projectCard }> & { upvoted: boolean };

async function withUpvoted<T extends { id: string }>(projects: T[], viewerId?: string) {
  if (!viewerId || projects.length === 0) return projects.map((p) => ({ ...p, upvoted: false }));
  const mine = await db.projectUpvote.findMany({
    where: { userId: viewerId, projectId: { in: projects.map((p) => p.id) } },
    select: { projectId: true },
  });
  const set = new Set(mine.map((m) => m.projectId));
  return projects.map((p) => ({ ...p, upvoted: set.has(p.id) }));
}

export async function getProjects(opts: {
  viewerId?: string;
  type?: ProjectType;
  sort?: "new" | "top";
  launchWeek?: string;
  ownerId?: string;
  take?: number;
  skip?: number;
}) {
  const where: Prisma.ProjectWhereInput = {
    ...(opts.type && { type: opts.type }),
    ...(opts.launchWeek && { launchWeek: opts.launchWeek }),
    ...(opts.ownerId && { ownerId: opts.ownerId }),
    owner: { handle: { not: null } },
  };
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    opts.sort === "top" || opts.launchWeek
      ? [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }]
      : [{ createdAt: "desc" }, { id: "desc" }];
  const rows = await db.project.findMany({ where, select: projectCard, orderBy, take: opts.take ?? 30, skip: opts.skip });
  return withUpvoted(rows, opts.viewerId);
}

export async function getProject(handle: string, slug: string, viewerId?: string) {
  const project = await db.project.findFirst({
    where: { slug, owner: { handle } },
    include: {
      owner: { select: authorSelect },
      images: { orderBy: { position: "asc" } },
      _count: { select: { upvotes: true } },
    },
  });
  if (!project) return null;
  const [withFlag] = await withUpvoted([project], viewerId);
  return withFlag;
}

// ── People ─────────────────────────────────────────────────

export function getBuilder(handle: string) {
  return db.user.findUnique({
    where: { handle },
    select: { ...authorSelect, bio: true, website: true, skills: true, createdAt: true, slackTeamId: true },
  });
}

export function getNewBuilders(take = 3) {
  return db.user.findMany({
    where: { handle: { not: null } },
    select: authorSelect,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function getOwnProjects(ownerId: string) {
  return db.project.findMany({ where: { ownerId }, select: { id: true, name: true }, orderBy: { createdAt: "desc" } });
}
