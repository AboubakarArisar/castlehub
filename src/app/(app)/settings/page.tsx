import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { ProfileForm } from "@/components/profile-forms";
import { PageHeader } from "@/components/shell";
import { LocationForm } from "@/components/world/location-form";
import { cityLabel, COUNTRY_OPTIONS, getCity } from "@/lib/places";
import { db } from "@/lib/db";
import { requireBuilder } from "@/lib/session";

export const metadata: Metadata = { title: "settings · castlehub" };

export default async function SettingsPage() {
  const viewer = await requireBuilder();
  const me = await db.user.findUniqueOrThrow({
    where: { id: viewer.id },
    select: { name: true, headline: true, bio: true, website: true, skills: true, image: true, email: true, openToCollab: true, timezone: true, countryCode: true, cityId: true, onWorldMap: true },
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
      <section id="world" aria-labelledby="world-settings-h" className="scroll-mt-24 border-t border-line px-4 py-6 md:px-6">
        <h2 id="world-settings-h" className="text-label text-muted">world map</h2>
        <p className="mt-2 mb-4 max-w-[60ch] text-body-s text-muted">
          Optional. Add your country (and city if you like) to appear on the <Link href="/world" className="text-cobalt hover:underline">World Map</Link>.
          We never use GPS or your IP address, and the map only shows your city or country centre.
        </p>
        <LocationForm
          mode="settings"
          countries={COUNTRY_OPTIONS}
          defaults={{
            countryCode: me.countryCode ?? "",
            cityId: me.cityId,
            cityLabel: getCity(me.cityId) ? cityLabel(getCity(me.cityId)!) : "",
            onWorldMap: me.onWorldMap,
          }}
        />
      </section>
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
