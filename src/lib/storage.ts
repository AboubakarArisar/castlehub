import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/rules";

// Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production); otherwise a local
// ./uploads folder served by /api/uploads/[name] (development only).
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");
const LOCAL_PREFIX = "/api/uploads/";

export class UploadError extends Error {}

export async function saveImage(file: File, userId: string): Promise<string> {
  if (file.size === 0) throw new UploadError("That file is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Images must be 4 MB or smaller.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new UploadError("Use a PNG, JPG, GIF or WebP image.");

  const name = `${randomBytes(12).toString("hex")}.${kind.ext}`;
  if (useBlob) {
    const blob = await put(`u/${userId}/${name}`, Buffer.from(bytes), {
      access: "public",
      contentType: kind.type,
    });
    return blob.url;
  }
  if (process.env.NODE_ENV === "production") throw new UploadError("Uploads are not configured.");
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), bytes);
  return LOCAL_PREFIX + name;
}

/** Only accept image URLs that our own upload endpoint produced. */
export function isOwnUpload(url: string) {
  if (url.startsWith(LOCAL_PREFIX)) return !useBlob && /^[a-f0-9]{24}\.(png|jpg|gif|webp)$/.test(url.slice(LOCAL_PREFIX.length));
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith("/u/");
  } catch {
    return false;
  }
}
