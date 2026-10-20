import { db } from "@/lib/db";
import { timeAgo } from "@/lib/rules";

const LABEL: Record<string, string> = {
  delete_post: "deleted post",
  delete_comment: "deleted comment",
  delete_project: "deleted project",
  suspend: "suspended",
  unsuspend: "unsuspended",
};

export default async function AdminLog() {
  const entries = await db.adminAction.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="border border-line">
      {entries.length === 0 ? (
        <p className="px-4 py-10 text-center text-body text-muted">No admin actions yet. Deletions and suspensions show up here.</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3 last:border-b-0">
              <span className="w-20 shrink-0 text-body-s text-muted" title={e.createdAt.toISOString()}>{timeAgo(e.createdAt)}</span>
              <span className="text-body-s font-semibold">@{e.adminHandle ?? "admin"}</span>
              <span className={`text-label rounded-sm border px-1.5 py-0.5 ${e.action.startsWith("delete") || e.action === "suspend" ? "border-red text-red" : "border-line text-muted"}`}>
                {LABEL[e.action] ?? e.action}
              </span>
              <span className="min-w-0 flex-1 basis-60 text-body">{e.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
