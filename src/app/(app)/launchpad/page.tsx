import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { ProjectRow } from "@/components/project-row";
import { getProjects } from "@/lib/queries";
import { isoWeek, shiftWeek, weekRange } from "@/lib/rules";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "launchpad · castlehub" };

const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function LaunchpadPage({ searchParams }: PageProps<"/launchpad">) {
  const sp = await searchParams;
  const current = isoWeek();
  const week = typeof sp.week === "string" && weekRange(sp.week) ? sp.week : current;
  const range = weekRange(week)!;
  const viewer = await getViewer();
  const projects = await getProjects({ viewerId: viewer?.id, launchWeek: week, take: 100 });
  const next = shiftWeek(week, 1);

  return (
    <>
      <PageHeader label="weekly launches · opt-in" title={<>launch<span className="accent-serif">pad</span></>}>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={`/launchpad?week=${shiftWeek(week, -1)}`} aria-label="Previous week" className="grid size-9 place-items-center rounded-sm border border-line hover:border-line-strong">
              <ChevronLeft className="size-4" />
            </Link>
            <span className="px-2">
              <span className="block font-display text-[18px] leading-5 font-bold">week {Number(week.slice(-2))}</span>
              <span className="text-body-s text-muted">
                {fmt(range.monday)} – {fmt(range.sunday)}
              </span>
            </span>
            {week !== current && (
              <Link href={`/launchpad?week=${next}`} aria-label="Next week" className="grid size-9 place-items-center rounded-sm border border-line hover:border-line-strong">
                <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
          {week === current && (
            <Link href="/projects/new" className="inline-flex h-10 items-center rounded-sm bg-cobalt px-4 text-body font-semibold text-on-cobalt">
              launch →
            </Link>
          )}
        </div>
      </PageHeader>

      {projects.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-title-l">no launches {week === current ? "yet this week" : "that week"}</p>
          <p className="mt-2 text-body text-muted">
            Tick &ldquo;enter this week&apos;s launchpad&rdquo; when you publish a project. Not every project needs a launch; Discover lists them all.
          </p>
        </div>
      ) : (
        <ol>
          {projects.map((p, i) => (
            <ProjectRow key={p.id} project={p} rank={i + 1} canVote={Boolean(viewer?.handle)} />
          ))}
        </ol>
      )}
    </>
  );
}
