import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-chrome";
import { WallEditor } from "@/components/wall/wall-editor";
import { db } from "@/lib/db";
import { requireBuilder } from "@/lib/session";
import { asStrokes, myTile } from "@/lib/wall-server";

export const metadata: Metadata = { title: "my square · castle wall · castlehub", robots: { index: false } };

export default async function WallEditPage() {
  const viewer = await requireBuilder();
  const [tile, me] = await Promise.all([myTile(viewer.id), db.user.findUnique({ where: { id: viewer.id }, select: { wallRestrictedAt: true } })]);
  if (me?.wallRestrictedAt) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader viewer={viewer} />
        <main className="mx-auto max-w-[560px] flex-1 px-4 pt-20 text-center">
          <p className="font-display text-[24px] font-extrabold">Your Castle Wall access is paused.</p>
          <p className="mt-2 text-body text-muted">A moderator has paused drawing on the wall for this account. You can still explore it.</p>
          <Link href="/castle-wall" className="mt-4 inline-block font-semibold text-cobalt hover:underline">back to the wall →</Link>
        </main>
      </div>
    );
  }
  if (!tile) redirect("/castle-wall");
  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0b09]">
      <SiteHeader viewer={viewer} />
      <main className="flex-1 pb-16 md:pb-0">
        <WallEditor
          tile={{ id: tile.id, x: tile.x, y: tile.y }}
          initialStrokes={asStrokes(tile.draft)}
          serverSavedAt={tile.draftUpdatedAt?.getTime() ?? 0}
          status={{
            review: tile.review,
            reviewNote: tile.reviewNote,
            hiddenReason: tile.hiddenAt ? (tile.hiddenReason ?? "hidden after review") : null,
            live: Boolean(tile.publishedKey && !tile.hiddenAt),
            liveImage: tile.publishedKey && !tile.hiddenAt ? `/api/wall/image/${tile.id}?v=${tile.publishedVersion}` : null,
          }}
        />
      </main>
    </div>
  );
}
