import "server-only";
import { NextResponse } from "next/server";
import { WallError } from "@/lib/wall-server";

/** Turn WallError into a JSON error response; anything else is a real failure. */
export async function wallRoute(run: () => Promise<unknown>) {
  try {
    const body = await run();
    return NextResponse.json(body ?? { ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof WallError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
