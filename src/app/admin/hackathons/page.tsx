import Link from "next/link";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/hackathons";
import { LocalTime } from "@/components/hackathon-forms";
import { db } from "@/lib/db";
import { hackathonStatus } from "@/lib/hackathons";
import { PUBLIC_BUILD } from "@/lib/hackathons-server";
import { requireAdmin } from "@/lib/session";

export default async function AdminHackathons() {
  // Layouts render in parallel with pages, so every admin page checks for itself.
  await requireAdmin();
  const events = await db.hackathon.findMany({
    orderBy: [{ opensAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    select: {
      id: true, slug: true, title: true, opensAt: true, closesAt: true, override: true, publishedAt: true, archivedAt: true,
      _count: { select: { submissions: true } },
    },
  });
  const visible = await db.hackathonSubmission.groupBy({ by: ["hackathonId"], where: PUBLIC_BUILD, _count: true });
  const shown = new Map(visible.map((v) => [v.hackathonId, v._count]));

  return (
    <div className="border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="text-body-s text-muted">Dates are set per event; nothing repeats automatically.</p>
        <Link href="/admin/hackathons/new" className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-cobalt px-3.5 text-body font-semibold text-on-cobalt">
          <Plus className="size-4" /> new hackathon
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-10 text-center text-body text-muted">No hackathons yet. Create a draft, preview it, then publish.</p>
      ) : (
        <ul>
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-b-0">
              <StatusBadge status={hackathonStatus(e)} />
              <Link href={`/admin/hackathons/${e.id}`} className="min-w-0 flex-1 font-display text-[16px] font-bold hover:underline">{e.title}</Link>
              <span className="text-body-s text-muted">
                {e.opensAt && e.closesAt ? <><LocalTime iso={e.opensAt.toISOString()} /> → <LocalTime iso={e.closesAt.toISOString()} /></> : "no dates yet"}
              </span>
              <span className="text-count text-muted">{shown.get(e.id) ?? 0} shown / {e._count.submissions} entries</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
