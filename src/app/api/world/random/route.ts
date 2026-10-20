import { NextResponse } from "next/server";
import { randomMapBuilder } from "@/lib/world";
import { CATEGORIES, type CategoryKey } from "@/lib/world-math";

// "Explore a random builder": one opted-in builder and their map place.
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("category");
  const category = (CATEGORIES.find((c) => c.key === raw)?.key ?? null) as CategoryKey | null;
  return NextResponse.json({ builder: await randomMapBuilder(category) }, { headers: { "cache-control": "no-store" } });
}
