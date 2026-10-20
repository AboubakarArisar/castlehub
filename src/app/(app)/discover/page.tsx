import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { ProjectRow } from "@/components/project-row";
import type { ProjectType } from "@/generated/prisma/client";
import { getProjects } from "@/lib/queries";
import { PROJECT_TYPES, TYPE_LABEL } from "@/lib/rules";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "discover · castlehub" };

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  const type = PROJECT_TYPES.find((t) => t === String(sp.type ?? "").toUpperCase()) as ProjectType | undefined;
  const sort = sp.sort === "top" ? "top" : "new";
  const viewer = await getViewer();
  const projects = await getProjects({ viewerId: viewer?.id, type, sort, take: 50 });

  const href = (next: { type?: string; sort?: string }) => {
    const q = new URLSearchParams();
    const t = "type" in next ? next.type : type?.toLowerCase();
    const s = "sort" in next ? next.sort : sort;
    if (t) q.set("type", t);
    if (s === "top") q.set("sort", "top");
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

      {projects.length === 0 ? (
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
    </>
  );
}
