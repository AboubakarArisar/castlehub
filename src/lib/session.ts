import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Admins are listed by user id in ADMIN_USER_IDS (comma-separated), set in Vercel,
// so nobody can grant themselves admin from inside the app.
const ADMIN_IDS = new Set((process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));

// Data access layer: every page and action reads the viewer through here.
export const getViewer = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, image: true, handle: true, suspendedAt: true },
  });
  return user && { ...user, isAdmin: ADMIN_IDS.has(user.id) };
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  return viewer;
}

/** Signed in, has claimed a handle and is not suspended. Every write action goes through here. */
export async function requireBuilder() {
  const viewer = await requireViewer();
  if (!viewer.handle) redirect("/onboarding");
  if (viewer.suspendedAt) redirect("/suspended");
  return viewer as Viewer & { handle: string };
}

/** The viewer as a builder who can post, react and comment, or null. */
export function asBuilder(viewer: Viewer | null) {
  return viewer?.handle && !viewer.suspendedAt ? { id: viewer.id, handle: viewer.handle, image: viewer.image } : null;
}

/** Admin pages and actions. Anyone else gets a plain 404, so the area stays invisible. */
export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}
