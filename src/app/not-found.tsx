import Link from "next/link";
import { Mark } from "@/components/logo";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getViewer } from "@/lib/session";

export default async function NotFound() {
  const viewer = await getViewer();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <Mark className="size-16" />
        <p className="text-label mt-6 text-muted">404 · not in the castle</p>
        <h1 className="text-display-l mt-3">
          this page <span className="accent-serif">wandered</span> off
        </h1>
        <p className="mt-3 max-w-[44ch] text-body-l text-muted">
          The builder, project or post you&apos;re looking for doesn&apos;t exist, or was deleted.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/feed" className="inline-flex h-11 items-center rounded-sm bg-cobalt px-5 text-body font-semibold text-on-cobalt">
            go to the feed
          </Link>
          <Link href="/discover" className="inline-flex h-11 items-center rounded-sm border border-line-strong px-5 text-body font-semibold hover:border-ink">
            discover projects
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
