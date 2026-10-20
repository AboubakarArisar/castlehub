import { NextResponse } from "next/server";
import { cityLabel, searchCities } from "@/lib/places";

// City suggestions for the location picker (public place data, no user information).
export function GET(request: Request) {
  const url = new URL(request.url);
  const cc = (url.searchParams.get("country") ?? "").toUpperCase();
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  const cities = searchCities(cc, q).map((c) => ({ id: c.id, label: cityLabel(c) }));
  return NextResponse.json({ cities }, { headers: { "cache-control": "public, max-age=3600" } });
}
