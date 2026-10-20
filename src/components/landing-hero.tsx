import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlackLogo } from "@/components/slack-logo";
import preview from "../../public/landing/castlehub-preview.png";

// Centred headline, then one hero image: the CastleHub concept illustration.
export function LandingHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      />

      <div className="relative mx-auto max-w-[1080px] px-4 pt-12 text-center md:px-6 md:pt-20">
        <Link
          href="/discover"
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
          {signedIn ? (
            <Link
              href="/feed"
              className="inline-flex h-12 items-center gap-2 rounded-sm bg-cobalt px-6 text-body-l font-semibold text-on-cobalt shadow-[0_2px_0_var(--ink)] transition-transform duration-120 hover:-translate-y-px"
            >
              open the feed <ArrowRight className="size-5" />
            </Link>
          ) : (
            <SlackButton />
          )}
          <Link
            href="/discover"
            className="inline-flex h-12 items-center rounded-sm border border-line-strong bg-surface px-6 text-body-l font-semibold transition-colors duration-120 hover:border-ink"
          >
            explore projects
          </Link>
        </div>
        <p className="text-label mt-4 text-muted">uses your skycastle slack account</p>
      </div>

      <figure className="relative mx-auto mt-14 max-w-[1080px] md:mt-20 md:px-6">
        <Image
          src={preview}
          alt="Concept illustration of CastleHub: a feed with a playable pixel game post, this week's launches and builders to meet, floating above the castle."
          priority
          placeholder="blur"
          sizes="(min-width: 1080px) 1032px, 100vw"
          className="h-auto w-full md:border md:border-line-strong md:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.45)]"
        />
        <figcaption className="text-label mt-2 px-4 text-muted md:px-0">concept illustration · the live app may differ</figcaption>
      </figure>
    </section>
  );
}

/** The main call to action for signed-out visitors: Slack mark + label. */
export function SlackButton({ size = "lg" }: { size?: "lg" | "sm" }) {
  const big = size === "lg";
  return (
    <Link
      href="/signin"
      className={`inline-flex items-center rounded-sm bg-ink font-semibold text-paper shadow-[0_2px_0_var(--cobalt)] transition-transform duration-120 hover:-translate-y-px active:translate-y-px active:shadow-none ${
        big ? "h-12 gap-3 px-6 text-body-l" : "h-9 gap-2 px-3.5 text-body"
      }`}
    >
      <SlackLogo className={big ? "size-5" : "size-4"} /> sign in with slack
    </Link>
  );
}
