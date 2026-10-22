// Castle Wall rules shared by the server, the editor and tests. No database, no DOM.
import { z } from "zod";

/** Each tile is drawn on a 512 × 512 canvas. */
export const TILE_PX = 512;
/** The wall starts 12 × 12 and grows by 4 in each direction once it's 80% claimed. */
export const START_SIDE = 12;

export function wallSide(claimed: number) {
  let side = START_SIDE;
  while (claimed >= side * side * 0.8) side += 4;
  return side;
}

export const MAX_STROKES = 2000;
export const MAX_POINTS = 60_000; // across all strokes
export const MAX_PNG_BYTES = 600 * 1024;

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const coord = z.number().int().min(-64).max(TILE_PX + 64);

/** A stroke: colour, width, eraser flag and a flat [x, y, x, y, …] list of integer points. */
export const strokeSchema = z.object({
  c: hex,
  w: z.number().int().min(1).max(96),
  e: z.boolean().optional(),
  p: z.array(coord).min(2).max(20_000).refine((p) => p.length % 2 === 0, "Points come in pairs"),
});
export type Stroke = z.infer<typeof strokeSchema>;

export const strokesSchema = z
  .array(strokeSchema)
  .max(MAX_STROKES, `Up to ${MAX_STROKES} strokes`)
  .refine((s) => s.reduce((n, x) => n + x.p.length / 2, 0) <= MAX_POINTS, `Up to ${MAX_POINTS.toLocaleString("en")} points`);

/** Width and height of a PNG, read from its header; null if it isn't a PNG. */
export function pngSize(b: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || sig.some((v, i) => b[i] !== v)) return null;
  if (String.fromCharCode(b[12], b[13], b[14], b[15]) !== "IHDR") return null;
  const view = new DataView(b.buffer, b.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export const REPORT_REASONS = [
  { key: "INAPPROPRIATE", label: "Inappropriate or explicit" },
  { key: "OFFENSIVE", label: "Hateful or offensive" },
  { key: "SPAM", label: "Spam or advertising" },
  { key: "COPIED", label: "Copied someone else's art" },
  { key: "OTHER", label: "Something else" },
] as const;

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS.map((r) => r.key) as [string, ...string[]]),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

/** Public state of a square, as the wall shows it. */
export type TileState = "available" | "claimed" | "published" | "hidden";

/** Draw strokes onto a 2D context (used by the editor, previews and the PNG render). */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], scale = 1) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.globalCompositeOperation = s.e ? "destination-out" : "source-over";
    ctx.strokeStyle = s.c;
    ctx.fillStyle = s.c;
    ctx.lineWidth = s.w * scale;
    const p = s.p;
    if (p.length === 2) {
      ctx.beginPath();
      ctx.arc(p[0] * scale, p[1] * scale, (s.w * scale) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // Smooth through the midpoints of successive points (quadratic curves).
    ctx.beginPath();
    ctx.moveTo(p[0] * scale, p[1] * scale);
    for (let i = 2; i < p.length - 2; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2;
      const my = (p[i + 1] + p[i + 3]) / 2;
      ctx.quadraticCurveTo(p[i] * scale, p[i + 1] * scale, mx * scale, my * scale);
    }
    ctx.lineTo(p[p.length - 2] * scale, p[p.length - 1] * scale);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}
