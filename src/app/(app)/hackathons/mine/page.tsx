import type { Metadata } from "next";
import Link from "next/link";
import { BuildTile } from "@/components/hackathons";
import { PageHeader } from "@/components/shell";
import { STATUS_LABEL } from "@/lib/hackathons";
import { myBuilds } from "@/lib/hackathons-server";
import { requireBuilder } from "@/lib/session";

export const metadata: Metadata = { title: "my hackathon builds · castlehub" };

export default async function MyBuildsPage() {
  const viewer = await requireBuilder();
  const builds = await myBuilds(viewer.id);

  return (
    <>
      <PageHeader label="hackathons" title={<>my <span className="accent-serif">builds</span></>}>
        <p className="mt-2 text-body text-muted">Everything you&apos;ve entered, across every hackathon. Only you see withdrawn or hidden entries here.</p>
      </PageHeader>
      {builds.length === 0 ? (
        <div className="px-4 py-16 text-center md:px-6">
          <p className="text-title-l">no builds yet</p>
          <p className="mt-2 text-body text-muted">
            Find an open hackathon on the <Link href="/hackathons" className="text-cobalt hover:underline">hackathons page</Link> and share what you make.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 px-4 py-6 sm:grid-cols-2 md:px-6">
          {builds.map((b) => (
            <BuildTile
              key={b.id}
              build={b}
              href={`/hackathons/${b.hackathon.slug}/builds/${b.id}`}
              note={
                <p className="text-label flex flex-wrap gap-x-2 pt-1 text-muted">
                  <span className="text-cobalt">{b.hackathon.title}</span>
                  <span>{b.withdrawnAt ? "withdrawn" : b.hiddenAt ? "hidden by a moderator" : STATUS_LABEL[b.status]}</span>
                </p>
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}
