// World Map maths shared by the globe, the server and tests. No DOM, no database.

const RAD = Math.PI / 180;
/** cobe's globe radius; markers sit slightly above it. */
const RADIUS = 0.8;

/** Same lat/lng → 3D mapping cobe uses for its markers (cobe/dist U()). */
function toXYZ(lat: number, lng: number): [number, number, number] {
  const la = lat * RAD;
  const lo = lng * RAD - Math.PI;
  const c = Math.cos(la);
  return [-c * Math.cos(lo), Math.sin(la), c * Math.sin(lo)];
}

/**
 * Screen position (0–1 of the canvas) of a lat/lng for the globe's current rotation,
 * matching cobe's own projection (cobe/dist O()), so HTML markers sit exactly on its dots.
 */
export function project(lat: number, lng: number, phi: number, theta: number, scale = 1, aspect = 1, elevation = 0.02) {
  const r = RADIUS + elevation;
  const [x, y, z] = toXYZ(lat, lng).map((v) => v * r);
  const cp = Math.cos(phi), sp = Math.sin(phi), ct = Math.cos(theta), st = Math.sin(theta);
  const c = cp * x + sp * z;
  const s = sp * st * x + ct * y - cp * st * z;
  const depth = -sp * ct * x + st * y + cp * ct * z;
  return { x: ((c / aspect) * scale + 1) / 2, y: (-s * scale + 1) / 2, visible: depth >= 0, depth };
}

/** Rotation that brings a location to the front and centre of the globe. */
export function anglesFor(lat: number, lng: number) {
  return { phi: -Math.PI / 2 - lng * RAD, theta: lat * RAD };
}

/** Shortest equivalent of `to` relative to `from`, so flights never spin the long way round. */
export function nearestAngle(from: number, to: number) {
  const full = Math.PI * 2;
  return from + ((((to - from) % full) + full + Math.PI) % full) - Math.PI;
}

/** Great-circle distance in degrees. */
export function angularDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / RAD;
}

/**
 * Merge places closer than `degrees` into clusters, biggest first, so the globe never
 * shows a pile of overlapping beacons. Zooming in lowers `degrees` and splits them again.
 */
export function clusterPlaces<P extends { key: string; lat: number; lng: number; count: number }>(places: P[], degrees: number) {
  const clusters: { key: string; lat: number; lng: number; count: number; places: P[] }[] = [];
  for (const p of [...places].sort((a, b) => b.count - a.count)) {
    const home = degrees > 0 ? clusters.find((c) => angularDistance(c, p) < degrees) : undefined;
    if (home) {
      home.places.push(p);
      home.count += p.count;
    } else {
      clusters.push({ key: p.key, lat: p.lat, lng: p.lng, count: p.count, places: [p] });
    }
  }
  return clusters;
}

/** Cluster radius for a zoom level: wide when zoomed out, single places when zoomed in. */
export const clusterDegreesFor = (scale: number) => (scale >= 2.4 ? 0 : scale >= 1.6 ? 2.5 : 5);

// ── Interests ──────────────────────────────────────────────

/** Map filters, derived from what builders already wrote (skills, headline) and the projects they publish. */
export const CATEGORIES = [
  { key: "developers", label: "Developers", words: /\b(dev\w*|engineer\w*|full.?stack|front.?end|back.?end|web|typescript|javascript|react|next\.?js|node|python|rust|golang|java|swift|kotlin|mern|code|coder|programm\w*|software)\b/i, types: ["WEBSITE"] },
  { key: "designers", label: "Designers", words: /\b(design\w*|ui|ux|figma|brand\w*|illustrat\w*|typograph\w*)\b/i, types: [] },
  { key: "ai", label: "AI builders", words: /\b(ai|ml|machine learning|llms?|gpt|prompt\w*|agents?|data scien\w*)\b/i, types: ["AI_TOOL"] },
  { key: "games", label: "Game creators", words: /\b(games?|gamedev|game dev\w*|godot|unity|unreal|pixel\w*|indie)\b/i, types: ["GAME"] },
  { key: "creative", label: "Musicians / Artists", words: /\b(music\w*|audio|producer|beats?|songs?|art|artist\w*|draw\w*|paint\w*|3d|blender|animat\w*|video\w*|film\w*)\b/i, types: ["MUSIC", "ART", "VIDEO"] },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]["key"];

/** Every interest that fits a builder (none, one or several). */
export function builderCategories(b: { headline?: string | null; skills?: string[]; projectTypes?: string[] }): CategoryKey[] {
  const text = [b.headline ?? "", ...(b.skills ?? [])].join(" · ");
  return CATEGORIES.filter((c) => c.words.test(text) || c.types.some((t) => b.projectTypes?.includes(t))).map((c) => c.key);
}

// ── Local time ─────────────────────────────────────────────

export const PERIODS = [
  { key: "night", label: "night owls", from: 0, to: 5 },
  { key: "early", label: "early birds", from: 5, to: 9 },
  { key: "day", label: "daytime", from: 9, to: 18 },
  { key: "evening", label: "evening", from: 18, to: 24 },
] as const;

/** A place's local time right now: label ("11:42 pm"), fractional hour, period, and day/night. */
export function localClock(tz: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  const label = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(now).toLowerCase();
  return {
    label,
    hours: hour + minute / 60,
    period: PERIODS.find((p) => hour >= p.from && hour < p.to)!.key,
    night: hour < 6 || hour >= 19,
  };
}
