import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Search, Settings } from "lucide-react";
import { BuildTile, Cover, EventDates, StatusBadge } from "@/components/hackathons";
import { LocalTime } from "@/components/hackathon-forms";
import { Pager, pageParam } from "@/components/pager";
import { getBuilds, getHackathon, myBuildFor } from "@/lib/hackathons-server";
import { RichText } from "@/lib/rich";
import { getViewer } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/hackathons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const h = await getHackathon(slug, null);
  if (!h) return { title: "hackathon · castlehub" };
  const title = `${h.title} · castlehub hackathons`;
  const description = h.summary ?? undefined;
  return { title, description, openGraph: { title, description, ...(h.coverUrl && { images: [h.coverUrl] }) } };
}

const btn = "inline-flex h-11 items-center gap-2 rounded-sm px-5 text-body font-semibold";
const primary = `${btn} bg-cobalt text-on-cobalt transition-transform duration-120 hover:-translate-y-px`;
const secondary = `${btn} border border-line-strong hover:border-ink`;

export default async function HackathonPage({ params, searchParams }: PageProps<"/hackathons/[slug]">) {
  const [{ slug }, sp, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const h = await getHackathon(slug, viewer);
  if (!h) notFound();

  const q = String(sp.q ?? "").trim().slice(0, 60);
  const sort = sp.sort === "featured" ? "featured" : "newest";
  const page = pageParam(sp.page);
  const [{ builds, hasMore }, mine] = await Promise.all([
    getBuilds(h.id, { q, sort, page }),
    viewer ? myBuildFor(h.id, viewer.id) : null,
  ]);
  const entry = mine && !mine.withdrawnAt ? mine : null;
  const base = `/hackathons/${h.slug}`;
  const submitHref = viewer ? `${base}/submit` : `/signin?next=${encodeURIComponent(`${base}/submit`)}`;
  const href = (p: { q?: string; sort?: string; page?: number }) => {
    const s = new URLSearchParams();
    if (p.q ?? q) s.set("q", p.q ?? q);
    if ((p.sort ?? sort) !== "newest") s.set("sort", p.sort ?? sort);
    if (p.page && p.page > 1) s.set("page", String(p.page));
    const str = s.toString();
    return `${base}${str ? `?${str}` : ""}#builds`;
  };

  return (
    <article>
      <div className="flex items-center justify-between border-b border-line px-4 py-3 md:px-6">
        <Link href="/hackathons" className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> hackathons
        </Link>
        {viewer?.isAdmin && (
          <Link href={`/admin/hackathons/${h.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-body-s font-semibold hover:border-ink">
            <Settings className="size-3.5" /> manage
          </Link>
        )}
      </div>

      {h.status === "draft" && (
        <p className="border-b border-amber bg-amber/15 px-4 py-2.5 text-body md:px-6" role="status">
          <strong>Draft preview.</strong> Only admins can see this page until it&apos;s published.
        </p>
      )}

      <Cover src={h.coverUrl} name={h.title} className="border-b border-line" />

      <header className="space-y-3 border-b border-line px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={h.status} />
          {h.theme && <span className="text-label text-muted">theme · {h.theme}</span>}
        </div>
        <h1 className="text-display-l break-words">{h.title}</h1>
        {h.summary && <p className="text-body-l text-muted">{h.summary}</p>}
        <EventDates opensAt={h.opensAt} closesAt={h.closesAt} />
        {h.override === "CLOSED" && h.status === "closed" && <p className="text-body-s text-muted">Submissions were closed early by the organisers.</p>}
        {h.override === "OPEN" && h.status === "open" && <p className="text-body-s text-muted">Reopened by the organisers: still accepting builds.</p>}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {h.status === "open" && !entry && <Link href={submitHref} className={primary}>submit your build →</Link>}
          {entry && <Link href={`${base}/builds/${entry.id}`} className={h.status === "open" ? secondary : primary}>view your submission</Link>}
          {entry && h.status === "open" && <Link href={`${base}/builds/${entry.id}/edit`} className={primary}>edit submission</Link>}
          {h.status === "upcoming" && h.opensAt && (
            <p className="text-body text-muted">
              Submissions open <LocalTime iso={h.opensAt.toISOString()} />.
            </p>
          )}
          {h.linkUrl && (
            <a href={h.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className={secondary}>
              announcement &amp; resources <ExternalLink className="size-4" />
            </a>
          )}
        </div>
      </header>

      <div className="space-y-6 border-b border-line px-4 py-6 md:px-6">
        {h.brief && (
          <section aria-labelledby="brief-h">
            <h2 id="brief-h" className="text-label mb-2 text-muted">the brief</h2>
            <RichText text={h.brief} className="text-body-l" />
          </section>
        )}
        {h.rules && (
          <section aria-labelledby="rules-h">
            <h2 id="rules-h" className="text-label mb-2 text-muted">rules</h2>
            <RichText text={h.rules} />
          </section>
        )}
        {h.prizes && (
          <section aria-labelledby="prizes-h">
            <h2 id="prizes-h" className="text-label mb-2 text-muted">prizes</h2>
            <RichText text={h.prizes} />
          </section>
        )}
      </div>

      <section id="builds" aria-labelledby="builds-h" className="scroll-mt-20 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="builds-h" className="text-title-m">
            builds <span className="text-count align-middle text-muted">{h._count.submissions}</span>
          </h2>
          <nav aria-label="Sort builds" className="flex gap-1">
            {(["newest", "featured"] as const).map((s) => (
              <Link
                key={s}
                href={href({ sort: s, page: 1 })}
                aria-current={s === sort ? "page" : undefined}
                className="text-label rounded-sm border border-line px-2.5 py-1.5 text-muted hover:text-ink aria-[current=page]:border-cobalt aria-[current=page]:bg-cobalt aria-[current=page]:text-on-cobalt"
              >
                {s === "newest" ? "newest" : "featured first"}
              </Link>
            ))}
          </nav>
        </div>
        <form action={`${base}#builds`} className="mt-3 flex gap-2" role="search">
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <label className="relative flex-1">
            <span className="sr-only">Search builds</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              maxLength={60}
              placeholder="search by build name or builder"
              className="h-10 w-full rounded-sm border border-line-strong bg-surface pr-3 pl-9 text-body placeholder:text-muted focus:border-cobalt focus:outline-none"
            />
          </label>
          <button className="h-10 rounded-sm border border-line-strong px-4 text-body font-semibold hover:border-ink">search</button>
        </form>

        {builds.length === 0 ? (
          <div className="mt-4 border border-dashed border-line-strong px-4 py-10 text-center">
            <p className="text-title-l">{q ? `no builds match “${q}”` : page > 1 ? "no more builds" : "no builds yet"}</p>
            <p className="mt-1.5 text-body text-muted">
              {q ? <Link href={href({ q: "", page: 1 })} className="text-cobalt hover:underline">Clear the search</Link> : h.status === "open" ? "Be the first to share what you made." : h.status === "upcoming" ? "Builds appear here once submissions open." : "Nobody shared a build for this one."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {builds.map((b) => <BuildTile key={b.id} build={b} href={`${base}/builds/${b.id}`} />)}
          </ul>
        )}
      </section>
      <Pager page={page} hasMore={hasMore} href={(p) => href({ page: p })} newer="previous" older="more builds" />
    </article>
  );
}
