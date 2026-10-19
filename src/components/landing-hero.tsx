import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Home, Plus, Rocket, Search, User, Users } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Mark } from "@/components/logo";
import { MediaWindow } from "@/components/media";
import { Post } from "@/components/post";
import { builders, launching, posts, typeLabel, type Media } from "@/lib/demo";
import castleSky from "../../public/landing/castle-sky.png";

// The landing hero: centred headline, then a live CastleHub window floating
// over the castle, with demo media windows pinned around it (desktop only).
export function LandingHero() {
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      />

      <div className="relative mx-auto max-w-[1240px] px-4 pt-12 text-center md:px-6 md:pt-20">
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-1.5 transition-colors duration-120 hover:border-line-strong"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-green" />
          </span>
          <span className="text-label text-muted">for skycastle builders · キャッスルハブ</span>
          <ArrowRight className="size-3.5 text-muted" />
        </Link>

        <h1 className="mx-auto mt-6 max-w-[14ch] font-display text-[3rem] leading-[0.95] font-extrabold tracking-[-0.05em] text-balance md:text-[5.5rem]">
          show the castle what you&apos;re <span className="accent-serif">building</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[54ch] text-body-l text-muted">
          A social home for the SkyCastle community. Post work in progress, launch projects, and get
          seen by people who build too: games, websites, AI tools, music, art and video.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/feed"
            className="inline-flex h-12 items-center gap-2 rounded-sm bg-cobalt px-6 text-body-l font-semibold text-on-cobalt shadow-[0_2px_0_var(--ink)] transition-transform duration-120 hover:-translate-y-px active:translate-y-px active:shadow-none"
          >
            join the castle <ArrowRight className="size-5" />
          </Link>
          <Link
            href="/feed"
            className="inline-flex h-12 items-center rounded-sm border border-line-strong bg-surface px-6 text-body-l font-semibold transition-colors duration-120 hover:border-ink"
          >
            look around
          </Link>
        </div>
        <p className="text-label mt-4 text-muted">free for the skycastle community</p>
      </div>

      <Stage />
    </section>
  );
}

function Stage() {
  return (
    <div className="relative mx-auto mt-14 h-[600px] max-w-[1240px] md:mt-20 md:h-[720px] md:px-6">
      <div className="absolute inset-0 overflow-hidden md:inset-x-6 md:border md:border-line-strong">
        <Image
          src={castleSky}
          alt="Illustration: a builder and a black cat on a stone ledge, looking at a castle on floating islands above the clouds."
          priority
          placeholder="blur"
          fill
          sizes="(min-width: 1240px) 1188px, 100vw"
          className="object-cover object-[60%_30%]"
        />
      </div>

      <AppWindow />

      {/* Pinned demo windows and stickers, HeyClicky-style collage. Desktop only. */}
      <Float className="top-[30px] left-[0.5%] w-[360px] -rotate-[4deg]">
        <MediaWindow media={posts[1].media as Media} />
      </Float>
      <Float className="bottom-0 left-[1%] w-[200px] rotate-[3deg]">
        <MediaWindow media={posts[3].media as Media} />
      </Float>
      <Float className="right-[3%] bottom-[90px] -rotate-[5deg]">
        <span className="flex items-center gap-2 bg-amber px-3 py-2 text-amber-ink shadow-[0_2px_0_var(--ink)]">
          <span className="text-count">▲ 77</span>
          <span className="font-display text-[15px] font-bold tracking-[-0.01em]">bugscout · #1 this week</span>
        </span>
      </Float>
      <Float className="top-[70px] right-[6%] rotate-[7deg]">
        <span className="block bg-cobalt px-3 py-1.5 font-mono text-[12px] tracking-[0.12em] text-on-cobalt uppercase shadow-[0_2px_0_var(--ink)]">
          ship it!
        </span>
      </Float>
      <p className="text-label absolute -bottom-7 left-4 text-muted md:left-6">live demo · all content is demo data</p>
    </div>
  );
}

function Float({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div
      className={`absolute z-20 hidden shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)] transition-transform duration-300 ease-out hover:-translate-y-1 hover:rotate-0 lg:block ${className}`}
    >
      {children}
    </div>
  );
}

// A real, scrollable slice of the CastleHub feed in a window frame.
function AppWindow() {
  return (
    <div className="absolute inset-x-3 top-[56px] bottom-0 z-10 mx-auto flex max-w-[980px] flex-col border border-line-strong bg-paper shadow-[0_30px_80px_-24px_rgb(0_0_0/0.55)] [mask-image:linear-gradient(to_bottom,black_88%,transparent)] md:inset-x-6 md:top-[120px]">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-red" />
          <span className="size-2.5 rounded-full bg-amber" />
          <span className="size-2.5 rounded-full bg-green" />
        </span>
        <span className="mx-auto flex h-6 w-full max-w-[340px] items-center justify-center gap-1.5 rounded-sm border border-line bg-paper font-mono text-[11px] text-muted">
          <Search className="size-3" /> castlehub.app/feed
        </span>
        <span className="text-label hidden text-muted sm:block">try it ↓</span>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[180px_minmax(0,1fr)_230px]">
        <nav aria-label="Demo app menu" className="hidden flex-col gap-0.5 border-r border-line p-3 lg:flex">
          <span className="mb-3 flex items-center gap-1.5 px-2 font-display text-[18px] font-extrabold tracking-[-0.05em]">
            <Mark className="size-5 text-cobalt" /> castlehub
          </span>
          {[
            { icon: Home, label: "feed", on: true },
            { icon: Compass, label: "discover" },
            { icon: Rocket, label: "launchpad" },
            { icon: Users, label: "builders" },
            { icon: User, label: "profile" },
          ].map(({ icon: Icon, label, on }) => (
            <span
              key={label}
              className={`flex h-9 items-center gap-2.5 rounded-sm px-2 text-body-s ${on ? "bg-surface-2 font-semibold text-ink" : "text-muted"}`}
            >
              <Icon className={`size-4 ${on ? "text-cobalt" : ""}`} /> {label}
            </span>
          ))}
          <span className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-sm bg-cobalt text-body-s font-semibold text-on-cobalt">
            <Plus className="size-4" /> publish
          </span>
        </nav>

        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="border-b border-line px-4 py-3 md:px-6">
            <p className="font-display text-[22px] leading-6 font-extrabold tracking-[-0.04em]">
              what&apos;s <span className="accent-serif">shipping</span>
            </p>
          </div>
          {posts.map((p) => (
            <Post key={p.id} post={p} />
          ))}
        </div>

        <aside className="hidden flex-col gap-5 border-l border-line p-4 lg:flex">
          <div>
            <p className="text-label text-muted">launching this week</p>
            <ol className="mt-2">
              {launching.map((p, i) => (
                <li key={p.name} className="flex items-center gap-2 border-b border-line py-2">
                  <span className="text-count w-3 text-muted">{i + 1}</span>
                  <span className="grid size-7 place-items-center rounded-sm bg-ink font-display text-sm font-extrabold text-paper">
                    {p.name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[14px] leading-4 font-bold">{p.name}</span>
                    <span className="font-mono text-[9px] tracking-[0.1em] text-muted uppercase">{typeLabel[p.type]}</span>
                  </span>
                  <span className="text-count text-[11px]">▲ {p.upvotes}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-label text-muted">builders to meet</p>
            <ul className="mt-2 space-y-2.5">
              {builders.map((b) => (
                <li key={b.handle} className="flex items-center gap-2">
                  <Avatar seed={b.handle} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-s font-semibold">{b.name}</span>
                    <span className="block truncate text-[11px] text-muted">{b.tag}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
