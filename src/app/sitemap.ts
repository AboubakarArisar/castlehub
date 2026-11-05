import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const [projects, builders, hackathons, builds] = await Promise.all([
    db.project.findMany({ select: { slug: true, updatedAt: true, owner: { select: { handle: true } } }, orderBy: { updatedAt: "desc" }, take: 5000 }),
    db.user.findMany({ where: { handle: { not: null }, suspendedAt: null }, select: { handle: true, updatedAt: true }, take: 5000 }),
    db.hackathon.findMany({ where: { publishedAt: { not: null } }, select: { slug: true, updatedAt: true }, take: 500 }),
    db.hackathonSubmission.findMany({
      where: { withdrawnAt: null, hiddenAt: null, hackathon: { publishedAt: { not: null } } },
      select: { id: true, updatedAt: true, hackathon: { select: { slug: true } } },
      take: 5000,
    }),
  ]);
  return [
    ...["", "/feed", "/discover", "/launchpad", "/hackathons"].map((p) => ({ url: base + p })),
    ...projects.map((p) => ({ url: `${base}/${p.owner.handle}/${p.slug}`, lastModified: p.updatedAt })),
    ...hackathons.map((h) => ({ url: `${base}/hackathons/${h.slug}`, lastModified: h.updatedAt })),
    ...builds.map((b) => ({ url: `${base}/hackathons/${b.hackathon.slug}/builds/${b.id}`, lastModified: b.updatedAt })),
    ...builders.map((b) => ({ url: `${base}/${b.handle}`, lastModified: b.updatedAt })),
  ];
}
