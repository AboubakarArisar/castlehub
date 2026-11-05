import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { hideBuild, restoreBuild, saveHackathon, setArchived, setFeatured, setSubmissionOverride } from "@/actions/hackathon-admin";
import { ConfirmButton } from "@/components/confirm-button";
import { StatusBadge } from "@/components/hackathons";
import { HackathonForm } from "@/components/hackathon-forms";
import { db } from "@/lib/db";
import { hackathonStatus, toUtcInput } from "@/lib/hackathons";
import { timeAgo } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";

const btn = "h-8 rounded-sm border px-2.5 text-body-s font-semibold transition-colors duration-120";
const quiet = `${btn} border-line-strong hover:border-ink`;
const danger = `${btn} border-red/60 text-red hover:bg-red hover:text-paper`;

export default async function AdminHackathon({ params, searchParams }: PageProps<"/admin/hackathons/[id]">) {
  // Layouts render in parallel with pages, so every admin page checks for itself.
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const h = await db.hackathon.findUnique({
    where: { id },
    include: {
      submissions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, tagline: true, createdAt: true, featuredAt: true, withdrawnAt: true, hiddenAt: true, hiddenReason: true, author: { select: { handle: true } } },
      },
    },
  });
  if (!h) notFound();
  const status = hackathonStatus(h);
  const published = Boolean(h.publishedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/hackathons" className="text-body-s text-muted hover:text-ink">← all hackathons</Link>
        <StatusBadge status={status} />
        <Link href={`/hackathons/${h.slug}`} className="inline-flex items-center gap-1 text-body-s font-semibold text-cobalt hover:underline">
          {published ? "view page" : "preview draft"} <ExternalLink className="size-3.5" />
        </Link>
      </div>
      {sp.saved && <p className="rounded-sm border border-green px-3 py-2 text-body" role="status">Saved.</p>}

      {published && (
        <section aria-labelledby="controls-h" className="border border-line p-4">
          <h2 id="controls-h" className="text-label mb-3 text-muted">submissions &amp; archive</h2>
          <div className="flex flex-wrap gap-2">
            {!h.archivedAt && status !== "closed" && (
              <form action={setSubmissionOverride.bind(null, h.id, "CLOSED")}>
                <ConfirmButton message="Close submissions now? Members won't be able to submit, edit or withdraw." className={danger}>close submissions now</ConfirmButton>
              </form>
            )}
            {!h.archivedAt && status !== "open" && (
              <form action={setSubmissionOverride.bind(null, h.id, "OPEN")}>
                <ConfirmButton message="Reopen submissions? They stay open, whatever the dates say, until you close them or switch back to the schedule." className={quiet}>reopen submissions</ConfirmButton>
              </form>
            )}
            {h.override && (
              <form action={setSubmissionOverride.bind(null, h.id, null)}>
                <button className={quiet}>follow the dates again</button>
              </form>
            )}
            <form action={setArchived.bind(null, h.id, !h.archivedAt)}>
              <ConfirmButton
                message={h.archivedAt ? "Unarchive this hackathon?" : "Archive this hackathon? It moves to past hackathons and stops accepting builds; its gallery stays public."}
                className={quiet}
              >
                {h.archivedAt ? "unarchive" : "archive"}
              </ConfirmButton>
            </form>
          </div>
          {h.override && (
            <p className="mt-2 text-body-s text-muted">
              Override active: submissions are {h.override === "OPEN" ? "reopened" : "closed early"} regardless of the dates.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="details-h" className="border border-line p-4 md:p-6">
        <h2 id="details-h" className="text-title-m mb-4">details</h2>
        <HackathonForm
          action={saveHackathon.bind(null, h.id)}
          published={published}
          isNew={false}
          defaults={{
            title: h.title,
            slug: h.slug,
            summary: h.summary ?? "",
            brief: h.brief,
            theme: h.theme ?? "",
            rules: h.rules ?? "",
            prizes: h.prizes ?? "",
            linkUrl: h.linkUrl ?? "",
            coverUrl: h.coverUrl,
            opensAt: toUtcInput(h.opensAt),
            closesAt: toUtcInput(h.closesAt),
          }}
        />
      </section>

      <section aria-labelledby="entries-h" className="border border-line">
        <h2 id="entries-h" className="text-title-m border-b border-line px-4 py-3">
          entries <span className="text-count align-middle text-muted">{h.submissions.length}</span>
        </h2>
        {h.submissions.length === 0 ? (
          <p className="px-4 py-8 text-center text-body text-muted">No entries yet.</p>
        ) : (
          <ul>
            {h.submissions.map((s) => (
              <li key={s.id} className="space-y-2 border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/hackathons/${h.slug}/builds/${s.id}`} className="font-display text-[16px] font-bold hover:underline">{s.name}</Link>
                  <span className="text-body-s text-muted">@{s.author.handle} · {timeAgo(s.createdAt)}</span>
                  {s.featuredAt && <span className="text-label rounded-sm bg-amber px-1.5 py-0.5 text-amber-ink">featured</span>}
                  {s.withdrawnAt && <span className="text-label rounded-sm border border-line px-1.5 py-0.5 text-muted">withdrawn</span>}
                  {s.hiddenAt && <span className="text-label rounded-sm border border-red px-1.5 py-0.5 text-red">hidden</span>}
                </div>
                {s.tagline && <p className="line-clamp-1 text-body-s text-muted">{s.tagline}</p>}
                {s.hiddenAt && s.hiddenReason && <p className="text-body-s text-red">Reason: {s.hiddenReason}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {!s.hiddenAt && !s.withdrawnAt && (
                    <form action={setFeatured.bind(null, s.id, !s.featuredAt)}>
                      <button className={quiet}>{s.featuredAt ? "unfeature" : "feature"}</button>
                    </form>
                  )}
                  {s.hiddenAt ? (
                    <form action={restoreBuild.bind(null, s.id)}>
                      <button className={quiet}>restore</button>
                    </form>
                  ) : (
                    <form action={hideBuild.bind(null, s.id)} className="flex min-w-0 flex-1 gap-2">
                      <input
                        name="reason"
                        required
                        maxLength={300}
                        placeholder="reason for hiding (required)"
                        aria-label={`Reason for hiding ${s.name}`}
                        className="h-8 min-w-0 flex-1 rounded-sm border border-line bg-transparent px-2 text-body-s placeholder:text-muted focus:border-cobalt focus:outline-none"
                      />
                      <button className={danger}>hide</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
