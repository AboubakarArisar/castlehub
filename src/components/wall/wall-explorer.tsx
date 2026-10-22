"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeOff, Flag, Locate, Minus, Paintbrush, Plus, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { REPORT_REASONS } from "@/lib/wall";
import type { WallTileView } from "@/lib/wall-server";

type Wall = { side: number; stamp: string; tiles: WallTileView[] };
type Me = { signedIn: boolean; builder: boolean; restricted: boolean; tile: { id: string; x: number; y: number } | null };

const CELL = 72; // px per square at zoom 1
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const POLL_MS = 10_000;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ctrl = "grid size-10 place-items-center rounded-sm border border-line-strong bg-[#0f0f0c]/90 hover:border-ink";

/**
 * The shared wall: pan by dragging, zoom with wheel, pinch or buttons. Only squares in view are
 * rendered; artwork images load lazily. The wall refreshes itself every ~10 s (cheap: an unchanged
 * wall answers 204), so claims, approvals and moderation show up without reloading.
 */
export function WallExplorer({ initial, me }: { initial: Wall; me: Me }) {
  const router = useRouter();
  const [wall, setWall] = useState(initial);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [live, setLive] = useState<"live" | "reconnecting">("live");
  const box = useRef<HTMLDivElement>(null);
  const fitted = useRef(false);
  // Latest view and wall size for the pointer handlers (kept in sync after every render).
  const viewRef = useRef(view);
  const sideRef = useRef(initial.side);
  useEffect(() => {
    viewRef.current = view;
    sideRef.current = wall.side;
  });

  const byXY = useMemo(() => new Map(wall.tiles.map((t) => [`${t.x},${t.y}`, t])), [wall.tiles]);
  const counts = useMemo(() => ({ claimed: wall.tiles.length, published: wall.tiles.filter((t) => t.state === "published").length }), [wall.tiles]);

  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const zoom = clamp(Math.min(el.clientWidth, el.clientHeight) / (wall.side * CELL) * 0.94, MIN_ZOOM, 1.4);
    setView({ zoom, x: (el.clientWidth - wall.side * CELL * zoom) / 2, y: (el.clientHeight - wall.side * CELL * zoom) / 2 });
  }, [wall.side]);

  const centerOn = (x: number, y: number, zoom = 2) => {
    const el = box.current;
    if (!el) return;
    setView({ zoom, x: el.clientWidth / 2 - (x + 0.5) * CELL * zoom, y: el.clientHeight / 2 - (y + 0.5) * CELL * zoom });
  };

  // Size tracking and the first fit.
  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
      if (!fitted.current) {
        fitted.current = true;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Keep the wall fresh: poll while the tab is visible, and right away when it comes back.
  useEffect(() => {
    let stamp = initial.stamp;
    let alive = true;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/wall?stamp=${encodeURIComponent(stamp)}`, { cache: "no-store" });
        if (!alive) return;
        if (res.status === 200) {
          const next: Wall = await res.json();
          stamp = next.stamp;
          setWall(next);
        }
        setLive(res.ok ? "live" : "reconnecting");
      } catch {
        if (alive) setLive("reconnecting");
      }
    };
    const t = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [initial.stamp]);

  // Drag to pan, pinch or wheel to zoom. A short press without movement selects a square.
  useEffect(() => {
    const el = box.current!;
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch = 0;
    const zoomAt = (cx: number, cy: number, factor: number) =>
      setView((v) => {
        const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const k = zoom / v.zoom;
        return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button,a,input,select,textarea")) return;
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const now = { x: e.clientX, y: e.clientY };
      pts.set(e.pointerId, now);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const r = el.getBoundingClientRect();
        if (pinch) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch);
        pinch = d;
        moved += 10;
        return;
      }
      moved += Math.abs(now.x - prev.x) + Math.abs(now.y - prev.y);
      setView((v) => ({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }));
    };
    const up = (e: PointerEvent) => {
      const had = pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (had && pts.size === 0 && moved < 6) {
        const r = el.getBoundingClientRect();
        const v = viewRef.current;
        const side = sideRef.current;
        const x = Math.floor((e.clientX - r.left - v.x) / (CELL * v.zoom));
        const y = Math.floor((e.clientY - r.top - v.y) / (CELL * v.zoom));
        setSelected(x >= 0 && y >= 0 && x < side && y < side ? { x, y } : null);
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  // Only the squares inside the viewport are rendered.
  const px = CELL * view.zoom;
  const x0 = clamp(Math.floor(-view.x / px), 0, wall.side);
  const y0 = clamp(Math.floor(-view.y / px), 0, wall.side);
  const x1 = clamp(Math.ceil((size.w - view.x) / px), 0, wall.side);
  const y1 = clamp(Math.ceil((size.h - view.y) / px), 0, wall.side);
  const cells: { x: number; y: number; t?: WallTileView }[] = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cells.push({ x, y, t: byXY.get(`${x},${y}`) });
  const lineAlpha = clamp((view.zoom - 0.3) / 1.4, 0.06, 0.35);
  const sel = selected ? byXY.get(`${selected.x},${selected.y}`) : undefined;

  return (
    <div className="dark relative isolate bg-[#0b0b09] text-ink">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-3 px-4 pt-6 pb-4 md:px-6">
        <div>
          <p className="text-label flex items-center gap-1.5 text-amber"><Paintbrush className="size-3.5" aria-hidden="true" /> castle wall</p>
          <h1 className="mt-1.5 font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-none font-extrabold tracking-[-0.045em]">
            One wall. Endless <span className="accent-serif text-amber">imagination</span>.
          </h1>
          <p className="mt-2 hidden max-w-[60ch] text-body text-muted sm:block">
            Claim a square, draw something original, and once a moderator approves it, it becomes part of the mural.
          </p>
        </div>
        <div className="flex items-center gap-3 text-body-s text-muted">
          <span>{counts.published} on the wall · {counts.claimed} claimed · {wall.side}×{wall.side}</span>
          <span className="inline-flex items-center gap-1.5" aria-live="polite">
            <span className={`size-2 rounded-full ${live === "live" ? "bg-green" : "bg-amber motion-safe:animate-pulse"}`} />
            {live === "live" ? "live" : "reconnecting…"}
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1200px] px-0 pb-8 md:px-6">
        <div
          ref={box}
          // Phones: fit between the header, intro and tab bar so the controls stay on screen.
          className="relative h-[calc(100dvh-15rem)] min-h-[320px] cursor-grab md:h-[min(72dvh,760px)] md:min-h-[380px] touch-none overflow-hidden border-y border-line bg-[#0f0f0c] select-none active:cursor-grabbing md:rounded-sm md:border"
          role="application"
          aria-label="Castle Wall: drag to explore, scroll or pinch to zoom, click a square for details"
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: wall.side * CELL,
              height: wall.side * CELL,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
              backgroundImage: `linear-gradient(rgba(241,238,230,${lineAlpha}) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,230,${lineAlpha}) 1px, transparent 1px)`,
              backgroundSize: `${CELL}px ${CELL}px`,
              boxShadow: "0 0 0 2px rgba(255,192,77,0.35)",
            }}
          >
            {cells.map(({ x, y, t }) => {
              const mine = me.tile && me.tile.x === x && me.tile.y === y;
              const isSel = selected?.x === x && selected?.y === y;
              return (
                <div
                  key={`${x},${y}`}
                  className={`absolute ${isSel ? "z-10 outline-2 outline-cobalt" : mine ? "z-10 outline-2 outline-amber" : ""}`}
                  style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
                >
                  {t?.state === "published" && t.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- approved artwork, lazily loaded per square
                    <img src={t.image} alt="" loading="lazy" decoding="async" draggable={false} className="size-full" />
                  )}
                  {t?.state === "claimed" && (
                    <div className="grid size-full place-items-center bg-[repeating-linear-gradient(45deg,rgba(123,144,255,0.10)_0_6px,transparent_6px_12px)]">
                      {view.zoom >= 1.1 && t.owner && <Avatar seed={t.owner.handle} src={t.owner.image} size={22} />}
                    </div>
                  )}
                  {t?.state === "hidden" && (
                    <div className="grid size-full place-items-center bg-white/[0.03]">{view.zoom >= 1.1 && <EyeOff className="size-4 text-muted/60" />}</div>
                  )}
                  {!t && view.zoom >= 1.6 && <div className="grid size-full place-items-center text-[18px] text-muted/25">+</div>}
                </div>
              );
            })}
          </div>

          <div className="absolute right-3 bottom-3 flex flex-col gap-1">
            <button type="button" onClick={() => setView((v) => zoomCenter(v, 1.4, size))} aria-label="Zoom in" title="Zoom in" className={ctrl}>
              <Plus className="size-4" />
            </button>
            <button type="button" onClick={() => setView((v) => zoomCenter(v, 1 / 1.4, size))} aria-label="Zoom out" title="Zoom out" className={ctrl}>
              <Minus className="size-4" />
            </button>
            <button type="button" onClick={fit} aria-label="Fit the wall" title="Fit the wall" className={ctrl}>
              <Locate className="size-4" />
            </button>
          </div>
          {me.tile && (
            <button
              type="button"
              onClick={() => {
                centerOn(me.tile!.x, me.tile!.y);
                setSelected({ x: me.tile!.x, y: me.tile!.y });
              }}
              className="absolute bottom-3 left-3 inline-flex h-10 items-center gap-1.5 rounded-sm border border-amber/60 bg-[#0f0f0c]/90 px-3 text-body-s font-semibold text-amber"
            >
              <Locate className="size-4" /> my square
            </button>
          )}
        </div>

        {selected && (
          <SquarePanel
            key={`${selected.x},${selected.y},${sel?.state}`}
            at={selected}
            tile={sel}
            me={me}
            onClose={() => setSelected(null)}
            onClaimed={() => router.push("/castle-wall/edit")}
          />
        )}
      </div>
    </div>
  );
}

function zoomCenter(v: { x: number; y: number; zoom: number }, factor: number, size: { w: number; h: number }) {
  const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const k = zoom / v.zoom;
  const cx = size.w / 2;
  const cy = size.h / 2;
  return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
}

/** Details for the selected square: claim it, see who's drawing, view artwork, or report it. */
function SquarePanel({ at, tile, me, onClose, onClaimed }: { at: { x: number; y: number }; tile?: WallTileView; me: Me; onClose: () => void; onClaimed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const mine = me.tile?.id === tile?.id && Boolean(tile);
  const label = `square ${at.x + 1},${at.y + 1}`;

  const claim = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/wall/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(at) }).catch(() => null);
    if (res?.ok) return onClaimed();
    setError((await res?.json().catch(() => null))?.error ?? "Couldn't claim it. Check your connection and try again.");
    setBusy(false);
  };

  const report = async (data: FormData) => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/wall/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tileId: tile!.id, reason: data.get("reason"), note: data.get("note") }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setReported(true);
      setReporting(false);
    } else setError((await res?.json().catch(() => null))?.error ?? "Couldn't send the report.");
  };

  return (
    <aside
      aria-labelledby="square-h"
      className="fixed inset-x-0 bottom-16 z-40 max-h-[60dvh] overflow-y-auto rounded-t-lg border-t border-line-strong bg-paper p-5 shadow-2xl md:absolute md:inset-x-auto md:top-4 md:right-10 md:bottom-auto md:w-[340px] md:rounded-sm md:border"
    >
      <div className="flex items-start justify-between gap-3">
        <p id="square-h" className="text-label text-muted">{label}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-sm border border-line text-muted hover:text-ink">
          <X className="size-4" />
        </button>
      </div>

      {!tile && (
        <div className="mt-2">
          <p className="font-display text-[22px] font-extrabold tracking-[-0.03em]">A free square</p>
          {!me.signedIn ? (
            <p className="mt-2 text-body-s text-muted"><Link href="/signin" className="font-semibold text-cobalt hover:underline">Sign in</Link> to claim it and draw.</p>
          ) : !me.builder ? (
            <p className="mt-2 text-body-s text-muted"><Link href="/onboarding" className="font-semibold text-cobalt hover:underline">Pick a handle</Link> first, then claim it.</p>
          ) : me.restricted ? (
            <p className="mt-2 text-body-s text-muted">A moderator has paused your access to the Castle Wall.</p>
          ) : me.tile ? (
            <p className="mt-2 text-body-s text-muted">
              You already hold square {me.tile.x + 1},{me.tile.y + 1}. One square each for now: release yours in the{" "}
              <Link href="/castle-wall/edit" className="font-semibold text-cobalt hover:underline">editor</Link> to move.
            </p>
          ) : (
            <>
              <p className="mt-1.5 text-body-s text-muted">Claim it to draw. Your drawing stays private until a moderator approves it for the wall.</p>
              <button type="button" onClick={claim} disabled={busy} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-amber font-semibold text-amber-ink disabled:opacity-60">
                <Paintbrush className="size-4" /> {busy ? "claiming…" : "claim this square"}
              </button>
            </>
          )}
        </div>
      )}

      {tile?.state === "claimed" && (
        <div className="mt-2">
          <p className="font-display text-[20px] font-extrabold tracking-[-0.02em]">{mine ? "Your square" : "Being drawn"}</p>
          {tile.owner && !mine && (
            <Link href={`/${tile.owner.handle}`} className="mt-2 flex items-center gap-2.5 hover:underline">
              <Avatar seed={tile.owner.handle} src={tile.owner.image} size={32} />
              <span className="text-body font-semibold">{tile.owner.name ?? tile.owner.handle}</span>
              <span className="text-body-s text-muted">@{tile.owner.handle}</span>
            </Link>
          )}
          {mine && (
            <Link href="/castle-wall/edit" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-cobalt font-semibold text-on-cobalt">
              <Paintbrush className="size-4" /> open the editor
            </Link>
          )}
        </div>
      )}

      {tile?.state === "published" && tile.owner && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- the approved artwork */}
          <img src={tile.image!} alt={`Artwork by ${tile.owner.name ?? tile.owner.handle}`} draggable={false} className="aspect-square w-full rounded-sm border border-line bg-[#0f0f0c]" />
          <Link href={`/${tile.owner.handle}`} className="mt-3 flex items-center gap-2.5 hover:underline">
            <Avatar seed={tile.owner.handle} src={tile.owner.image} size={32} />
            <span className="min-w-0">
              <span className="block truncate text-body font-semibold">{tile.owner.name ?? tile.owner.handle}</span>
              <span className="block text-body-s text-muted">@{tile.owner.handle}</span>
            </span>
          </Link>
          {tile.publishedAt && (
            <p className="mt-1.5 text-body-s text-muted">On the wall since {new Date(tile.publishedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p>
          )}
          {mine ? (
            <Link href="/castle-wall/edit" className="mt-3 inline-flex h-10 items-center gap-2 rounded-sm border border-line-strong px-3 text-body-s font-semibold hover:border-ink">
              <Paintbrush className="size-4" /> edit my square
            </Link>
          ) : (
            me.builder && !me.restricted && (
              <div className="mt-3 border-t border-line pt-3">
                {reported ? (
                  <p className="text-body-s text-green" role="status">Thanks. A moderator will take a look.</p>
                ) : reporting ? (
                  <form action={report} className="space-y-2">
                    <label className="block text-body-s font-semibold" htmlFor="report-reason">What&apos;s wrong with it?</label>
                    <select id="report-reason" name="reason" required className="h-10 w-full rounded-sm border border-line-strong bg-surface px-2 text-body-s">
                      {REPORT_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <textarea name="note" maxLength={500} rows={2} placeholder="anything a moderator should know (optional)" className="w-full rounded-sm border border-line-strong bg-surface px-2 py-1.5 text-body-s" />
                    <div className="flex gap-2">
                      <button type="submit" disabled={busy} className="h-9 rounded-sm bg-red px-3 text-body-s font-semibold text-white disabled:opacity-60">send report</button>
                      <button type="button" onClick={() => setReporting(false)} className="h-9 rounded-sm border border-line-strong px-3 text-body-s">cancel</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setReporting(true)} className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-red">
                    <Flag className="size-3.5" /> report this artwork
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      {tile?.state === "hidden" && (
        <p className="mt-2 text-body-s text-muted">{mine ? "Your artwork here is hidden by moderators. Open the editor for details." : "This square is hidden by moderators."}</p>
      )}

      {error && <p className="mt-2 text-body-s text-red" role="alert">{error}</p>}
    </aside>
  );
}
