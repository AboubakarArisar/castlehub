import Link from "next/link";
import { Pin } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { LocalTime } from "@/components/hackathon-forms";
import { STATUS_LABEL, type HackathonStatus } from "@/lib/hackathons";
import type { BuildCard, HackathonView } from "@/lib/hackathons-server";

/** An uploaded cover, or a CastleHub-styled placeholder with the name's first letter. */
export function Cover({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- user uploads (Vercel Blob or local)
    return <img src={src} alt="" loading="lazy" className={`aspect-[16/9] w-full bg-surface-2 object-cover ${className}`} />;
  }
  return (
    <div
      aria-hidden="true"
      className={`relative grid aspect-[16/9] w-full place-items-center overflow-hidden bg-ink text-paper ${className}`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--cobalt)_0,transparent_45%),radial-gradient(circle_at_85%_90%,var(--amber)_0,transparent_40%)] opacity-60" />
      <span className="relative font-display text-[clamp(2.5rem,8vw,4.5rem)] leading-none font-extrabold tracking-[-0.04em]">
        {name.trim()[0]?.toLowerCase() ?? "?"}
      </span>
    </div>
  );
}

const STATUS_STYLE: Record<HackathonStatus, string> = {
  draft: "border-line-strong text-muted",
  upcoming: "border-cobalt text-cobalt",
  open: "border-green bg-green text-paper",
  closed: "border-line-strong text-muted",
  archived: "border-line text-muted",
};

export function StatusBadge({ status }: { status: HackathonStatus }) {
  return (
    <span className={`text-label inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {status === "open" && <span className="size-1.5 animate-pulse rounded-full bg-paper" aria-hidden="true" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** "opens … · closes …" with times in the viewer's own timezone (UTC before hydration). */
export function EventDates({ opensAt, closesAt, className = "" }: { opensAt: Date | null; closesAt: Date | null; className?: string }) {
  if (!opensAt || !closesAt) return <p className={`text-body-s text-muted ${className}`}>Dates to be announced</p>;
  return (
    <p className={`text-body-s text-muted ${className}`}>
      opens <LocalTime iso={opensAt.toISOString()} /> · closes <LocalTime iso={closesAt.toISOString()} />
    </p>
  );
}

export function EventCard({ event }: { event: HackathonView }) {
  const count = event._count.submissions;
  return (
    <Link href={`/hackathons/${event.slug}`} className="group block border border-line bg-surface transition-colors duration-120 hover:border-ink/40">
      <Cover src={event.coverUrl} name={event.title} />
      <div className="space-y-2 border-t border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          {event.theme && <span className="text-label truncate text-muted">theme · {event.theme}</span>}
        </div>
        <h3 className="font-display text-[20px] leading-6 font-bold tracking-[-0.02em] group-hover:underline">{event.title}</h3>
        {event.summary && <p className="line-clamp-2 text-body text-muted">{event.summary}</p>}
        <EventDates opensAt={event.opensAt} closesAt={event.closesAt} />
        <p className="text-count text-muted">
          {count} {count === 1 ? "build" : "builds"}
        </p>
      </div>
    </Link>
  );
}

export function BuildTile({ build, href, note }: { build: BuildCard; href: string; note?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group block h-full border border-line bg-surface transition-colors duration-120 hover:border-ink/40">
        <Cover src={build.coverUrl ?? build.images[0] ?? null} name={build.name} />
        <div className="space-y-1.5 border-t border-line p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 font-display text-[17px] leading-5 font-bold tracking-[-0.01em] break-words group-hover:underline">{build.name}</h3>
            {build.featuredAt && <FeaturedBadge />}
          </div>
          {build.tagline && <p className="line-clamp-2 text-body-s text-muted">{build.tagline}</p>}
          <p className="flex items-center gap-2 pt-1 text-body-s">
            <Avatar seed={build.author.handle ?? build.author.id} src={build.author.image} size={20} />
            <span className="truncate font-semibold">{build.author.name ?? `@${build.author.handle}`}</span>
          </p>
          {note}
        </div>
      </Link>
    </li>
  );
}

/** Editorial highlight: deliberately not a trophy or a rank. */
export function FeaturedBadge() {
  return (
    <span className="text-label inline-flex shrink-0 items-center gap-1 rounded-sm bg-amber px-1.5 py-0.5 text-amber-ink" title="Highlighted by the CastleHub team">
      <Pin className="size-3" /> featured
    </span>
  );
}
