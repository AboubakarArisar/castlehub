import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Bot,
  Clapperboard,
  Gamepad2,
  Globe,
  Palette,
} from "lucide-react";
import { LandingHero, SlackButton } from "@/components/landing-hero";
import { Logo, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getViewer } from "@/lib/session";
import castleSky from "../../public/landing/castle-sky.png";

const STEPS = [
  {
    n: "01",
    title: "post the messy middle",
    body: "Share builds in progress: a clip, a track, a screenshot, a question. Builders here want to see the work before it's finished.",
  },
  {
    n: "02",
    title: "launch when it's ready",
    body: "Give your project a page with media and a link. Enter the weekly Launchpad if you like, or just let people find it in Discover.",
  },
  {
    n: "03",
    title: "find your people",
    body: "Upvotes and “ship it” stamps from other builders, plus a profile that shows everything you've made.",
  },
];

const TYPES = [
  { icon: Gamepad2, label: "games", example: "browser games, game jams, mods" },
  { icon: Globe, label: "websites", example: "tools, landing pages, side projects" },
  { icon: Bot, label: "ai tools", example: "agents, bots, model experiments" },
  { icon: AudioLines, label: "music", example: "tracks, synths, audio plugins" },
  { icon: Palette, label: "art", example: "illustration, generative art, 3d" },
  { icon: Clapperboard, label: "video", example: "films, devlogs, animations" },
];

export default async function Landing() {
  const signedIn = Boolean(await getViewer());
  const feedButton = (
    <Link
      href="/feed"
      className="inline-flex h-12 items-center gap-2 rounded-sm bg-cobalt px-6 text-body-l font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px"
    >
      open the feed <ArrowRight className="size-5" />
    </Link>
  );
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="castlehub home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 md:gap-2">
          <Link href="/discover" className="hidden h-9 items-center rounded-sm px-3 text-body text-muted transition-colors duration-120 hover:text-ink md:inline-flex">
            discover
          </Link>
          <Link href="#how" className="hidden h-9 items-center rounded-sm px-3 text-body text-muted transition-colors duration-120 hover:text-ink md:inline-flex">
            how it works
          </Link>
          <ThemeToggle />
          {signedIn ? (
            <Link
              href="/feed"
              className="ml-1 inline-flex h-9 items-center rounded-sm bg-cobalt px-3.5 text-body font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px"
            >
              open the feed
            </Link>
          ) : (
            <span className="ml-1">
              <SlackButton size="sm" />
            </span>
          )}
        </nav>
      </header>

      <main>
        <LandingHero signedIn={signedIn} />

        <section id="how" className="mx-auto max-w-[1240px] scroll-mt-6 px-4 pt-24 md:px-6 md:pt-32">
          <h2 className="text-display-l max-w-[18ch]">
            a place for the <span className="accent-serif">whole</span> build, not just the launch
          </h2>
          <ol className="mt-10 grid border-t border-line md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="border-b border-line py-6 md:border-b-0 md:py-8 md:pr-8 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-8">
                <span className="text-count text-cobalt">{s.n}</span>
                <h3 className="text-title-l mt-3">{s.title}</h3>
                <p className="mt-2 max-w-[42ch] text-body text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pt-20 md:px-6 md:pt-28" aria-labelledby="types-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="types-h" className="text-display-l">made in the castle</h2>
            <p className="text-label text-muted">six kinds of project, one feed</p>
          </div>
          <ul className="mt-8 grid grid-cols-2 border-t border-l border-line md:grid-cols-3">
            {TYPES.map(({ icon: Icon, label, example }) => (
              <li
                key={label}
                className="group border-r border-b border-line p-4 transition-colors duration-150 hover:bg-surface md:p-6"
              >
                <Icon className="size-6 text-muted transition-colors duration-150 group-hover:text-cobalt" />
                <p className="mt-6 font-display text-[22px] leading-6 font-extrabold tracking-[-0.03em] md:text-[28px] md:leading-8">
                  {label}
                </p>
                <p className="mt-1.5 text-body-s text-muted">{example}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pt-20 md:px-6 md:pt-28">
          <div className="grid gap-6 border border-line-strong p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <p className="text-label text-muted">slack</p>
              <p className="text-title-l mt-2">your SkyCastle Slack account is your key</p>
              <p className="mt-2 max-w-[60ch] text-body text-muted">
                Sign in with Slack, no new password. Soon you&apos;ll also be able to share a launch to #builds with
                one click. CastleHub only posts when you ask, and never reads your messages.
              </p>
            </div>
            {signedIn ? feedButton : <SlackButton />}
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] pt-20 pb-24 text-center md:px-6 md:pt-28 md:pb-32">
          <Image
            src={castleSky}
            alt="Illustration: a builder and a black cat on a stone ledge, looking at a castle on floating islands above the clouds."
            placeholder="blur"
            sizes="(min-width: 1080px) 1032px, 100vw"
            className="h-auto w-full md:border md:border-line-strong"
          />
          <div className="px-4 pt-12 md:px-0 md:pt-16">
            <h2 className="text-display-xl mx-auto max-w-[14ch]">
              your next build deserves an <span className="accent-serif">audience</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[48ch] text-body-l text-muted">
              Free for the SkyCastle community. Sign in with the Slack account you already use.
            </p>
            <div className="mt-8">{signedIn ? feedButton : <SlackButton />}</div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <Logo className="h-10 w-auto md:h-12" />
          <p className="text-label text-muted">castlehub · キャッスルハブ · made for skycastle builders</p>
        </div>
      </footer>
    </div>
  );
}
