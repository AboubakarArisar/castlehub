import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/settings", "/onboarding", "/suspended"] },
    sitemap: new URL("/sitemap.xml", process.env.AUTH_URL ?? "https://castlehub.aboubakarisar.tech").toString(),
  };
}
