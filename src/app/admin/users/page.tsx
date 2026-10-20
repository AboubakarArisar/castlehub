import Link from "next/link";
import { adminSetSuspended } from "@/actions/admin";
import { Avatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().slice(0, 100);
  const onlySuspended = sp.status === "suspended";
  const text = { contains: q, mode: "insensitive" as const };
  const users = await db.user.findMany({
    where: {
      ...(q ? { OR: [{ name: text }, { handle: text }, { email: text }] } : {}),
      ...(onlySuspended ? { suspendedAt: { not: null } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, handle: true, email: true, image: true, headline: true, createdAt: true, suspendedAt: true,
      _count: { select: { projects: true, posts: true, comments: true } },
    },
  });

  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <nav aria-label="Filter" className="flex gap-1">
          {[
            { label: "everyone", href: "/admin/users", on: !onlySuspended },
            { label: "suspended", href: "/admin/users?status=suspended", on: onlySuspended },
          ].map((f) => (
            <Link key={f.label} href={f.href} aria-current={f.on ? "page" : undefined} className="text-label rounded-sm border border-line px-2.5 py-1.5 text-muted hover:text-ink aria-[current=page]:border-cobalt aria-[current=page]:bg-cobalt aria-[current=page]:text-on-cobalt">
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex gap-2">
          {onlySuspended && <input type="hidden" name="status" value="suspended" />}
          <input name="q" defaultValue={q} placeholder="name, @handle or email" aria-label="Search users" className="h-9 w-56 rounded-sm border border-line bg-transparent px-3 text-body placeholder:text-muted focus:border-cobalt focus:outline-none" />
          <button className="h-9 rounded-sm border border-line-strong px-3 text-body font-semibold hover:border-ink">search</button>
        </form>
      </div>

      {users.length === 0 ? (
        <p className="px-4 py-10 text-center text-body text-muted">No users match.</p>
      ) : (
        <ul>
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <Avatar seed={u.handle ?? u.id} src={u.image} size={36} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  {u.handle ? (
                    <Link href={`/${u.handle}`} className="text-body font-semibold hover:underline">{u.name ?? u.handle}</Link>
                  ) : (
                    <span className="text-body font-semibold">{u.name ?? "unnamed"}</span>
                  )}
                  <span className="text-body-s text-muted">{u.handle ? `@${u.handle}` : "no handle yet"}</span>
                  {u.suspendedAt && <span className="text-label rounded-sm bg-red px-1.5 py-0.5 text-paper">suspended {timeAgo(u.suspendedAt)}</span>}
                  {u.id === admin.id && <span className="text-label rounded-sm border border-cobalt px-1.5 py-0.5 text-cobalt">you</span>}
                </p>
                <p className="truncate text-body-s text-muted">
                  {u.email ?? "no email"} · joined {timeAgo(u.createdAt)} · {u._count.projects} projects · {u._count.posts} posts · {u._count.comments} comments
                </p>
              </div>
              {u.id !== admin.id && (
                <form action={adminSetSuspended.bind(null, u.id, !u.suspendedAt)}>
                  <ConfirmButton
                    message={u.suspendedAt ? `Let ${u.name ?? "this user"} post again?` : `Suspend ${u.name ?? "this user"}? They can still read, but can't post, comment, react or publish.`}
                    className={`h-8 rounded-sm border px-3 text-body-s font-semibold transition-colors duration-120 ${u.suspendedAt ? "border-line-strong hover:border-ink" : "border-line text-muted hover:border-red hover:text-red"}`}
                  >
                    {u.suspendedAt ? "unsuspend" : "suspend"}
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
