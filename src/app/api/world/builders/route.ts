import { NextResponse } from "next/server";
import { getPlaceBuilders } from "@/lib/world";
import { CATEGORIES, type CategoryKey } from "@/lib/world-math";

// Builder cards for one map place, 12 per page. Never cached: hiding yourself takes effect at once.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("place") ?? "";
  const category = (CATEGORIES.find((c) => c.key === url.searchParams.get("category"))?.key ?? null) as CategoryKey | null;
  const page = Math.min(50, Math.max(0, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0));
  const result = await getPlaceBuilders(key, category, page);
  if (!result) return NextResponse.json({ error: "Unknown place" }, { status: 404 });
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
