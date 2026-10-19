import Link from "next/link";
import { Compass, Home, Plus, Rocket, User, Users } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Mark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { builders, launching, me, typeLabel } from "@/lib/demo";

const NAV = [
  { href: "/feed", label: "feed", icon: Home, count: "6 new" },
  { href: "#", label: "discover", icon: Compass },
  { href: "#", label: "launchpad", icon: Rocket, count: "wk 43" },
  { href: "#", label: "builders", icon: Users },
  { href: "#", label: "profile", icon: User },
];

// Desktop ≥1240px: three columns. 768–1239px: icon rail + feed. <768px: top bar + bottom bar.
export function Shell({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1240px] justify-center">
      <LeftNav />
      <main className="min-h-dvh w-full max-w-[600px] border-line pb-20 md:border-x md:pb-0">
        <TopBar />
        <div className="border-b border-line px-4 pt-6 pb-4 md:px-6">{title}</div>
        {children}
      </main>
      <RightColumn />
      <BottomBar />
    </div>
  );
}

function LeftNav() {
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col items-center gap-2 py-5 md:flex min-[1240px]:w-[248px] min-[1240px]:items-stretch min-[1240px]:px-5"
    >
      <Link href="/feed" aria-label="castlehub feed" className="mb-5 px-1">
        <Mark className="size-8 text-cobalt min-[1240px]:hidden" />
        <Wordmark className="hidden min-[1240px]:inline-flex" />
      </Link>

      <ul className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, count }, i) => (
          <li key={label}>
            <Link
              href={href}
              aria-current={i === 0 ? "page" : undefined}
              title={label}
              className="group flex h-11 items-center gap-3 rounded-sm px-3 text-body text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              <Icon className="size-5 shrink-0 group-aria-[current=page]:text-cobalt" />
              <span className="hidden min-[1240px]:inline">{label}</span>
              {count && <span className="text-label ml-auto hidden text-muted min-[1240px]:inline">{count}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="#"
        aria-label="Publish a project"
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-sm bg-cobalt text-body font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px max-[1239px]:size-11"
      >
        <Plus className="size-5" />
        <span className="hidden min-[1240px]:inline">publish a project</span>
      </Link>

      <div className="mt-auto flex flex-col items-center gap-3 min-[1240px]:items-stretch">
        <div className="flex items-center gap-2.5 border-t border-line pt-4">
          <Avatar seed={me.handle} size={36} />
          <span className="hidden min-w-0 flex-1 min-[1240px]:block">
            <span className="block truncate text-body font-semibold">{me.name}</span>
            <span className="block truncate text-body-s text-muted">@{me.handle}</span>
          </span>
          <ThemeToggle className="hidden min-[1240px]:grid" />
        </div>
        <ThemeToggle className="min-[1240px]:hidden" />
        <p className="text-label hidden text-muted min-[1240px]:block">castlehub · キャッスルハブ</p>
      </div>
    </nav>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm md:hidden">
      <Link href="/feed" aria-label="castlehub feed">
        <Wordmark className="[&>span:last-child]:text-[1.35rem]" />
      </Link>
      <ThemeToggle />
    </div>
  );
}

function RightColumn() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 flex-col gap-8 overflow-y-auto px-6 py-6 min-[1240px]:flex">
      <section aria-labelledby="launching-h">
        <div className="flex items-baseline justify-between">
          <h2 id="launching-h" className="text-label text-muted">launching this week</h2>
          <a href="#" className="text-body-s text-cobalt hover:underline">launchpad →</a>
        </div>
        <ol className="mt-3 border-t border-line">
          {launching.map((p, i) => (
            <li key={p.name} className="flex items-center gap-3 border-b border-line py-2.5">
              <span className="text-count w-4 text-muted">{i + 1}</span>
              <span className="grid size-8 place-items-center rounded-sm bg-ink font-display font-extrabold text-paper">
                {p.name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-bold tracking-[-0.01em]">{p.name}</span>
                <span className="text-label text-muted">{typeLabel[p.type]}</span>
              </span>
              <span className="text-count rounded-sm border border-line-strong px-2 py-1">▲ {p.upvotes}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="builders-h">
        <h2 id="builders-h" className="text-label text-muted">builders to meet</h2>
        <ul className="mt-3 space-y-3">
          {builders.map((b) => (
            <li key={b.handle} className="flex items-center gap-3">
              <Avatar seed={b.handle} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{b.name}</span>
                <span className="block truncate text-body-s text-muted">{b.tag}</span>
              </span>
              <button
                type="button"
                className="h-8 rounded-sm border border-line-strong px-3 text-body-s font-semibold transition-colors duration-120 hover:border-ink"
              >
                follow
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="slack-h" className="border border-line-strong p-4">
        <h2 id="slack-h" className="text-label text-muted">slack · optional</h2>
        <p className="mt-2 font-display text-[19px] leading-6 font-extrabold tracking-[-0.03em]">
          share your launches to <span className="accent-serif">#builds</span>
        </p>
        <p className="mt-1.5 text-body-s text-muted">
          Link Slack and post to #builds only when you choose. CastleHub never reads your messages.
        </p>
        <button
          type="button"
          disabled
          className="mt-3 h-9 w-full rounded-sm border border-line-strong text-body-s font-semibold text-muted"
          title="Available in milestone 5"
        >
          link slack · coming in M5
        </button>
      </section>

      <p className="text-label mt-auto text-muted">prototype · all people and posts are demo data</p>
    </aside>
  );
}

function BottomBar() {
  const items = [
    { href: "/feed", label: "feed", icon: Home, current: true },
    { href: "#", label: "discover", icon: Compass },
    { href: "#", label: "publish", icon: Plus, primary: true },
    { href: "#", label: "launchpad", icon: Rocket },
    { href: "#", label: "me", icon: User },
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ href, label, icon: Icon, current, primary }) => (
        <Link
          key={label}
          href={href}
          aria-current={current ? "page" : undefined}
          className="flex flex-col items-center justify-center gap-1 text-muted aria-[current=page]:text-ink"
        >
          {primary ? (
            <span className="-mt-5 grid size-12 place-items-center rounded-sm bg-cobalt text-on-cobalt shadow-[0_2px_0_var(--ink)]">
              <Icon className="size-6" />
            </span>
          ) : (
            <Icon className="size-5" />
          )}
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
