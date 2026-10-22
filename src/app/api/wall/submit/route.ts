import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/session";
import { wallRoute } from "@/lib/wall-http";
import { submitMyTile, WallError } from "@/lib/wall-server";

// Submit your square for review: a 512×512 PNG plus the strokes it was drawn from.
export async function POST(request: Request) {
  return wallRoute(async () => {
    const form = await request.formData().catch(() => null);
    const png = form?.get("png");
    if (!(png instanceof File)) throw new WallError("Missing artwork.");
    let strokes: unknown;
    try {
      strokes = JSON.parse(String(form?.get("strokes") ?? ""));
    } catch {
      throw new WallError("Missing drawing data.");
    }
    await submitMyTile(await getViewer(), new Uint8Array(await png.arrayBuffer()), strokes);
    revalidatePath("/admin/wall");
  });
}
