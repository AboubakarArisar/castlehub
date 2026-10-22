import { getViewer } from "@/lib/session";
import { reportSchema } from "@/lib/wall";
import { wallRoute } from "@/lib/wall-http";
import { reportTile, WallError } from "@/lib/wall-server";

export async function POST(request: Request) {
  return wallRoute(async () => {
    const body = await request.json().catch(() => null);
    const parsed = reportSchema.safeParse(body ?? {});
    if (!parsed.success || typeof body?.tileId !== "string" || !/^[\w-]{1,40}$/.test(body.tileId)) throw new WallError("Pick a reason for the report.");
    await reportTile(await getViewer(), body.tileId, parsed.data.reason, parsed.data.note);
  });
}
