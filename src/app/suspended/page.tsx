import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { removeWorldLocation } from "@/actions/world";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "account suspended · castlehub", robots: { index: false } };

export default async function SuspendedPage() {
  const viewer = await getViewer();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 pt-20 md:px-6">
        <p className="text-label text-muted">account</p>
        <h1 className="mt-2 text-display-l">
          your account is <span className="accent-serif">paused</span>
        </h1>
        <p className="mt-4 text-body-l text-muted">
          An admin has suspended posting for this account. You can still browse CastleHub, but you can&apos;t post, comment, react or publish
          projects for now. If you think this is a mistake, reach out to the CastleHub admin on the SkyCastle Slack.
        </p>
        <Link href="/feed" className="mt-6 inline-flex h-10 items-center rounded-sm border border-line-strong px-4 text-body font-semibold hover:border-ink">
          back to the feed
        </Link>
        {viewer && (
          <form action={removeWorldLocation} className="mt-8 border-t border-line pt-6">
            <p className="text-body-s text-muted">Suspended accounts are hidden from the World Map. You can still delete your saved location.</p>
            <button type="submit" className="mt-2 text-body-s font-semibold text-red hover:underline">remove my World Map location</button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
