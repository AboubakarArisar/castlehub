import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/session";
import { wallRoute } from "@/lib/wall-http";
import { releaseMyTile } from "@/lib/wall-server";

// Release your own square (and delete its artwork).
export async function DELETE() {
  return wallRoute(async () => {
    await releaseMyTile(await getViewer());
    revalidatePath("/castle-wall");
  });
}
