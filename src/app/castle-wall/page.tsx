import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { WallExplorer } from "@/components/wall/wall-explorer";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { getWall } from "@/lib/wall-server";

export const metadata: Metadata = {
  title: "castle wall · castlehub",
  description: "One wall. Endless imagination. Claim a square and add your art to the CastleHub mural.",
};

export default async function CastleWallPage() {
  const [viewer, wall] = await Promise.all([getViewer(), getWall()]);
  const me = viewer
    ? await db.user.findUnique({ where: { id: viewer.id }, select: { wallRestrictedAt: true, wallTile: { select: { id: true, x: true, y: true } } } })
    : null;
  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0b09]">
      <SiteHeader viewer={viewer} />
      <main className="flex-1 pb-16 md:pb-0">
        <WallExplorer
          initial={wall}
          me={{
            signedIn: Boolean(viewer),
            builder: Boolean(viewer?.handle && !viewer.suspendedAt),
            restricted: Boolean(me?.wallRestrictedAt),
            tile: me?.wallTile ?? null,
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
