import Link from "next/link";
import {
  approveTile,
  dismissReports,
  hideTile,
  reassignTile,
  rejectTile,
  releaseTile,
  removeArtwork,
  restoreTile,
  setWallRestricted,
} from "@/actions/wall-admin";
import { ConfirmButton } from "@/components/confirm-button";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/rules";
import { REPORT_REASONS } from "@/lib/wall";
import { requireAdmin } from "@/lib/session";

const btn = "h-8 rounded-sm border px-2.5 text-body-s font-semibold transition-colors duration-120";
const quiet = `${btn} border-line-strong hover:border-ink`;
const danger = `${btn} border-red/60 text-red hover:bg-red hover:text-paper`;
const input = "h-8 min-w-0 flex-1 rounded-sm border border-line bg-transparent px-2 text-body-s placeholder:text-muted focus:border-cobalt focus:outline-none";
const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.key === r)?.label ?? r;

// Images here are artwork for moderation only; a checkerboard shows transparent areas.
const checker = "bg-[conic-gradient(#2a2924_25%,#1d1c18_0_50%,#2a2924_0_75%,#1d1c18_0)] bg-[length:16px_16px]";

export default async function AdminWall() {
  // Layouts render in parallel with pages, so every admin page checks for itself.
  await requireAdmin();
  const [pending, reported, tiles] = await Promise.all([
    db.wallTile.findMany({
      where: { review: "PENDING" },
      orderBy: { submittedAt: "asc" },
      select: { id: true, x: true, y: true, submittedAt: true, publishedKey: true, publishedVersion: true, owner: { select: { id: true, handle: true, name: true } } },
    }),
    db.wallTile.findMany({
      where: { reports: { some: { resolvedAt: null } } },
      select: {
        id: true, x: true, y: true, hiddenAt: true, publishedVersion: true, owner: { select: { handle: true } },
        reports: { where: { resolvedAt: null }, select: { reason: true, note: true, createdAt: true, reporter: { select: { handle: true } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    db.wallTile.findMany({
      orderBy: [{ y: "asc" }, { x: "asc" }],
      take: 500,
      select: {
        id: true, x: true, y: true, review: true, hiddenAt: true, hiddenReason: true, publishedKey: true, claimedAt: true,
        owner: { select: { id: true, handle: true, wallRestrictedAt: true } },
      },
    }),
  ]);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="review-h" className="border border-line">
        <h2 id="review-h" className="text-label border-b border-line px-4 py-3 text-muted">waiting for review · {pending.length}</h2>
        {pending.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-s text-muted">Nothing to review. New submissions stay private until you approve them.</p>
        ) : (
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((t) => (
              <li key={t.id} className="bg-paper p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- private submission, served through an admin-checked route */}
                <img src={`/api/wall/image/${t.id}?kind=submitted&t=${t.submittedAt?.getTime()}`} alt={`Submission for square ${t.x + 1},${t.y + 1}`} className={`aspect-square w-full rounded-sm border border-line object-contain ${checker}`} />
                <p className="mt-2 text-body-s">
                  <Link href={`/${t.owner.handle}`} className="font-semibold hover:underline">@{t.owner.handle}</Link>{" "}
                  <span className="text-muted">· square {t.x + 1},{t.y + 1} · {t.submittedAt && timeAgo(t.submittedAt)}{t.publishedKey ? " · update to live art" : " · first version"}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={approveTile.bind(null, t.id)}>
                    <button className={`${btn} border-green/60 text-green hover:bg-green hover:text-paper`}>approve</button>
                  </form>
                  <form action={rejectTile.bind(null, t.id)} className="flex min-w-0 flex-1 gap-2">
                    <input name="note" placeholder="reason (the artist sees this)" aria-label="Rejection reason" className={input} maxLength={300} />
                    <button className={danger}>reject</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reports-h" className="border border-line">
        <h2 id="reports-h" className="text-label border-b border-line px-4 py-3 text-muted">open reports · {reported.length}</h2>
        {reported.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-s text-muted">No open reports.</p>
        ) : (
          <ul>
            {reported.map((t) => (
              <li key={t.id} className="flex flex-wrap gap-4 border-b border-line p-4 last:border-b-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- reported artwork */}
                <img src={`/api/wall/image/${t.id}?v=${t.publishedVersion}`} alt={`Reported square ${t.x + 1},${t.y + 1}`} className={`size-28 rounded-sm border border-line object-contain ${checker}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-body-s">
                    square {t.x + 1},{t.y + 1} by <Link href={`/${t.owner.handle}`} className="font-semibold hover:underline">@{t.owner.handle}</Link>
                    {t.hiddenAt && <span className="text-label ml-2 rounded-sm bg-red px-1.5 py-0.5 text-paper">hidden</span>}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {t.reports.map((r, i) => (
                      <li key={i} className="text-body-s text-muted">
                        <span className="font-semibold text-ink">{reasonLabel(r.reason)}</span> · @{r.reporter.handle} · {timeAgo(r.createdAt)}
                        {r.note && <> · “{r.note}”</>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {!t.hiddenAt && (
                      <form action={hideTile.bind(null, t.id)} className="flex gap-2">
                        <input name="reason" placeholder="why (the artist sees this)" aria-label="Hide reason" className={`${input} w-52 flex-none`} maxLength={300} />
                        <button className={danger}>hide</button>
                      </form>
                    )}
                    <form action={removeArtwork.bind(null, t.id)}>
                      <ConfirmButton message="Remove this artwork? The square stays with its owner, but the drawing is deleted." className={danger}>remove art</ConfirmButton>
                    </form>
                    <form action={dismissReports.bind(null, t.id)}>
                      <button className={quiet}>dismiss reports</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tiles-h" className="border border-line">
        <h2 id="tiles-h" className="text-label border-b border-line px-4 py-3 text-muted">all squares · {tiles.length}</h2>
        {tiles.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-s text-muted">Nobody has claimed a square yet.</p>
        ) : (
          <ul>
            {tiles.map((t) => {
              const status = t.hiddenAt ? "hidden" : t.review === "PENDING" ? "pending review" : t.publishedKey ? "on the wall" : t.review === "REJECTED" ? "rejected" : "drawing";
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <span className="text-count w-14 text-muted">{t.x + 1},{t.y + 1}</span>
                  <Link href={`/${t.owner.handle}`} className="text-body-s font-semibold hover:underline">@{t.owner.handle}</Link>
                  <span className="text-label text-muted">{status}</span>
                  {t.owner.wallRestrictedAt && <span className="text-label rounded-sm border border-red/60 px-1.5 py-0.5 text-red">restricted</span>}
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {t.hiddenAt ? (
                      <form action={restoreTile.bind(null, t.id)}>
                        <button className={quiet}>restore</button>
                      </form>
                    ) : (
                      t.publishedKey && (
                        <form action={hideTile.bind(null, t.id)}>
                          <button className={quiet}>hide</button>
                        </form>
                      )
                    )}
                    <form action={reassignTile.bind(null, t.id)} className="flex gap-1.5">
                      <input name="handle" placeholder="@handle" aria-label="Reassign to" className={`${input} w-28 flex-none`} />
                      <ConfirmButton message="Give this square to that builder? The current artwork is deleted, not transferred." className={quiet}>reassign</ConfirmButton>
                    </form>
                    <form action={setWallRestricted.bind(null, t.owner.id, !t.owner.wallRestrictedAt)}>
                      <ConfirmButton message={t.owner.wallRestrictedAt ? "Let them draw on the wall again?" : "Stop this builder from claiming, drawing or reporting on the wall?"} className={t.owner.wallRestrictedAt ? quiet : danger}>
                        {t.owner.wallRestrictedAt ? "unrestrict" : "restrict"}
                      </ConfirmButton>
                    </form>
                    <form action={releaseTile.bind(null, t.id)}>
                      <ConfirmButton message="Release this square? Its artwork is deleted and the square becomes free." className={danger}>release</ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
