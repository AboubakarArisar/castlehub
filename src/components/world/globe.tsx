"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { anglesFor, clusterDegreesFor, nearestAngle, project } from "@/lib/world-math";

export type GlobeCluster = {
  key: string;
  lat: number;
  lng: number;
  count: number;
  label: string;
  places: number;
  avatars: { handle: string; image: string | null }[];
};
export type FlyTarget = { lat: number; lng: number; scale: number; nonce: number };
export type PlantedFlag = { lat: number; lng: number; label: string; nonce: number };

const MIN_SCALE = 0.9;
const MAX_SCALE = 3.2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The WebGL globe (cobe, ~5 KB) with castle beacons as real buttons laid over it.
 * One animation loop drives rotation, inertia, flights and beacon positions; React only
 * re-renders when the set of beacons changes.
 */
export function Globe({
  clusters,
  arcs,
  selected,
  target,
  zoom,
  flag,
  reducedMotion,
  onSelect,
  onFocusPlace,
  onZoomBand,
}: {
  clusters: GlobeCluster[];
  arcs: { from: [number, number]; to: [number, number] }[];
  selected: string | null;
  target: FlyTarget | null;
  /** Zoom buttons in the toolbar: multiply the zoom by `factor`. */
  zoom: { factor: number; nonce: number } | null;
  flag: PlantedFlag | null;
  reducedMotion: boolean;
  onSelect: (key: string) => void;
  /** Keyboard focus on a beacon: bring it into view without opening anything. */
  onFocusPlace: (key: string) => void;
  onZoomBand: (degrees: number) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const beacons = useRef(new Map<string, HTMLElement>());
  const flagEl = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const view = useRef({ phi: anglesFor(22, 30).phi, theta: anglesFor(22, 30).theta, scale: 1, vPhi: 0, vTheta: 0, dragging: false, lastInput: 0 });
  const flight = useRef<{ from: { phi: number; theta: number; scale: number }; to: { phi: number; theta: number; scale: number }; start: number; dur: number } | null>(null);
  const data = useRef({ clusters, flag, onZoomBand, reducedMotion });
  // The animation loop reads the latest props through this ref.
  useEffect(() => {
    data.current = { clusters, flag, onZoomBand, reducedMotion };
  });

  // Create the globe once; tear it down (and its GL context) on unmount.
  useEffect(() => {
    const host = canvasHost.current!;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block;";
    host.append(canvas);
    const low = (navigator.hardwareConcurrency ?? 8) <= 4 || ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
    const dpr = low ? 1 : Math.min(2, window.devicePixelRatio || 1);
    let size = host.clientWidth || 600;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size,
      height: size,
      phi: view.current.phi,
      theta: view.current.theta,
      dark: 1,
      diffuse: 1.15,
      mapSamples: low ? 9000 : 18000,
      mapBrightness: 5.5,
      mapBaseBrightness: 0.03,
      baseColor: [0.14, 0.17, 0.27],
      markerColor: [1, 0.76, 0.32],
      glowColor: [0.24, 0.3, 0.62],
      arcColor: [0.48, 0.56, 1],
      arcWidth: 0.6,
      arcHeight: 0.25,
      markerElevation: 0.01,
      scale: 1,
      markers: [],
      arcs: [],
    });
    globeRef.current = globe;

    const resize = new ResizeObserver(() => {
      size = host.clientWidth || size;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      globe.update({ width: size, height: size });
    });
    resize.observe(host);

    let band = clusterDegreesFor(1);
    let raf = 0;
    const frame = (now: number) => {
      const v = view.current;
      const f = flight.current;
      if (f) {
        const t = data.current.reducedMotion ? 1 : clamp((now - f.start) / f.dur, 0, 1);
        const k = ease(t);
        v.phi = f.from.phi + (f.to.phi - f.from.phi) * k;
        v.theta = f.from.theta + (f.to.theta - f.from.theta) * k;
        v.scale = f.from.scale + (f.to.scale - f.from.scale) * k;
        if (t >= 1) flight.current = null;
      } else if (!v.dragging) {
        v.phi += v.vPhi;
        v.theta = clamp(v.theta + v.vTheta, -1.2, 1.2);
        v.vPhi *= 0.93;
        v.vTheta *= 0.93;
        // A slow drift when nobody is interacting (never with reduced motion).
        if (!data.current.reducedMotion && now - v.lastInput > 4000) v.phi += 0.0012;
      }
      globe.update({ phi: v.phi, theta: v.theta, scale: v.scale });

      const w = host.clientWidth;
      for (const c of data.current.clusters) {
        const el = beacons.current.get(c.key);
        if (!el) continue;
        const p = project(c.lat, c.lng, v.phi, v.theta, v.scale);
        const depthScale = 0.75 + 0.25 * Math.max(0, p.depth);
        el.style.transform = `translate(${p.x * w}px, ${p.y * w}px) translate(-50%, -100%) scale(${depthScale})`;
        // Fade out towards the rim, so beacons never seem to float off the edge of the Earth.
        const shown = p.depth > 0.12 && Math.hypot(p.x - 0.5, p.y - 0.5) < 0.46;
        el.style.opacity = shown ? String(Math.min(1, (p.depth - 0.12) * 4)) : "0";
        el.style.pointerEvents = shown ? "auto" : "none";
      }
      const fl = data.current.flag;
      if (fl && flagEl.current) {
        const p = project(fl.lat, fl.lng, v.phi, v.theta, v.scale);
        flagEl.current.style.transform = `translate(${p.x * w}px, ${p.y * w}px)`;
        flagEl.current.style.opacity = p.visible && Math.hypot(p.x - 0.5, p.y - 0.5) < 0.46 ? "1" : "0";
      }

      const nextBand = clusterDegreesFor(v.scale);
      if (nextBand !== band) {
        band = nextBand;
        data.current.onZoomBand(band);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      globe.destroy();
      globeRef.current = null;
      // Release the WebGL context now rather than waiting for garbage collection.
      (canvas.getContext("webgl2") ?? canvas.getContext("webgl"))?.getExtension("WEBGL_lose_context")?.loseContext();
      host.replaceChildren();
    };
  }, []);

  // Glow dots and collaboration arcs, drawn by cobe under the beacons.
  useEffect(() => {
    globeRef.current?.update({
      markers: clusters.map((c) => ({ location: [c.lat, c.lng] as [number, number], size: Math.min(0.045, 0.012 + Math.sqrt(c.count) * 0.006) })),
      arcs,
    });
  }, [clusters, arcs]);

  // Camera flights (about 1.4 s, instant with reduced motion).
  useEffect(() => {
    if (!target) return;
    const v = view.current;
    const to = anglesFor(target.lat, target.lng);
    flight.current = {
      from: { phi: v.phi, theta: v.theta, scale: v.scale },
      to: { phi: nearestAngle(v.phi, to.phi), theta: clamp(to.theta, -1.2, 1.2), scale: clamp(target.scale, MIN_SCALE, MAX_SCALE) },
      start: performance.now(),
      dur: 1400,
    };
    v.vPhi = v.vTheta = 0;
    v.lastInput = performance.now();
  }, [target]);

  // Drag to rotate (with inertia), pinch or wheel to zoom.
  useEffect(() => {
    const el = wrap.current!;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const touch = () => (view.current.lastInput = performance.now());
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button,a")) return;
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      flight.current = null;
      view.current.dragging = true;
      touch();
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = view.current;
      touch();
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) v.scale = clamp(v.scale * (d / pinch), MIN_SCALE, MAX_SCALE);
        pinch = d;
        return;
      }
      // Radians per pixel so the point under the pointer follows it.
      const k = 2.44 / ((el.clientWidth || 600) * v.scale);
      v.vPhi = (e.clientX - prev.x) * k;
      v.vTheta = (e.clientY - prev.y) * k;
      v.phi += v.vPhi;
      v.theta = clamp(v.theta + v.vTheta, -1.2, 1.2);
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (pointers.size === 0) view.current.dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      touch();
      flight.current = null;
      view.current.scale = clamp(view.current.scale * Math.exp(-e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE);
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

  useEffect(() => {
    if (!zoom) return;
    const v = view.current;
    flight.current = { from: { phi: v.phi, theta: v.theta, scale: v.scale }, to: { phi: v.phi, theta: v.theta, scale: clamp(v.scale * zoom.factor, MIN_SCALE, MAX_SCALE) }, start: performance.now(), dur: 350 };
    v.lastInput = performance.now();
  }, [zoom]);

  return (
    // touch-action pan-y: a vertical swipe still scrolls the page on phones; sideways drags and pinches go to the globe.
    <div ref={wrap} className="relative aspect-square w-full cursor-grab touch-pan-y select-none active:cursor-grabbing">
      <div
        ref={canvasHost}
        className="absolute inset-0 [mask-image:radial-gradient(circle_closest-side,#000_90%,transparent_100%)]"
        aria-hidden="true"
      />

      <ul className="absolute inset-0" aria-label="Places with builders">
        {clusters.map((c) => (
          <li key={c.key} className="contents">
            <button
              type="button"
              ref={(el) => {
                if (el) beacons.current.set(c.key, el);
                else beacons.current.delete(c.key);
              }}
              onClick={() => onSelect(c.key)}
              onFocus={(e) => e.currentTarget.matches(":focus-visible") && onFocusPlace(c.key)}
              aria-label={`${c.label}: ${c.count} ${c.count === 1 ? "builder" : "builders"}`}
              aria-pressed={selected === c.key}
              className="group absolute top-0 left-0 opacity-0 outline-none"
              style={{ willChange: "transform" }}
            >
              <Beacon count={c.count} active={selected === c.key} />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-sm border border-white/10 bg-[#0d1020]/95 px-3 py-2 text-left shadow-xl group-hover:block group-focus-visible:block"
              >
                <span className="block font-display text-[14px] font-bold text-ink">{c.label}</span>
                <span className="block text-body-s text-muted">
                  {c.count} {c.count === 1 ? "builder" : "builders"}
                  {c.places > 1 && ` · ${c.places} places, zoom in`}
                </span>
                <span className="mt-1.5 flex -space-x-1.5">
                  {c.avatars.slice(0, 4).map((a) =>
                    a.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small remote avatars
                      <img key={a.handle} src={a.image} alt="" className="size-5 rounded-full border border-[#0d1020] object-cover" />
                    ) : (
                      <span key={a.handle} className="grid size-5 place-items-center rounded-full border border-[#0d1020] bg-cobalt text-[9px] font-bold text-on-cobalt">
                        {a.handle[0]}
                      </span>
                    ),
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {flag && (
        <div ref={flagEl} key={flag.nonce} className="pointer-events-none absolute top-0 left-0" aria-hidden="true">
          <span className="animate-flag-ripple absolute top-0 left-0 size-8 rounded-full border-2 border-amber" />
          <span className="absolute bottom-0 left-0 block h-9 w-[2px] -translate-x-1/2 bg-ink animate-flag-pole" style={{ bottom: 0 }} />
          <svg className="animate-flag-cloth absolute left-0 -translate-y-[36px]" width="22" height="15" viewBox="0 0 22 15" style={{ top: 0 }}>
            <path d="M0 0h22l-4 7.5 4 7.5H0z" fill="var(--cobalt)" />
            <path d="M5 11V7h2v1.5h2V7h2v1.5h2V7h2v4z" fill="#0b0d16" opacity=".7" />
          </svg>
        </div>
      )}

    </div>
  );
}

/** A tiny glowing castle outpost; bigger places get a count. */
function Beacon({ count, active }: { count: number; active: boolean }) {
  return (
    <span className="relative flex flex-col items-center">
      {active && <span className="animate-beacon-pulse absolute top-1 size-6 rounded-full border border-amber" />}
      <svg width="20" height="18" viewBox="0 0 20 18" className={`drop-shadow-[0_0_6px_rgba(255,192,77,0.75)] transition-transform duration-200 group-hover:scale-125 ${active ? "scale-125" : ""}`}>
        <path d="M2 18V7h3v2h2V7h2v2h2V7h2v2h2V7h3v11h-6v-4a2 2 0 0 0-4 0v4z" fill={active ? "#ffd27a" : "#ffc04d"} />
        <path d="M10 1v5" stroke="#ffc04d" strokeWidth="1.2" />
        <path d="M10 1.2h4l-1.2 1.3L14 3.8h-4z" fill="#7b90ff" />
      </svg>
      {count > 1 && (
        <span className="absolute -top-2 -right-3 min-w-4 rounded-full bg-[#0d1020] px-1 font-mono text-[9px] leading-4 font-bold text-amber ring-1 ring-amber/60">
          {count}
        </span>
      )}
      <span className="mt-0.5 block size-1 rounded-full bg-amber shadow-[0_0_8px_2px_rgba(255,192,77,0.7)]" />
    </span>
  );
}
