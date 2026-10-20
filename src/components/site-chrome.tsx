import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SlackButton } from "@/components/landing-hero";
import { Logo, Wordmark } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Viewer } from "@/lib/session";

const NAV = [
  { href: "/feed", label: "feed" },
  { href: "/discover", label: "discover" },
  { href: "/launchpad", label: "launchpad" },
];

/** One header for the whole site: landing page and app alike. */
export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1080px] items-center gap-6 px-4 md:px-6">
        <Link href="/" aria-label="castlehub home" className="shrink-0">
          <Wordmark className="[&>span:last-child]:text-[1.4rem]" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.href}
              href={n.href}
              className="relative flex h-16 items-center px-3 text-body text-muted transition-colors duration-120 hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-cobalt"
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {viewer ? (
            <>
              <Link
                href="/projects/new"
                className="hidden h-9 items-center gap-1.5 rounded-sm bg-cobalt px-3.5 text-body font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px sm:inline-flex"
              >
                <Plus className="size-4" /> publish
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                title="Settings"
                className="hidden size-9 place-items-center rounded-sm border border-line text-muted transition-colors duration-120 hover:border-line-strong hover:text-ink sm:grid"
              >
                <Settings className="size-4" />
              </Link>
              <Link
                href={viewer.handle ? `/${viewer.handle}` : "/onboarding"}
                aria-label="Your profile"
                className="rounded-sm ring-cobalt transition-shadow hover:ring-2"
              >
                <Avatar seed={viewer.handle ?? viewer.id} src={viewer.image} size={36} />
              </Link>
            </>
          ) : (
            <SlackButton size="sm" />
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-[1080px] gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:items-end md:px-6">
        <div>
          <Logo className="h-10 w-auto md:h-12" />
          <p className="mt-3 max-w-[40ch] text-body-s text-muted">
            Where SkyCastle builders post work in progress, launch projects and find people to build with.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-body-s">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-muted hover:text-ink">
              {n.label}
            </Link>
          ))}
          <Link href="/projects/new" className="text-muted hover:text-ink">publish a project</Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="text-label mx-auto max-w-[1080px] px-4 py-4 text-muted md:px-6">castlehub · キャッスルハブ · made for skycastle builders</p>
      </div>
    </footer>
  );
}
