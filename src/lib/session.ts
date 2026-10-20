import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Data access layer: every page and action reads the viewer through here.
export const getViewer = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, image: true, handle: true },
  });
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  return viewer;
}

/** Signed in AND has claimed a handle. */
export async function requireBuilder() {
  const viewer = await requireViewer();
  if (!viewer.handle) redirect("/onboarding");
  return viewer as Viewer & { handle: string };
}

/** The viewer as a builder who can post, react and comment, or null. */
export function asBuilder(viewer: Viewer | null) {
  return viewer?.handle ? { id: viewer.id, handle: viewer.handle, image: viewer.image } : null;
}
