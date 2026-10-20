import Link from "next/link";
import { Compass, Home, LogIn, Plus, Rocket, User } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { NavLink } from "@/components/nav-link";
import { ProjectIcon } from "@/components/project-row";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getNewBuilders, getProjects } from "@/lib/queries";
import { isoWeek, TYPE_LABEL } from "@/lib/rules";
import { getViewer, type Viewer } from "@/lib/session";

// Header on top, then a centred main column with a context column beside it
// (≥1024px), then the footer. Phones get a bottom tab bar instead of header links.
export async function Shell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-8 px-0 pt-0 md:px-6 md:pt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <main className="min-w-0 self-start border-line bg-paper md:border">{children}</main>
        <RightColumn viewerId={viewer?.id} />
      </div>
      <div className="pb-16 md:pb-0">
        <SiteFooter />
      </div>
      <BottomBar viewer={viewer} />
    </div>
  );
}

export function PageHeader({ label, title, children }: { label?: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line px-4 pt-6 pb-4 md:px-6">
      {label && <p className="text-label mb-2 text-muted">{label}</p>}
      <h1 className="text-display-l">{title}</h1>
      {children}
    </div>
  );
}

async function RightColumn({ viewerId }: { viewerId?: string }) {
  const week = isoWeek();
  const [launching, builders] = await Promise.all([
    getProjects({ viewerId, launchWeek: week, take: 3 }),
    getNewBuilders(3),
  ]);
  return (
    <aside className="hidden flex-col gap-6 lg:flex">
      <div className="sticky top-24 flex flex-col gap-6">
        <section aria-labelledby="launching-h" className="border border-line p-4">
          <div className="flex items-baseline justify-between">
            <h2 id="launching-h" className="text-label text-muted">launching this week</h2>
            <Link href="/launchpad" className="text-body-s text-cobalt hover:underline">all →</Link>
          </div>
          {launching.length === 0 ? (
            <p className="mt-3 text-body-s text-muted">
              Nothing launched yet this week.{" "}
              <Link href="/projects/new" className="text-cobalt hover:underline">Be the first.</Link>
            </p>
          ) : (
            <ol className="mt-2">
              {launching.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/${p.owner.handle}/${p.slug}`} className="-mx-2 flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-surface-2">
                    <span className="text-count w-3 text-muted">{i + 1}</span>
                    <ProjectIcon name={p.name} src={p.iconUrl} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-bold tracking-[-0.01em]">{p.name}</span>
                      <span className="text-label text-muted">{TYPE_LABEL[p.type]}</span>
                    </span>
                    <span className="text-count">▲ {p._count.upvotes}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {builders.length > 0 && (
          <section aria-labelledby="builders-h" className="border border-line p-4">
            <h2 id="builders-h" className="text-label text-muted">new in the castle</h2>
            <ul className="mt-2">
              {builders.map((b) => (
                <li key={b.id}>
                  <Link href={`/${b.handle}`} className="-mx-2 flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-surface-2">
                    <Avatar seed={b.handle ?? b.id} src={b.image} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold">{b.name}</span>
                      <span className="block truncate text-body-s text-muted">{b.headline ?? `@${b.handle}`}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="slack-h" className="border border-line p-4">
          <h2 id="slack-h" className="text-label text-muted">slack · #builds</h2>
          <p className="mt-2 font-display text-[18px] leading-6 font-extrabold tracking-[-0.03em]">
            share your launches to <span className="accent-serif">#builds</span>
          </p>
          <p className="mt-1.5 text-body-s text-muted">Coming soon: post a launch to the SkyCastle Slack with one click.</p>
        </section>
      </div>
    </aside>
  );
}

function BottomBar({ viewer }: { viewer: Viewer | null }) {
  const items = [
    { href: "/feed", label: "feed", icon: Home },
    { href: "/discover", label: "discover", icon: Compass },
    { href: viewer ? "/projects/new" : "/signin", label: "publish", icon: Plus, primary: true },
    { href: "/launchpad", label: "launchpad", icon: Rocket },
    viewer?.handle
      ? { href: `/${viewer.handle}`, label: "me", icon: User }
      : { href: viewer ? "/onboarding" : "/signin", label: viewer ? "me" : "sign in", icon: viewer ? User : LogIn },
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ href, label, icon: Icon, primary }) => (
        <NavLink key={label} href={href} className="flex flex-col items-center justify-center gap-1 text-muted aria-[current=page]:text-ink">
          {primary ? (
            <span className="-mt-5 grid size-12 place-items-center rounded-sm bg-cobalt text-on-cobalt shadow-[0_2px_0_var(--ink)]">
              <Icon className="size-6" />
            </span>
          ) : (
            <Icon className="size-5" />
          )}
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
