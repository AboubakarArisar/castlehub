import Link from "next/link";
import { Compass, Home, LogIn, Plus, Rocket, Settings, User } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Mark, Wordmark } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { ProjectIcon } from "@/components/project-row";
import { SlackLogo } from "@/components/slack-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNewBuilders, getProjects } from "@/lib/queries";
import { isoWeek, TYPE_LABEL } from "@/lib/rules";
import { getViewer, type Viewer } from "@/lib/session";

// Desktop ≥1240px: three columns. 768–1239px: icon rail + main. <768px: top bar + bottom bar.
export async function Shell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <div className="mx-auto flex max-w-[1240px] justify-center">
      <LeftNav viewer={viewer} />
      <main className="min-h-dvh w-full max-w-[600px] border-line pb-20 md:border-x md:pb-0">
        <TopBar />
        {children}
      </main>
      <RightColumn viewerId={viewer?.id} />
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

function LeftNav({ viewer }: { viewer: Viewer | null }) {
  const nav = [
    { href: "/feed", label: "feed", icon: Home },
    { href: "/discover", label: "discover", icon: Compass },
    { href: "/launchpad", label: "launchpad", icon: Rocket },
    ...(viewer?.handle ? [{ href: `/${viewer.handle}`, label: "profile", icon: User }] : []),
    ...(viewer ? [{ href: "/settings", label: "settings", icon: Settings }] : []),
  ];
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col items-center gap-2 py-5 md:flex min-[1240px]:w-[248px] min-[1240px]:items-stretch min-[1240px]:px-5"
    >
      <Link href="/" aria-label="castlehub home" className="mb-5 px-1">
        <Mark className="size-8 text-cobalt min-[1240px]:hidden" />
        <Wordmark className="hidden min-[1240px]:inline-flex" />
      </Link>

      <ul className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <li key={label}>
            <NavLink
              href={href}
              title={label}
              className="group flex h-11 items-center gap-3 rounded-sm px-3 text-body text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              <Icon className="size-5 shrink-0 group-aria-[current=page]:text-cobalt" />
              <span className="hidden min-[1240px]:inline">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <Link
        href={viewer ? "/projects/new" : "/signin"}
        aria-label="Publish a project"
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-sm bg-cobalt text-body font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px max-[1239px]:size-11"
      >
        <Plus className="size-5" />
        <span className="hidden min-[1240px]:inline">publish a project</span>
      </Link>

      <div className="mt-auto flex flex-col items-center gap-3 min-[1240px]:items-stretch">
        {viewer ? (
          <div className="flex items-center gap-2.5 border-t border-line pt-4">
            <Link href={viewer.handle ? `/${viewer.handle}` : "/onboarding"} aria-label="Your profile">
              <Avatar seed={viewer.handle ?? viewer.id} src={viewer.image} size={36} />
            </Link>
            <span className="hidden min-w-0 flex-1 min-[1240px]:block">
              <span className="block truncate text-body font-semibold">{viewer.name}</span>
              <span className="block truncate text-body-s text-muted">{viewer.handle ? `@${viewer.handle}` : "pick a handle"}</span>
            </span>
            <ThemeToggle className="hidden min-[1240px]:grid" />
          </div>
        ) : (
          <Link
            href="/signin"
            className="flex h-11 items-center justify-center gap-2 rounded-sm border border-line-strong text-body font-semibold transition-colors duration-120 hover:border-ink max-[1239px]:size-11"
            aria-label="Sign in"
          >
            <SlackLogo className="size-5" />
            <span className="hidden min-[1240px]:inline">sign in with slack</span>
          </Link>
        )}
        <ThemeToggle className={viewer ? "min-[1240px]:hidden" : ""} />
        <p className="text-label hidden text-muted min-[1240px]:block">castlehub · キャッスルハブ</p>
      </div>
    </nav>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm md:hidden">
      <Link href="/" aria-label="castlehub home">
        <Wordmark className="[&>span:last-child]:text-[1.35rem]" />
      </Link>
      <ThemeToggle />
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
    <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 flex-col gap-8 overflow-y-auto px-6 py-6 min-[1240px]:flex">
      <section aria-labelledby="launching-h">
        <div className="flex items-baseline justify-between">
          <h2 id="launching-h" className="text-label text-muted">launching this week</h2>
          <Link href="/launchpad" className="text-body-s text-cobalt hover:underline">launchpad →</Link>
        </div>
        {launching.length === 0 ? (
          <p className="mt-3 border-t border-line pt-3 text-body-s text-muted">
            Nothing launched yet this week.{" "}
            <Link href="/projects/new" className="text-cobalt hover:underline">Be the first.</Link>
          </p>
        ) : (
          <ol className="mt-3 border-t border-line">
            {launching.map((p, i) => (
              <li key={p.id}>
                <Link href={`/${p.owner.handle}/${p.slug}`} className="flex items-center gap-3 border-b border-line py-2.5 hover:bg-surface-2">
                  <span className="text-count w-4 text-muted">{i + 1}</span>
                  <ProjectIcon name={p.name} src={p.iconUrl} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] font-bold tracking-[-0.01em]">{p.name}</span>
                    <span className="text-label text-muted">{TYPE_LABEL[p.type]}</span>
                  </span>
                  <span className="text-count rounded-sm border border-line-strong px-2 py-1">▲ {p._count.upvotes}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {builders.length > 0 && (
        <section aria-labelledby="builders-h">
          <h2 id="builders-h" className="text-label text-muted">new in the castle</h2>
          <ul className="mt-3 space-y-3">
            {builders.map((b) => (
              <li key={b.id}>
                <Link href={`/${b.handle}`} className="flex items-center gap-3 hover:opacity-80">
                  <Avatar seed={b.handle ?? b.id} src={b.image} size={36} />
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

      <section aria-labelledby="slack-h" className="border border-line-strong p-4">
        <h2 id="slack-h" className="text-label text-muted">slack · #builds</h2>
        <p className="mt-2 font-display text-[19px] leading-6 font-extrabold tracking-[-0.03em]">
          share your launches to <span className="accent-serif">#builds</span>
        </p>
        <p className="mt-1.5 text-body-s text-muted">
          Coming soon: post a launch to the SkyCastle Slack with one click. CastleHub only posts when you ask.
        </p>
      </section>
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
