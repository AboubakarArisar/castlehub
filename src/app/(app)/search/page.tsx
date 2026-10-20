import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ProjectRow } from "@/components/project-row";
import { PageHeader } from "@/components/shell";
import { search } from "@/lib/queries";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "search · castlehub" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().slice(0, 80);
  const collabOnly = sp.collab === "1";
  const viewer = await getViewer();
  const { projects, builders } = await search(q, { collabOnly, viewerId: viewer?.id });
  const searched = Boolean(q) || collabOnly;

  return (
    <>
      <PageHeader label="find projects and builders" title={<>se<span className="accent-serif">arch</span></>}>
        <form className="mt-5 flex gap-2" role="search">
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="a project, a @handle, a skill like godot…"
            aria-label="Search"
            className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 text-body placeholder:text-muted/70 focus:border-cobalt focus:outline-none"
          />
          {collabOnly && <input type="hidden" name="collab" value="1" />}
          <button className="h-11 rounded-sm bg-cobalt px-5 text-body font-semibold text-on-cobalt">search</button>
        </form>
        <div className="mt-3 flex gap-1.5">
          <Link
            href={collabOnly ? (q ? `/search?q=${encodeURIComponent(q)}` : "/search") : `/search?collab=1${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-pressed={collabOnly}
            className={`text-label rounded-sm border px-2.5 py-1.5 ${collabOnly ? "border-green bg-green/10 text-green" : "border-line text-muted hover:text-ink"}`}
          >
            builders open to collab
          </Link>
        </div>
      </PageHeader>

      {!searched ? (
        <p className="px-6 py-14 text-center text-body text-muted">Search by name, tagline, tag, @handle or skill.</p>
      ) : (
        <>
          {projects.length > 0 && (
            <section aria-labelledby="sp-h">
              <h2 id="sp-h" className="text-label border-b border-line px-4 pt-5 pb-2 text-muted md:px-6">projects · {projects.length}</h2>
              <ol>
                {projects.map((p) => (
                  <ProjectRow key={p.id} project={p} canVote={Boolean(viewer?.handle)} />
                ))}
              </ol>
            </section>
          )}
          {builders.length > 0 && (
            <section aria-labelledby="sb-h">
              <h2 id="sb-h" className="text-label border-b border-line px-4 pt-5 pb-2 text-muted md:px-6">builders · {builders.length}</h2>
              <ul>
                {builders.map((b) => (
                  <li key={b.id} className="border-b border-line">
                    <Link href={`/${b.handle}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface md:px-6">
                      <Avatar seed={b.handle ?? b.id} src={b.image} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-body font-semibold">{b.name}</span>
                          <span className="text-body-s text-muted">@{b.handle}</span>
                          {b.openToCollab && <span className="text-label rounded-sm border border-green px-1.5 py-0.5 text-green">open to collab</span>}
                        </span>
                        <span className="block truncate text-body-s text-muted">{[b.headline, b.skills.slice(0, 4).join(" · ")].filter(Boolean).join(" — ")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {projects.length === 0 && builders.length === 0 && (
            <p className="px-6 py-14 text-center text-body text-muted">
              Nothing matches{q ? ` “${q}”` : ""}{collabOnly ? " among builders open to collab" : ""}.
            </p>
          )}
        </>
      )}
    </>
  );
}
