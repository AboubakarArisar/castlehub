import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { devSignIn, signInWithSlack } from "@/actions/auth";
import { devLoginEnabled } from "@/auth";
import { Wordmark } from "@/components/logo";
import { SlackLogo } from "@/components/slack-logo";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "sign in · castlehub" };

const ERRORS: Record<string, string> = {
  AccessDenied: "CastleHub is for members of the SkyCastle Slack. Sign in with your SkyCastle workspace account.",
  OAuthAccountNotLinked: "That email is already linked to another sign-in method.",
  Configuration: "Sign-in isn't configured yet. Please try again later.",
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  if (await getViewer()) redirect("/feed");
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 text-center">
      <Link href="/" className="mx-auto" aria-label="castlehub home">
        <Wordmark />
      </Link>
      <h1 className="text-display-l mt-10">
        come <span className="accent-serif">inside</span>
      </h1>
      <p className="mt-3 text-body-l text-muted">CastleHub uses your SkyCastle Slack account. No new password.</p>

      {message && (
        <p className="mt-6 rounded-sm border border-red px-3 py-2 text-left text-body text-red" role="alert">
          {message}
        </p>
      )}

      <form action={signInWithSlack} className="mt-8">
        <input type="hidden" name="next" value="/feed" />
        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-sm bg-ink px-6 text-body-l font-semibold text-paper shadow-[0_2px_0_var(--cobalt)] transition-transform duration-120 hover:-translate-y-px"
        >
          <SlackLogo /> sign in with slack
        </button>
      </form>
      <p className="mt-3 text-body-s text-muted">
        We read your name, email and photo from Slack. CastleHub never reads your messages.
      </p>

      {devLoginEnabled && (
        <form action={devSignIn} className="mt-10 border border-dashed border-line-strong p-4 text-left">
          <p className="text-label text-muted">development only · dev login</p>
          <label htmlFor="dev-email" className="mt-2 block text-body-s">Email</label>
          <div className="mt-1 flex gap-2">
            <input id="dev-email" name="email" type="email" required className="min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 py-2 text-body" />
            <button type="submit" className="rounded-sm border border-line-strong px-3 text-body-s font-semibold">sign in</button>
          </div>
        </form>
      )}
    </main>
  );
}

