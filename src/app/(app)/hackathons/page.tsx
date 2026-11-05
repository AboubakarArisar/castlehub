import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/hackathons";
import { PageHeader } from "@/components/shell";
import { listHackathons } from "@/lib/hackathons-server";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "hackathons · castlehub",
  description: "SkyCastle hackathons: see what's open, share your build, and browse everything the community has made.",
};

export default async function HackathonsPage() {
  const [viewer, events] = await Promise.all([getViewer(), listHackathons()]);
  const open = events.filter((e) => e.status === "open");
  const upcoming = events.filter((e) => e.status === "upcoming").reverse(); // soonest first
  const past = events.filter((e) => e.status === "closed" || e.status === "archived");

  return (
    <>
      <PageHeader label="build sprints · every couple of weeks" title={<>hack<span className="accent-serif">athons</span></>}>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[56ch] text-body text-muted">Pick an open hackathon, build something, and share it here. Every build stays in the gallery after the deadline.</p>
          {viewer && (
            <Link href="/hackathons/mine" className="inline-flex h-10 items-center rounded-sm border border-line-strong px-4 text-body font-semibold hover:border-ink">
              my builds
            </Link>
          )}
        </div>
      </PageHeader>

      <Section id="open-h" title="accepting builds now" count={open.length}>
        {open.length === 0 ? (
          <Empty title="nothing open right now">
            {upcoming.length ? "The next hackathon is listed below. Check back when submissions open." : "Keep an eye on #builds for the next one."}
          </Empty>
        ) : (
          <Grid>{open.map((e) => <EventCard key={e.id} event={e} />)}</Grid>
        )}
      </Section>

      <Section id="upcoming-h" title="coming up" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <Empty title="nothing scheduled yet">New hackathons show up here as soon as they&apos;re announced.</Empty>
        ) : (
          <Grid>{upcoming.map((e) => <EventCard key={e.id} event={e} />)}</Grid>
        )}
      </Section>

      <Section id="past-h" title="past hackathons" count={past.length}>
        {past.length === 0 ? (
          <Empty title="no past hackathons yet">Finished hackathons and all their builds stay browsable here.</Empty>
        ) : (
          <Grid>{past.map((e) => <EventCard key={e.id} event={e} />)}</Grid>
        )}
      </Section>
    </>
  );
}

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line px-4 py-6 last:border-b-0 md:px-6">
      <h2 id={id} className="text-title-m">
        {title} <span className="text-count align-middle text-muted">{count}</span>
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong px-4 py-8 text-center">
      <p className="text-title-l">{title}</p>
      <p className="mt-1.5 text-body text-muted">{children}</p>
    </div>
  );
}
