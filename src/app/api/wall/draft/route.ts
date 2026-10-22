import { getViewer } from "@/lib/session";
import { wallRoute } from "@/lib/wall-http";
import { saveDraft, WallError } from "@/lib/wall-server";

// Autosave for your own square. Drafts are private and never shown on the wall.
export async function PUT(request: Request) {
  return wallRoute(async () => {
    if (Number(request.headers.get("content-length") ?? 0) > 1_500_000) throw new WallError("That drawing is too large to save.", 413);
    const text = await request.text();
    if (text.length > 1_500_000) throw new WallError("That drawing is too large to save.", 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new WallError("That drawing couldn't be read.");
    }
    await saveDraft(await getViewer(), (body as { strokes?: unknown })?.strokes);
    return { ok: true, savedAt: new Date().toISOString() };
  });
}
