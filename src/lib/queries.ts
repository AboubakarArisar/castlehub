import "server-only";
import { cache } from "react";
import type { Prisma, ProjectType, ReactionKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isoWeek, shiftWeek } from "@/lib/rules";
import { addDays, currentStreak, dateToDay, dayIn, dayToDate, rollOrder } from "@/lib/streaks";

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
  /** Projects this person owns or collaborated on. */
  memberId?: string;
  take?: number;
  skip?: number;
}) {
  const where: Prisma.ProjectWhereInput = {
    ...(opts.type && { type: opts.type }),
    ...(opts.launchWeek && { launchWeek: opts.launchWeek }),
    ...(opts.ownerId && { ownerId: opts.ownerId }),
    ...(opts.memberId && { OR: [{ ownerId: opts.memberId }, { collaborators: { some: { userId: opts.memberId } } }] }),
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
      collaborators: { select: { user: { select: authorSelect } }, orderBy: { createdAt: "asc" } },
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
    select: {
      ...authorSelect, bio: true, website: true, skills: true, createdAt: true, slackTeamId: true, openToCollab: true,
      timezone: true, streakLength: true, streakEnd: true, longestStreak: true, activeDays: true,
      countryCode: true, cityId: true, onWorldMap: true, suspendedAt: true,
    },
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

// ── Launchpad winner ───────────────────────────────────────

/** Top project of a finished Launchpad week (needs at least one upvote). Ties go to the earlier launch. */
export const getWeekWinner = cache(async (week: string) => {
  if (week >= isoWeek()) return null;
  const [top] = await db.project.findMany({
    where: { launchWeek: week, owner: { handle: { not: null } }, upvotes: { some: {} } },
    select: projectCard,
    orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "asc" }],
    take: 1,
  });
  return top ?? null;
});

export const getLastWeekWinner = () => getWeekWinner(shiftWeek(isoWeek(), -1));

// ── Search ─────────────────────────────────────────────────

export async function search(q: string, opts: { collabOnly?: boolean; viewerId?: string }) {
  const text = { contains: q, mode: "insensitive" as const };
  const word = q.toLowerCase();
  const [projects, builders] = await Promise.all([
    q
      ? db.project.findMany({
          where: { owner: { handle: { not: null } }, OR: [{ name: text }, { tagline: text }, { tags: { has: word } }] },
          select: projectCard,
          orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }],
          take: 30,
        })
      : [],
    q || opts.collabOnly
      ? db.user.findMany({
          where: {
            handle: { not: null },
            suspendedAt: null,
            ...(opts.collabOnly && { openToCollab: true }),
            ...(q && { OR: [{ name: text }, { handle: text }, { headline: text }, { skills: { has: word } }] }),
          },
          select: { ...authorSelect, skills: true, openToCollab: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [],
  ]);
  return { projects: await withUpvoted(projects, opts.viewerId), builders };
}

// ── Notifications ──────────────────────────────────────────

export function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export function getNotifications(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      actor: { select: authorSelect },
      post: { select: { id: true, body: true } },
      project: { select: { name: true, slug: true, owner: { select: { handle: true } } } },
      comment: { select: { body: true } },
    },
  });
}
export type NotificationRow = Awaited<ReturnType<typeof getNotifications>>[number];

// ── Build streaks ──────────────────────────────────────────

/** A builder's last ~12 months of build days (one indexed range read) and earned milestones. */
export async function getStreakHistory(userId: string, sinceDay: string) {
  const [days, milestones] = await Promise.all([
    db.buildDay.findMany({ where: { userId, day: { gte: dayToDate(sinceDay) } }, select: { day: true, count: true } }),
    db.streakMilestone.findMany({ where: { userId }, select: { days: true, awardedAt: true }, orderBy: { days: "asc" } }),
  ]);
  return { counts: new Map(days.map((d) => [dateToDay(d.day), d.count])), milestones };
}

/** Builders with a live streak, in a daily-rotating order that also surfaces newer members. */
export async function getBuildersOnARoll(take = 6) {
  const now = new Date();
  // Streak ends are stored in each builder's own timezone, so look two UTC days back, then check exactly.
  const candidates = await db.user.findMany({
    where: { handle: { not: null }, suspendedAt: null, streakLength: { gte: 2 }, streakEnd: { gte: dayToDate(addDays(dayIn(now), -2)) } },
    select: { ...authorSelect, streakLength: true, streakEnd: true, timezone: true, createdAt: true },
    take: 60,
  });
  const live = candidates
    .map((u) => ({ ...u, streak: currentStreak(u.streakLength, u.streakEnd && dateToDay(u.streakEnd), dayIn(now, u.timezone)), joinedDaysAgo: (now.getTime() - u.createdAt.getTime()) / 864e5 }))
    .filter((u) => u.streak >= 2);
  return rollOrder(live, dayIn(now)).slice(0, take);
}
