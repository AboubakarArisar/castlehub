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
import { LandingHero } from "@/components/landing-hero";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import preview from "../../public/landing/castlehub-preview.png";

const HIGHLIGHTS = [
  { title: "play it in the feed", body: "Games, videos and tracks run right in the post, so a demo is one click away." },
  { title: "launching this week", body: "The right column keeps the week's launches and new builders in view." },
  { title: "slack when you want it", body: "Share a launch to #builds yourself. Nothing is posted for you." },
];

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
    body: "Upvotes, comments and “ship it” stamps from other builders, plus a profile that shows everything you've made.",
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

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="castlehub home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 md:gap-2">
          <Link href="/feed" className="hidden h-9 items-center rounded-sm px-3 text-body text-muted transition-colors duration-120 hover:text-ink md:inline-flex">
            feed
          </Link>
          <Link href="#how" className="hidden h-9 items-center rounded-sm px-3 text-body text-muted transition-colors duration-120 hover:text-ink md:inline-flex">
            how it works
          </Link>
          <ThemeToggle />
          <Link
            href="/feed"
            className="ml-1 inline-flex h-9 items-center rounded-sm bg-cobalt px-3.5 text-body font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px"
          >
            join the castle
          </Link>
        </nav>
      </header>

      <main>
        <LandingHero />

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

        <section className="mx-auto max-w-[1240px] pt-20 md:px-6 md:pt-28" aria-labelledby="preview-h">
          <div className="flex flex-col gap-3 px-4 md:flex-row md:items-end md:justify-between md:px-0">
            <div>
              <p className="text-label text-muted">the app</p>
              <h2 id="preview-h" className="text-display-l mt-3 max-w-[16ch]">
                a feed that looks like the <span className="accent-serif">work</span>
              </h2>
            </div>
            <Link
              href="/feed"
              className="inline-flex items-center gap-1.5 text-body font-semibold text-cobalt hover:underline"
            >
              try the prototype <ArrowRight className="size-4" />
            </Link>
          </div>
          <figure className="mt-8 overflow-hidden bg-[#16150f] md:border md:border-line-strong">
            <Image
              src={preview}
              alt="Illustration of the CastleHub app floating above the castle: a feed with a playable pixel game post, launches of the week and builders to meet, surrounded by creator photos and art."
              placeholder="blur"
              sizes="(min-width: 1240px) 1188px, 100vw"
              className="h-auto w-full transition-transform duration-700 ease-out hover:scale-[1.015] motion-reduce:transition-none motion-reduce:hover:scale-100"
            />
          </figure>
          <p className="text-label mt-2 px-4 text-muted md:px-0">concept illustration · the live app may differ</p>
          <ul className="mt-6 grid border-t border-line px-4 md:grid-cols-3 md:px-0">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="border-b border-line py-5 md:border-b-0 md:pr-6 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-6">
                <h3 className="text-title-m">{h.title}</h3>
                <p className="mt-1.5 text-body text-muted">{h.body}</p>
              </li>
            ))}
          </ul>
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
              <p className="text-label text-muted">slack · optional</p>
              <p className="text-title-l mt-2">already in the SkyCastle Slack?</p>
              <p className="mt-2 max-w-[60ch] text-body text-muted">
                Link your account and share a launch to #builds with one click. CastleHub only posts when you
                ask, and never reads your messages.
              </p>
            </div>
            <span className="text-label rounded-sm border border-line px-3 py-2 text-muted">coming in milestone 5</span>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 py-24 text-center md:px-6 md:py-32">
          <h2 className="text-display-xl mx-auto max-w-[14ch]">
            your next build deserves an <span className="accent-serif">audience</span>
          </h2>
          <Link
            href="/feed"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-sm bg-cobalt px-6 text-body-l font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px"
          >
            join the castle <ArrowRight className="size-5" />
          </Link>
          <p className="text-label mt-4 text-muted">free for the SkyCastle community</p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <Wordmark />
          <p className="text-label text-muted">castlehub · キャッスルハブ · made for skycastle builders</p>
        </div>
      </footer>
    </div>
  );
}
