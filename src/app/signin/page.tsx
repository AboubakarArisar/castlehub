import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm, ResetForm } from "@/components/auth-form";
import { Wordmark } from "@/components/logo";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "sign in · castlehub" };

const COPY = {
  login: { lead: "come ", accent: "inside", sub: "Log in with your email and password." },
  signup: { lead: "join the ", accent: "castle", sub: "Create an account with your email." },
  forgot: { lead: "lost your ", accent: "key?", sub: "Answer your security question to set a new password." },
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  if (await getViewer()) redirect("/feed");
  const { mode: m } = await searchParams;
  const mode = m === "signup" || m === "forgot" ? m : "login";
  const copy = COPY[mode];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 text-center">
      <Link href="/" className="mx-auto" aria-label="castlehub home">
        <Wordmark />
      </Link>
      <h1 className="text-display-l mt-10">
        {copy.lead}<span className="accent-serif">{copy.accent}</span>
      </h1>
      <p className="mt-3 text-body-l text-muted">{copy.sub}</p>
      {/* key: switching modes resets the form state */}
      {mode === "forgot" ? <ResetForm /> : <AuthForm key={mode} mode={mode} />}
    </main>
  );
}
