import { NextResponse } from "next/server";
import { spin } from "@/lib/roulette-server";
import { spinRequest } from "@/lib/roulette";
import { getViewer } from "@/lib/session";

// One Builder/Project Roulette spin. POST because it records a (private) discovery for signed-in builders.
export async function POST(request: Request) {
  const parsed = spinRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid spin" }, { status: 400 });
  const viewer = await getViewer();
  const result = await spin(parsed.data, viewer?.id ?? null);
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
