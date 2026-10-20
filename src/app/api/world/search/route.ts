import { NextResponse } from "next/server";
import { searchMapBuilders } from "@/lib/world";

// Builders on the map by name or @handle (8 at most).
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").replace(/^@/, "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ builders: [] });
  return NextResponse.json({ builders: await searchMapBuilders(q) }, { headers: { "cache-control": "no-store" } });
}
