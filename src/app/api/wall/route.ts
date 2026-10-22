import { NextResponse } from "next/server";
import { getWall, getWallStamp } from "@/lib/wall-server";

// The public wall. Clients poll with ?stamp=<last stamp>: an unchanged wall costs one small
// query and answers 204 with no body; only a changed wall loads and sends the tiles.
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("stamp");
  if (asked && asked === (await getWallStamp()).stamp) return new Response(null, { status: 204 });
  const wall = await getWall();
  return NextResponse.json(wall, { headers: { "cache-control": "no-store" } });
}
