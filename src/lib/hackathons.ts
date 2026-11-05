import { z } from "zod";

// Hackathon rules shared by pages, actions and tests. Times are stored and compared in UTC.

export type HackathonStatus = "draft" | "upcoming" | "open" | "closed" | "archived";

type Schedule = {
  publishedAt: Date | null;
  archivedAt: Date | null;
  opensAt: Date | null;
  closesAt: Date | null;
  override: "OPEN" | "CLOSED" | null;
};

/** Where an event is in its lifecycle. Only "open" accepts new builds and member edits. */
export function hackathonStatus(h: Schedule, now = new Date()): HackathonStatus {
  if (!h.publishedAt) return "draft";
  if (h.archivedAt) return "archived";
  if (h.override === "CLOSED") return "closed";
  if (h.override === "OPEN") return "open";
  if (!h.opensAt || !h.closesAt || now < h.opensAt) return "upcoming";
  return now < h.closesAt ? "open" : "closed";
}

export const STATUS_LABEL: Record<HackathonStatus, string> = {
  draft: "draft",
  upcoming: "upcoming",
  open: "accepting builds",
  closed: "submissions closed",
  archived: "archived",
};

// ── Fields ─────────────────────────────────────────────────

const url = z
  .string()
  .trim()
  .max(300, "Keep links under 300 characters")
  .transform((v) => v || null)
  .pipe(z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).nullable());

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => v || null);

/** "2026-11-08T18:00" typed into a UTC field → Date, or null when empty. */
const utcDate = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? new Date(`${v}:00Z`) : new Date(NaN);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Pick a date and time" });
      return z.NEVER;
    }
    return d;
  });

// Static routes under /hackathons that a slug must never shadow.
const RESERVED_SLUGS = new Set(["mine", "new", "edit", "submit", "builds"]);

export const hackathonSchema = z
  .object({
    title: z.string().trim().min(3, "At least 3 characters").max(80, "Keep it under 80 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]$/, "3–60 characters: letters, numbers and dashes, not at the ends")
      .refine((s) => !s.includes("--"), "No double dashes")
      .refine((s) => !RESERVED_SLUGS.has(s), "That address is reserved"),
    summary: text(200),
    brief: z.string().trim().max(10000, "Keep the brief under 10,000 characters"),
    theme: text(80),
    rules: text(5000),
    prizes: text(2000),
    linkUrl: url,
    coverUrl: z.string().trim().transform((v) => v || null),
    opensAt: utcDate,
    closesAt: utcDate,
  })
  .refine((h) => !h.opensAt || !h.closesAt || h.closesAt > h.opensAt, { message: "Closing must be after opening", path: ["closesAt"] });

export type HackathonInput = z.infer<typeof hackathonSchema>;

/** What still stops an event from being published, as { field: message }. Empty = ready. */
export function publishProblems(h: { title: string; brief: string; opensAt: Date | null; closesAt: Date | null }) {
  const out: Record<string, string> = {};
  if (h.title.trim().length < 3) out.title = "Add a title before publishing";
  if (!h.brief.trim()) out.brief = "Write the brief before publishing";
  if (!h.opensAt) out.opensAt = "Set when submissions open";
  if (!h.closesAt) out.closesAt = "Set when submissions close";
  else if (h.opensAt && h.closesAt <= h.opensAt) out.closesAt = "Closing must be after opening";
  return out;
}

/** Comma-separated technologies → clean, de-duplicated list. */
const techList = z
  .string()
  .default("")
  .transform((v) => [...new Set(v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))])
  .pipe(z.array(z.string().max(24, "Each technology is at most 24 characters")).max(10, "Up to 10 technologies"));

export const MAX_SCREENSHOTS = 5;

export const submissionSchema = z
  .object({
    name: z.string().trim().min(2, "Give your build a name (2+ characters)").max(60, "Keep it under 60 characters"),
    tagline: text(100),
    description: text(5000),
    demoUrl: url,
    repoUrl: url,
    videoUrl: url,
    coverUrl: z.string().trim().transform((v) => v || null),
    images: z.array(z.string().trim().min(1)).max(MAX_SCREENSHOTS, `Up to ${MAX_SCREENSHOTS} screenshots`),
    tech: techList,
  })
  .refine((s) => s.demoUrl || s.repoUrl || s.videoUrl, {
    message: "Add at least one link: a live demo, the source code or a demo video",
    path: ["demoUrl"],
  });

export type SubmissionInput = z.infer<typeof submissionSchema>;

/** Read a submission form (also used to re-check what the browser sent). */
export function readSubmission(form: FormData) {
  return submissionSchema.safeParse({
    name: form.get("name") ?? "",
    tagline: form.get("tagline") ?? "",
    description: form.get("description") ?? "",
    demoUrl: form.get("demoUrl") ?? "",
    repoUrl: form.get("repoUrl") ?? "",
    videoUrl: form.get("videoUrl") ?? "",
    coverUrl: form.get("coverUrl") ?? "",
    images: form.getAll("images").map(String).filter(Boolean),
    tech: form.get("tech") ?? "",
  });
}

/** Value for a datetime-local input showing a UTC time ("2026-11-08T18:00"). */
export const toUtcInput = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16) : "");
