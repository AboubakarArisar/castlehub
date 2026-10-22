import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);

export default async function AdminOverview() {
  // Layouts render in parallel with pages, so every admin page checks for itself.
  await requireAdmin();
  const week = { createdAt: { gte: daysAgo(7) } };
  const [users, builders, suspended, projects, posts, comments, upvotes, reactions, w] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { handle: { not: null } } }),
    db.user.count({ where: { suspendedAt: { not: null } } }),
    db.project.count(),
    db.post.count(),
    db.comment.count(),
    db.projectUpvote.count(),
    db.postReaction.count(),
    Promise.all([db.user.count({ where: week }), db.project.count({ where: week }), db.post.count({ where: week }), db.comment.count({ where: week })]),
  ]);
  const latest = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, name: true, handle: true, image: true, createdAt: true, _count: { select: { projects: true, posts: true } } },
  });

  const stats = [
    { label: "users", value: users, week: w[0], note: `${builders} with a handle` },
    { label: "projects", value: projects, week: w[1] },
    { label: "posts", value: posts, week: w[2] },
    { label: "comments", value: comments, week: w[3] },
    { label: "upvotes + reactions", value: upvotes + reactions },
    { label: "suspended", value: suspended, href: "/admin/users?status=suspended" },
  ];

  return (
    <div className="grid gap-8">
      <section aria-label="Totals" className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const body = (
            <>
              <p className="text-label text-muted">{s.label}</p>
              <p className="mt-2 font-display text-[40px] leading-none font-extrabold tracking-[-0.04em]">{s.value}</p>
              <p className="mt-2 text-body-s text-muted">
                {s.week !== undefined ? <span className={s.week > 0 ? "text-green" : ""}>+{s.week} this week</span> : s.note}
                {s.week !== undefined && s.note && <> · {s.note}</>}
              </p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="bg-paper p-4 hover:bg-surface">{body}</Link>
          ) : (
            <div key={s.label} className="bg-paper p-4">{body}</div>
          );
        })}
      </section>

      <section aria-labelledby="latest-h" className="border border-line">
        <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
          <h2 id="latest-h" className="text-label text-muted">newest members</h2>
          <Link href="/admin/users" className="text-body-s text-cobalt hover:underline">all users →</Link>
        </div>
        <ul>
          {latest.map((u) => (
            <li key={u.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <Avatar seed={u.handle ?? u.id} src={u.image} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{u.name ?? "unnamed"}</span>
                <span className="block text-body-s text-muted">{u.handle ? `@${u.handle}` : "hasn't picked a handle yet"}</span>
              </span>
              <span className="hidden text-body-s text-muted sm:block">
                {u._count.projects} projects · {u._count.posts} posts
              </span>
              <span className="w-16 text-right text-body-s text-muted">{timeAgo(u.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
