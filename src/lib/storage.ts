import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { db } from "@/lib/db";
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

// Our own Blob store's public host. The token is vercel_blob_rw_<storeId>_<secret>
// and public files live at https://<storeid>.public.blob.vercel-storage.com.
const storeId = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(process.env.BLOB_READ_WRITE_TOKEN ?? "")?.[1]?.toLowerCase();
const isOurBlobHost = (host: string) =>
  storeId ? host === `${storeId}.public.blob.vercel-storage.com` : host.endsWith(".public.blob.vercel-storage.com");

/** Only accept image URLs that our own upload endpoint produced, for this user. */
export function isOwnUpload(url: string, userId: string) {
  if (url.startsWith(LOCAL_PREFIX)) return !useBlob && /^[a-f0-9]{24}\.(png|jpg|gif|webp)$/.test(url.slice(LOCAL_PREFIX.length));
  try {
    const u = new URL(url);
    return u.protocol === "https:" && isOurBlobHost(u.hostname) && u.pathname.startsWith(`/u/${userId}/`);
  } catch {
    return false;
  }
}

// ── Private stored files: voice comments and Castle Wall artwork ──────────
// Stored under unguessable keys that never leave the server: browsers get the bytes through
// CastleHub routes that check permissions first (/api/voice/[id], /api/wall/image/[id]).
// Keys are a Blob URL in production, or "local:<file>" / "local:wall/<file>" in development.

const AUDIO_DIR = path.join(LOCAL_UPLOAD_DIR, "audio");
const LOCAL_KEY = /^(wall\/)?[a-f0-9]{32}\.(webm|ogg|m4a|png)$/;
const localPath = (name: string) => (name.startsWith("wall/") ? path.join(LOCAL_UPLOAD_DIR, name) : path.join(AUDIO_DIR, name));

/** A tile's submitted artwork (PNG). Each submission gets a fresh key, so nothing is overwritten. */
export async function saveWallImage(bytes: Uint8Array, tileId: string): Promise<string> {
  const name = `${randomBytes(16).toString("hex")}.png`;
  if (useBlob) {
    const blob = await put(`wall/${tileId}/${name}`, Buffer.from(bytes), { access: "public", contentType: "image/png", addRandomSuffix: false });
    return blob.url;
  }
  if (process.env.NODE_ENV === "production") throw new UploadError("Uploads are not configured.");
  await mkdir(path.join(LOCAL_UPLOAD_DIR, "wall"), { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, "wall", name), bytes);
  return `local:wall/${name}`;
}

export async function saveAudio(bytes: Uint8Array, userId: string, kind: { mime: string; ext: string }): Promise<string> {
  const name = `${randomBytes(16).toString("hex")}.${kind.ext}`;
  if (useBlob) {
    const blob = await put(`v/${userId}/${name}`, Buffer.from(bytes), { access: "public", contentType: kind.mime, addRandomSuffix: false });
    return blob.url;
  }
  if (process.env.NODE_ENV === "production") throw new UploadError("Uploads are not configured.");
  await mkdir(AUDIO_DIR, { recursive: true });
  await writeFile(path.join(AUDIO_DIR, name), bytes);
  return `local:${name}`;
}

/** Stream a stored file, passing through Range requests so audio players can seek. */
export async function readStored(key: string, range: string | null, mime: string): Promise<Response> {
  if (key.startsWith("local:")) {
    const name = key.slice(6);
    if (!LOCAL_KEY.test(name)) return new Response(null, { status: 404 });
    const file = await readFile(localPath(name)).catch(() => null);
    if (!file) return new Response(null, { status: 404 });
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m && (m[1] || m[2])) {
      const start = m[1] ? Number(m[1]) : Math.max(0, file.length - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), file.length - 1) : file.length - 1;
      return new Response(file.subarray(start, end + 1), {
        status: 206,
        headers: { "content-type": mime, "content-range": `bytes ${start}-${end}/${file.length}`, "accept-ranges": "bytes", "content-length": String(end - start + 1) },
      });
    }
    return new Response(file, { headers: { "content-type": mime, "accept-ranges": "bytes", "content-length": String(file.length) } });
  }
  const upstream = await fetch(key, { headers: range ? { range } : {} });
  const headers = new Headers({ "content-type": mime, "accept-ranges": "bytes" });
  for (const h of ["content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function removeNow(key: string) {
  if (key.startsWith("local:")) {
    if (LOCAL_KEY.test(key.slice(6))) await rm(localPath(key.slice(6)), { force: true });
  }
  else await del(key);
}

/**
 * Delete stored files. Anything that fails goes into a cleanup queue that later uploads and
 * deletions retry, so a storage hiccup never leaves a deleted comment's audio behind for good.
 */
export async function deleteStored(keys: (string | null | undefined)[]) {
  for (const key of keys) {
    if (!key) continue;
    try {
      await removeNow(key);
    } catch (e) {
      await db.storageCleanup
        .upsert({ where: { key }, create: { key, lastError: String(e).slice(0, 300) }, update: { attempts: { increment: 1 }, lastError: String(e).slice(0, 300) } })
        .catch((err) => console.error("could not queue storage cleanup", key, err));
    }
  }
  await retryCleanups();
}

export async function retryCleanups(limit = 5) {
  const pending = await db.storageCleanup.findMany({ where: { attempts: { lt: 20 } }, orderBy: { createdAt: "asc" }, take: limit }).catch(() => []);
  for (const job of pending) {
    try {
      await removeNow(job.key);
      await db.storageCleanup.delete({ where: { id: job.id } });
    } catch (e) {
      await db.storageCleanup.update({ where: { id: job.id }, data: { attempts: { increment: 1 }, lastError: String(e).slice(0, 300) } }).catch(() => {});
    }
  }
}
