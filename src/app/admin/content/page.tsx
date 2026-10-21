import Link from "next/link";
import { Trash2 } from "lucide-react";
import { adminDeleteComment, adminDeletePost, adminDeleteProject } from "@/actions/admin";
import { ConfirmButton } from "@/components/confirm-button";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/rules";

const KINDS = ["posts", "comments", "projects"] as const;
type Kind = (typeof KINDS)[number];
type Row = { id: string; href: string; author: string | null; title?: string; body: string; createdAt: Date; extra?: string };

async function load(kind: Kind, q: string): Promise<Row[]> {
  const text = q ? { contains: q, mode: "insensitive" as const } : undefined;
  const byAuthor = q ? { author: { OR: [{ handle: text }, { name: text }] } } : {};
  if (kind === "posts") {
    const rows = await db.post.findMany({
      where: q ? { OR: [{ body: text }, byAuthor] } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, body: true, imageUrl: true, createdAt: true, author: { select: { handle: true } }, _count: { select: { comments: true, reactions: true } } },
    });
    return rows.map((p) => ({ id: p.id, href: `/post/${p.id}`, author: p.author.handle, body: p.body, createdAt: p.createdAt, extra: `${p._count.reactions} reactions · ${p._count.comments} comments${p.imageUrl ? " · image" : ""}` }));
  }
  if (kind === "comments") {
    const rows = await db.comment.findMany({
      where: q ? { OR: [{ body: text }, byAuthor] } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, body: true, kind: true, audioDuration: true, createdAt: true, postId: true, author: { select: { handle: true } }, project: { select: { slug: true, name: true, owner: { select: { handle: true } } } } },
    });
    return rows.map((c) => ({
      id: c.id,
      href: c.postId ? `/post/${c.postId}#comments` : `/${c.project?.owner.handle}/${c.project?.slug}#comments`,
      author: c.author.handle,
      body: c.kind === "VOICE" ? `voice comment (${Math.round(c.audioDuration ?? 0)}s)` : c.body,
      createdAt: c.createdAt,
      extra: c.postId ? "on a post" : `on ${c.project?.name}`,
    }));
  }
  const rows = await db.project.findMany({
    where: q ? { OR: [{ name: text }, { tagline: text }, { owner: { OR: [{ handle: text }, { name: text }] } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, slug: true, tagline: true, launchWeek: true, createdAt: true, owner: { select: { handle: true } }, _count: { select: { upvotes: true, images: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    href: `/${p.owner.handle}/${p.slug}`,
    author: p.owner.handle,
    title: p.name,
    body: p.tagline,
    createdAt: p.createdAt,
    extra: `${p._count.upvotes} upvotes · ${p._count.images} images${p.launchWeek ? ` · launchpad ${p.launchWeek}` : ""}`,
  }));
}

const ACTION = { posts: adminDeletePost, comments: adminDeleteComment, projects: adminDeleteProject };
const CONFIRM = {
  posts: "Delete this post and its comments? This can't be undone.",
  comments: "Delete this comment? This can't be undone.",
  projects: "Delete this project with its images, upvotes and comments? This can't be undone.",
};

export default async function AdminContent({ searchParams }: PageProps<"/admin/content">) {
  const sp = await searchParams;
  const kind: Kind = KINDS.find((k) => k === sp.type) ?? "posts";
  const q = String(sp.q ?? "").trim().slice(0, 100);
  const rows = await load(kind, q);

  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <nav aria-label="Content type" className="flex gap-1">
          {KINDS.map((k) => (
            <Link
              key={k}
              href={`/admin/content?type=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={k === kind ? "page" : undefined}
              className="text-label rounded-sm border border-line px-2.5 py-1.5 text-muted hover:text-ink aria-[current=page]:border-cobalt aria-[current=page]:bg-cobalt aria-[current=page]:text-on-cobalt"
            >
              {k}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="type" value={kind} />
          <input name="q" defaultValue={q} placeholder="search text or @handle" aria-label={`Search ${kind}`} className="h-9 w-56 rounded-sm border border-line bg-transparent px-3 text-body placeholder:text-muted focus:border-cobalt focus:outline-none" />
          <button className="h-9 rounded-sm border border-line-strong px-3 text-body font-semibold hover:border-ink">search</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-body text-muted">{q ? `No ${kind} match “${q}”.` : `No ${kind} yet.`}</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-4 border-b border-line px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-body-s text-muted">
                  {r.author ? <Link href={`/${r.author}`} className="hover:underline">@{r.author}</Link> : "unknown"} · {timeAgo(r.createdAt)}
                  {r.extra && <> · {r.extra}</>}
                </p>
                <Link href={r.href} className="mt-1 block hover:underline">
                  {r.title && <span className="font-display text-[16px] font-bold">{r.title} — </span>}
                  <span className="line-clamp-2 text-body">{r.body}</span>
                </Link>
              </div>
              <form action={ACTION[kind].bind(null, r.id)}>
                <ConfirmButton
                  message={CONFIRM[kind]}
                  aria-label={`Delete ${kind.slice(0, -1)}`}
                  title="Delete"
                  className="grid size-8 place-items-center rounded-sm border border-line text-muted transition-colors duration-120 hover:border-red hover:text-red"
                >
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
