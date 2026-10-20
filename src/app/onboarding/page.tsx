import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/logo";
import { OnboardingForm } from "@/components/profile-forms";
import { requireViewer } from "@/lib/session";

export const metadata: Metadata = { title: "welcome · castlehub" };

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  if (viewer.handle) redirect("/feed");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 text-center">
      <Wordmark className="justify-center" />
      <h1 className="text-display-l mt-10">
        welcome to the <span className="accent-serif">castle</span>
      </h1>
      <p className="mt-3 text-body-l text-muted">Pick the handle people will find you by.</p>
      <OnboardingForm defaultName={viewer.name ?? ""} />
    </main>
  );
}
