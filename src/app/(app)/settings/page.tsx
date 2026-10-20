import type { Metadata } from "next";
import { signOutAction } from "@/actions/auth";
import { ProfileForm } from "@/components/profile-forms";
import { PageHeader } from "@/components/shell";
import { db } from "@/lib/db";
import { requireBuilder } from "@/lib/session";

export const metadata: Metadata = { title: "settings · castlehub" };

export default async function SettingsPage() {
  const viewer = await requireBuilder();
  const me = await db.user.findUniqueOrThrow({
    where: { id: viewer.id },
    select: { name: true, headline: true, bio: true, website: true, skills: true, image: true, email: true, openToCollab: true, timezone: true },
  });

  return (
    <>
      <PageHeader label={`@${viewer.handle}`} title="settings" />
      <ProfileForm
        defaults={{
          name: me.name ?? "",
          headline: me.headline ?? "",
          bio: me.bio ?? "",
          website: me.website ?? "",
          skills: me.skills.join(", "),
          openToCollab: me.openToCollab,
          image: me.image,
          timezone: me.timezone ?? "",
        }}
        zones={Intl.supportedValuesOf("timeZone")}
      />
      <section className="border-t border-line px-4 py-6 md:px-6">
        <p className="text-label text-muted">account</p>
        <p className="mt-2 text-body">Signed in with Slack{me.email ? ` as ${me.email}` : ""}.</p>
        <form action={signOutAction} className="mt-3">
          <button type="submit" className="h-10 rounded-sm border border-line-strong px-4 text-body font-semibold hover:border-ink">
            sign out
          </button>
        </form>
      </section>
    </>
  );
}
