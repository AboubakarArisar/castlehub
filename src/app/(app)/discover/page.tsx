import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { Pager, pageParam } from "@/components/pager";
import { ProjectRow } from "@/components/project-row";
import { BuildersOnARoll } from "@/components/streaks";
import type { ProjectType } from "@/generated/prisma/client";
import { getBuildersOnARoll, getProjects } from "@/lib/queries";
import { PROJECT_TYPES, TYPE_LABEL } from "@/lib/rules";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "discover · castlehub" };

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  const type = PROJECT_TYPES.find((t) => t === String(sp.type ?? "").toUpperCase()) as ProjectType | undefined;
  const sort = sp.sort === "top" ? "top" : "new";
  const page = pageParam(sp.page);
  const viewer = await getViewer();
  const [rows, onARoll] = await Promise.all([
    getProjects({ viewerId: viewer?.id, type, sort, take: 51, skip: (page - 1) * 50 }),
    page === 1 && !type ? getBuildersOnARoll() : [],
  ]);
  const projects = rows.slice(0, 50);

  const href = (next: { type?: string; sort?: string; page?: number }) => {
    const q = new URLSearchParams();
    const t = "type" in next ? next.type : type?.toLowerCase();
    const s = "sort" in next ? next.sort : sort;
    if (t) q.set("type", t);
    if (s === "top") q.set("sort", "top");
    if (next.page && next.page > 1) q.set("page", String(next.page));
    const qs = q.toString();
    return qs ? `/discover?${qs}` : "/discover";
  };

  return (
    <>
      <PageHeader label="every project in the castle" title={<>dis<span className="accent-serif">cover</span></>}>
        <nav aria-label="Sort" className="mt-5 -mb-4 flex gap-6">
          {(["new", "top"] as const).map((s) => (
            <Link
              key={s}
              href={href({ sort: s })}
              aria-current={sort === s ? "page" : undefined}
              className="border-b-2 border-transparent pb-3 text-body font-medium text-muted transition-colors duration-120 hover:text-ink aria-[current=page]:border-cobalt aria-[current=page]:text-ink"
            >
              {s === "new" ? "newest" : "top"}
            </Link>
          ))}
        </nav>
      </PageHeader>

      <BuildersOnARoll builders={onARoll} />
      <Link href="/world" className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-body-s hover:bg-surface md:px-6">
        <span><span className="font-semibold text-ink">The castle has no borders.</span> <span className="text-muted">See where builders are building on the World Map.</span></span>
        <span className="shrink-0 text-cobalt">explore →</span>
      </Link>
      <Link href="/roulette" className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-body-s hover:bg-surface md:px-6">
        <span><span className="font-semibold text-ink">Feeling lucky?</span> <span className="text-muted">Spin the castle and meet a random builder or project.</span></span>
        <span className="shrink-0 text-cobalt">spin →</span>
      </Link>

      <nav aria-label="Filter by type" className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-3 md:px-6">
        {[undefined, ...PROJECT_TYPES].map((t) => {
          const on = t === type;
          return (
            <Link
              key={t ?? "all"}
              href={href({ type: t?.toLowerCase() })}
              aria-current={on ? "page" : undefined}
              className={`text-label shrink-0 rounded-sm border px-2.5 py-1.5 transition-colors duration-120 ${
                on ? "border-cobalt bg-cobalt text-on-cobalt" : "border-line text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {t ? TYPE_LABEL[t] : "all"}
            </Link>
          );
        })}
      </nav>

      {projects.length === 0 && page === 1 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-title-l">no projects {type ? `in ${TYPE_LABEL[type]}` : ""} yet</p>
          <Link href="/projects/new" className="mt-3 inline-block text-body font-semibold text-cobalt hover:underline">
            publish the first one →
          </Link>
        </div>
      ) : (
        <ol>
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} canVote={Boolean(viewer?.handle)} />
          ))}
        </ol>
      )}
      <Pager page={page} hasMore={rows.length > 50} href={(n) => href({ page: n })} older="more projects" newer="previous" />
    </>
  );
}
