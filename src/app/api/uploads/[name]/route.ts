import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_UPLOAD_DIR } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

// Serves development uploads from ./uploads. Production uses Vercel Blob URLs.
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const match = /^[a-f0-9]{24}\.(png|jpg|gif|webp)$/.exec(name);
  if (!match || process.env.BLOB_READ_WRITE_TOKEN) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(LOCAL_UPLOAD_DIR, name));
    return new Response(bytes, {
      headers: {
        "content-type": TYPES[match[1]],
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
