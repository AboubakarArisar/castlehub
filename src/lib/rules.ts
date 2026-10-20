import { z } from "zod";

// ── Handles ────────────────────────────────────────────────

// Top-level routes a handle must never shadow.
export const RESERVED_HANDLES = new Set([
  "api", "post", "feed", "discover", "launchpad", "projects", "settings", "signin", "signout",
  "onboarding", "builders", "admin", "suspended", "search", "notifications", "about", "help", "terms", "privacy", "new", "edit",
  "castlehub", "skycastle", "slack", "uploads", "_next", "static", "public",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/, "3–30 characters: letters, numbers and dashes, not at the ends")
  .refine((h) => !h.includes("--"), "No double dashes")
  .refine((h) => !RESERVED_HANDLES.has(h), "That handle is reserved");

// ── Shared fields ──────────────────────────────────────────

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .transform((v) => v || undefined)
  .pipe(z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).optional());

/** Comma-separated list → clean lowercase array. */
const csvList = (max: number, itemMax: number, label: string) =>
  z
    .string()
    .default("")
    .transform((v) =>
      [...new Set(v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))],
    )
    .pipe(
      z
        .array(z.string().max(itemMax, `Each ${label} is at most ${itemMax} characters`))
        .max(max, `Up to ${max} ${label}s`),
    );

/** "@troy, raqib" → ["troy", "raqib"]: handles typed into the collaborators field. */
export const collaboratorsField = z
  .string()
  .default("")
  .transform((v) => [...new Set(v.split(/[\s,]+/).map((h) => h.replace(/^@/, "").trim().toLowerCase()).filter(Boolean))])
  .pipe(z.array(z.string().max(30)).max(5, "Up to 5 collaborators"));

// ── Forms ──────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Add your name").max(60),
  headline: z.string().trim().max(80).optional().transform((v) => v || null),
  bio: z.string().trim().max(500).optional().transform((v) => v || null),
  website: optionalUrl.transform((v) => v ?? null),
  skills: csvList(10, 24, "skill"),
  image: z.string().trim().optional().transform((v) => v || null),
  openToCollab: z.boolean(),
});

export const PROJECT_TYPES = ["GAME", "WEBSITE", "AI_TOOL", "MUSIC", "ART", "VIDEO", "OTHER"] as const;
export type ProjectTypeKey = (typeof PROJECT_TYPES)[number];

export const TYPE_LABEL: Record<ProjectTypeKey, string> = {
  GAME: "game",
  WEBSITE: "website",
  AI_TOOL: "ai tool",
  MUSIC: "music",
  ART: "art",
  VIDEO: "video",
  OTHER: "other",
};

export const projectSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(60),
  tagline: z.string().trim().min(3, "At least 3 characters").max(60, "Keep it under 60 characters"),
  description: z.string().trim().min(10, "Say a little more (10+ characters)").max(5000),
  type: z.enum(PROJECT_TYPES, { message: "Pick a type" }),
  tags: csvList(5, 24, "tag"),
  websiteUrl: optionalUrl,
  mediaUrl: optionalUrl,
  iconUrl: z.string().trim().optional().transform((v) => v || undefined),
  images: z.array(z.string().trim().min(1)).max(4, "Up to 4 images"),
  launch: z.boolean(),
  collaborators: collaboratorsField,
});

export const postSchema = z
  .object({
    body: z.string().trim().max(2000, "Posts are up to 2000 characters"),
    imageUrl: z.string().trim().optional().transform((v) => v || undefined),
    projectId: z.string().trim().optional().transform((v) => v || undefined),
  })
  .refine((p) => p.body.length > 0 || p.imageUrl, { message: "Write something or add an image", path: ["body"] });

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first").max(1000, "Comments are up to 1000 characters"),
});

// ── Helpers ────────────────────────────────────────────────

export function slugify(input: string) {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "project";
}

/** ISO-8601 week label for a date, e.g. "2026-W43". Weeks start Monday (UTC). */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday–Sunday range (UTC) of an ISO week label, or null if malformed. */
export function weekRange(label: string) {
  const m = /^(\d{4})-W(\d{2})$/.exec(label);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
  if (isoWeek(monday) !== label) return null;
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { monday, sunday };
}

export function shiftWeek(label: string, by: number) {
  const r = weekRange(label);
  if (!r) return isoWeek();
  const d = new Date(r.monday);
  d.setUTCDate(d.getUTCDate() + by * 7);
  return isoWeek(d);
}

/** Detect an allowed image type from its first bytes (never trust the file name). */
export function sniffImage(bytes: Uint8Array): { ext: string; type: string } | null {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { ext: "gif", type: "image/gif" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return { ext: "webp", type: "image/webp" };
  return null;
}

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request limit

/** Embeddable player URL for YouTube or Vimeo links, else null. */
export function embedUrl(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    const yt = host === "youtube.com" ? u.searchParams.get("v") : host === "youtu.be" ? u.pathname.slice(1) : null;
    if (yt && /^[\w-]{11}$/.test(yt)) return `https://www.youtube-nocookie.com/embed/${yt}`;
    if (host === "vimeo.com" && /^\/\d+$/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {}
  return null;
}

/** Lowercase @handles mentioned in a text (same pattern RichText links), at most 10. */
export function mentionedHandles(text: string) {
  const found = new Set<string>();
  for (const m of text.matchAll(/(?<![\w@/])@([a-z0-9][a-z0-9-]{1,28}[a-z0-9])(?![\w-])/gi)) found.add(m[1].toLowerCase());
  return [...found].slice(0, 10);
}

/** Short relative time: "now", "5m", "3h", "2d", then a date. */
export function timeAgo(date: Date, now = new Date()) {
  const s = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Flatten a ZodError into { field: firstMessage }. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
