import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/session";
import { wallRoute } from "@/lib/wall-http";
import { claimTile, WallError } from "@/lib/wall-server";

export async function POST(request: Request) {
  return wallRoute(async () => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new WallError("Missing square.");
    const tile = await claimTile(await getViewer(), Number(body.x), Number(body.y));
    revalidatePath("/castle-wall");
    return { ok: true, tile };
  });
}
