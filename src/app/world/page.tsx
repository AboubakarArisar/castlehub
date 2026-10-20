import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { WorldExplorer } from "@/components/world/world-explorer";
import { db } from "@/lib/db";
import { cityLabel, COUNTRY_OPTIONS, getCity, placeFor } from "@/lib/places";
import { getViewer } from "@/lib/session";
import { getWorld } from "@/lib/world";

export const metadata: Metadata = {
  title: "world map · castlehub",
  description: "The castle has no borders. Explore the people building amazing things around the world.",
};

export default async function WorldPage({ searchParams }: PageProps<"/world">) {
  const [viewer, world, sp] = await Promise.all([getViewer(), getWorld(), searchParams]);
  const me = viewer
    ? await db.user.findUnique({ where: { id: viewer.id }, select: { countryCode: true, cityId: true, onWorldMap: true } })
    : null;
  const city = getCity(me?.cityId);
  const place = me?.onWorldMap ? placeFor(me.countryCode, me.cityId) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      <main className="flex-1 pb-16 md:pb-0">
        <WorldExplorer
          markers={world.markers}
          arcs={world.arcs}
          stats={world.stats}
          countries={COUNTRY_OPTIONS}
          initialPlace={typeof sp.place === "string" ? sp.place : null}
          viewer={{
            signedIn: Boolean(viewer),
            builder: Boolean(viewer?.handle && !viewer.suspendedAt),
            placeLabel: place?.label ?? null,
            location: {
              countryCode: me?.countryCode ?? "",
              cityId: me?.cityId ?? null,
              cityLabel: city ? cityLabel(city) : "",
              onWorldMap: Boolean(me?.onWorldMap),
            },
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
