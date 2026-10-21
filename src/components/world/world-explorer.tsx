"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, Flag, Globe2, List, LocateFixed, MapPin, Minus, Moon, Plus, Search, Sun, Sunrise, Sunset, X } from "lucide-react";
import type { WorldState } from "@/actions/world";
import type { FlyTarget, GlobeCluster, PlantedFlag } from "@/components/world/globe";
import { LocationForm, type LocationDefaults } from "@/components/world/location-form";
import { CATEGORIES, clusterDegreesFor, clusterPlaces, localClock, PERIODS, type CategoryKey } from "@/lib/world-math";
import type { PlaceBuilders, WorldMarker } from "@/lib/world";

// The globe (and WebGL) only loads on this page, after the shell has painted.
const Globe = dynamic(() => import("@/components/world/globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse rounded-full bg-[radial-gradient(circle,rgba(70,90,170,0.25),transparent_65%)]" aria-hidden="true" />,
});

type Viewer = { builder: boolean; signedIn: boolean; location: LocationDefaults; placeLabel: string | null };
const HOME: Omit<FlyTarget, "nonce"> = { lat: 22, lng: 30, scale: 1 };

export function WorldExplorer({
  markers,
  arcs,
  stats,
  countries,
  viewer,
  initialPlace,
}: {
  markers: WorldMarker[];
  arcs: { from: [number, number]; to: [number, number] }[];
  stats: { builders: number; countries: number; projects: number };
  countries: { code: string; name: string }[];
  viewer: Viewer;
  initialPlace: string | null;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [band, setBand] = useState(clusterDegreesFor(1));
  const [selected, setSelected] = useState<string | null>(null);
  // A specific place (search, list, random) or a whole cluster of nearby places (clicking a beacon).
  const [asCluster, setAsCluster] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [target, setTarget] = useState<FlyTarget | null>(null);
  const [flag, setFlag] = useState<PlantedFlag | null>(null);
  const [listView, setListView] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [zoom, setZoom] = useState<{ factor: number; nonce: number } | null>(null);
  // Local times are worked out in the browser (after mount, so server and client HTML agree) and tick every 30 s.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock once mounted
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const empty = markers.length === 0;
  const showGlobe = webgl && !listView;

  useEffect(() => {
    const c = document.createElement("canvas");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setWebgl(Boolean(c.getContext("webgl2") ?? c.getContext("webgl")));
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const visible = useMemo(
    () => (category ? markers.filter((m) => (m.categories[category] ?? 0) > 0).map((m) => ({ ...m, count: m.categories[category]! })) : markers),
    [markers, category],
  );
  const clusters: GlobeCluster[] = useMemo(
    () =>
      clusterPlaces(visible, band).map((c) => ({
        key: c.key,
        lat: c.lat,
        lng: c.lng,
        count: c.count,
        places: c.places.length,
        label: c.places.length > 1 ? `Around ${c.places[0].label}` : c.places[0].label,
        avatars: c.places.flatMap((p) => p.avatars).slice(0, 4),
        clock: now && c.places[0].tz ? localClock(c.places[0].tz, now) : null,
      })),
    [visible, band, now],
  );
  const byKey = useMemo(() => new Map(visible.map((m) => [m.key, m])), [visible]);
  const selectedCluster = selected ? clusterPlaces(visible, band).find((c) => c.key === selected) : undefined;

  const fly = (lat: number, lng: number, scale: number) => setTarget({ lat, lng, scale, nonce: Date.now() });

  const openPlace = (key: string, handle: string | null = null) => {
    const m = byKey.get(key) ?? markers.find((x) => x.key === key);
    if (!m) return;
    setSelected(key);
    setAsCluster(false);
    setHighlight(handle);
    fly(m.lat, m.lng, Math.max(1.8, band ? 2.4 : 1.8));
  };

  const selectCluster = (key: string) => {
    const c = clusterPlaces(visible, band).find((x) => x.key === key);
    if (!c) return;
    setSelected(key);
    setAsCluster(c.places.length > 1);
    setHighlight(null);
    // A cluster of several places: zoom in so it splits; one place: open it.
    fly(c.lat, c.lng, c.places.length > 1 ? 2.6 : 1.8);
  };

  // Deep link: /world?place=c1172451
  const opened = useRef(false);
  useEffect(() => {
    if (initialPlace && !opened.current) {
      opened.current = true;
      openPlace(initialPlace);
    }
  });

  const reset = () => {
    setSelected(null);
    setHighlight(null);
    setTarget({ ...HOME, nonce: Date.now() });
  };

  const random = async () => {
    const res = await fetch(`/api/world/random${category ? `?category=${category}` : ""}`).then((r) => r.json()).catch(() => null);
    if (res?.builder) {
      openPlace(res.builder.place, res.builder.handle);
      setAnnounce(`Flying to a builder in ${markers.find((m) => m.key === res.builder.place)?.label ?? "the world"}`);
    }
  };

  const planted = (s: WorldState) => {
    dialog.current?.close();
    if (s.place && s.onMap) {
      setFlag({ lat: s.place.lat, lng: s.place.lng, label: s.place.label, nonce: Date.now() });
      fly(s.place.lat, s.place.lng, 1.8);
      setAnnounce(`Your flag is planted in ${s.place.label}.`);
    }
    router.refresh();
  };
  const removed = () => {
    dialog.current?.close();
    setFlag(null);
    setAnnounce("Your flag is removed. You're no longer on the map.");
    router.refresh();
  };



  return (
    <section className="dark relative isolate overflow-hidden bg-[#07080d] text-ink" aria-labelledby="world-h">
      <Sky />
      <p className="sr-only" aria-live="polite">{announce}</p>

      <div className="relative mx-auto max-w-[1200px] px-4 pt-6 md:px-6 md:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[46rem]">
            <p className="text-label text-amber">world map · one castle, builders everywhere</p>
            <h1 id="world-h" className="mt-3 font-display text-[clamp(2rem,4.4vw,3.3rem)] leading-[1] font-extrabold tracking-[-0.045em]">
              The castle has <span className="accent-serif text-amber">no borders</span>.
            </h1>
            <p className="mt-2 text-body-l text-muted">Explore the people building amazing things around the world.</p>
          </div>
          <FlagControl viewer={viewer} onPlant={() => dialog.current?.showModal()} onFind={() => viewer.location.onWorldMap && openPlace(placeKeyOf(viewer.location))} />
        </div>

        <Toolbar
          markers={markers}
          category={category}
          setCategory={(c) => {
            setCategory(c);
            setSelected(null);
          }}
          onPlace={(k) => openPlace(k)}
          onBuilder={(place, handle) => openPlace(place, handle)}
          onReset={reset}
          onRandom={random}
          listView={listView || !webgl}
          canToggle={webgl}
          onToggleList={() => setListView((v) => !v)}
          onZoom={showGlobe ? (factor) => setZoom({ factor, nonce: Date.now() }) : undefined}
        />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 pb-10 md:px-6">
        <div className="relative mx-auto w-full max-w-[min(740px,calc(100dvh-140px))] min-w-[280px]">
          {showGlobe ? (
            <Globe
              clusters={clusters}
              arcs={category ? [] : arcs}
              selected={selected}
              target={target}
              zoom={zoom}
              flag={flag}
              reducedMotion={reducedMotion}
              onSelect={selectCluster}
              onFocusPlace={(k) => {
                const c = clusters.find((x) => x.key === k);
                if (c) fly(c.lat, c.lng, Math.max(1.4, band ? 1.4 : 2.4));
              }}
              onZoomBand={setBand}
            />
          ) : (
            <PlaceList markers={visible} webgl={webgl} onOpen={(k) => openPlace(k)} />
          )}

          {empty && (
            <div className="absolute inset-x-0 bottom-[12%] mx-auto w-[min(26rem,92%)] rounded-sm border border-white/10 bg-[#0d1020]/90 p-5 text-center backdrop-blur">
              <p className="font-display text-[19px] font-bold">The castle is just getting started.</p>
              <p className="mt-1 text-body text-muted">Put your corner of the world on the map.</p>
              <AddButton viewer={viewer} onPlant={() => dialog.current?.showModal()} className="mt-4" label="add my location" />
            </div>
          )}
        </div>

        {!empty && <TimeRibbon markers={visible} now={now} onOpen={(k) => openPlace(k)} />}
        <Counter stats={stats} />
      </div>

      {selected && (
        <PlacePanel
          key={`${selected}-${category}`}
          cluster={asCluster ? selectedCluster : undefined}
          marker={byKey.get(selected) ?? null}
          category={category}
          highlight={highlight}
          now={now}
          onClose={() => setSelected(null)}
          onPlace={(k) => openPlace(k)}
        />
      )}

      <dialog
        ref={dialog}
        aria-labelledby="plant-h"
        className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-sm border border-line-strong bg-paper p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="dark bg-paper p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label flex items-center gap-1.5 text-amber"><Flag className="size-3.5" /> plant your flag</p>
              <h2 id="plant-h" className="mt-2 font-display text-[24px] leading-7 font-extrabold tracking-[-0.03em]">Where are you building from?</h2>
              <p className="mt-1.5 text-body-s text-muted">Only your country and, if you like, your city. Your flag sits on its centre. Remove it whenever you want.</p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-sm border border-line text-muted hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-5">
            <LocationForm countries={countries} defaults={viewer.location} mode="plant" onSaved={planted} onRemoved={removed} />
          </div>
        </div>
      </dialog>
    </section>
  );
}

const placeKeyOf = (l: LocationDefaults) => (l.cityId ? `c${l.cityId}` : `n${l.countryCode}`);

// A fixed star field (seeded, so server and client agree).
const STARS = (() => {
  let seed = 7;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: 90 }, () => ({ x: r() * 100, y: r() * 100, s: r() < 0.85 ? 1 : 2, o: 0.25 + r() * 0.6 }));
})();

/** Static star field and a midnight horizon glow (no animation, nothing to load). */
function Sky() {
  const stars = STARS;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_70%,#14204a_0%,#0b1124_45%,#07080d_80%)]" />
      {stars.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o }} />
      ))}
    </div>
  );
}

function AddButton({ viewer, onPlant, className = "", label }: { viewer: Viewer; onPlant: () => void; className?: string; label: string }) {
  const cls = `inline-flex h-10 items-center gap-2 rounded-sm bg-amber px-4 text-body font-semibold text-amber-ink transition-transform duration-120 hover:-translate-y-px ${className}`;
  if (viewer.builder) return <button type="button" onClick={onPlant} className={cls}><Flag className="size-4" /> {label}</button>;
  return <Link href={viewer.signedIn ? "/onboarding" : "/signin"} className={cls}><Flag className="size-4" /> {viewer.signedIn ? "pick a handle first" : "sign in to plant your flag"}</Link>;
}

/** Your own flag: plant it, see it, move it or remove it. */
function FlagControl({ viewer, onPlant, onFind }: { viewer: Viewer; onPlant: () => void; onFind: () => void }) {
  if (!viewer.builder || !viewer.location.onWorldMap) return <AddButton viewer={viewer} onPlant={onPlant} label="plant your flag" />;
  return (
    <div className="flex h-10 items-center gap-2 rounded-sm border border-white/15 bg-[#0d1020]/70 pr-1 pl-3 backdrop-blur">
      <MapPin className="size-4 text-amber" aria-hidden="true" />
      <button type="button" onClick={onFind} className="text-body-s hover:underline">
        your flag: <span className="font-semibold text-ink">{viewer.placeLabel}</span>
      </button>
      <button type="button" onClick={onPlant} className="h-8 rounded-sm border border-white/15 px-2.5 text-body-s transition-colors duration-120 hover:border-white/40">move or remove</button>
    </div>
  );
}

function Toolbar({
  markers,
  category,
  setCategory,
  onPlace,
  onBuilder,
  onReset,
  onRandom,
  listView,
  canToggle,
  onToggleList,
  onZoom,
}: {
  markers: WorldMarker[];
  category: CategoryKey | null;
  setCategory: (c: CategoryKey | null) => void;
  onPlace: (key: string) => void;
  onBuilder: (place: string, handle: string) => void;
  onReset: () => void;
  onRandom: () => void;
  listView: boolean;
  canToggle: boolean;
  onToggleList: () => void;
  onZoom?: (factor: number) => void;
}) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<{ handle: string; name: string | null; image: string | null; place: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const term = q.trim().toLowerCase();
  const places = term ? markers.filter((m) => m.label.toLowerCase().includes(term) || m.country.toLowerCase().includes(term)).slice(0, 5) : [];

  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/world/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal }).then((r) => r.json()).then((j) => setPeople(j.builders)).catch(() => {});
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);
  const shownPeople = term.length < 2 ? [] : people;
  const pick = (fn: () => void) => {
    fn();
    setOpen(false);
    setQ("");
  };
  const chip = (on: boolean) =>
    `text-label inline-flex h-10 shrink-0 items-center rounded-sm border px-3 transition-colors duration-120 ${on ? "border-amber bg-amber text-amber-ink" : "border-white/15 bg-[#0d1020]/70 text-muted backdrop-blur hover:border-white/40 hover:text-ink"}`;

  return (
    <div className="relative z-10 mt-6 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="find a builder, city or country"
          aria-label="Search the World Map"
          className="h-10 w-full rounded-sm border border-white/15 bg-[#0d1020]/80 pr-3 pl-9 text-body text-ink backdrop-blur placeholder:text-muted/80 focus:border-cobalt focus:outline-none"
        />
        {open && term && (
          <ul aria-label="Search results" className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-sm border border-white/15 bg-[#0d1020] py-1 shadow-2xl">
            {places.map((m) => (
              <li key={m.key}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(() => onPlace(m.key))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-body hover:bg-white/5">
                  <MapPin className="size-4 text-amber" aria-hidden="true" /> {m.label}
                  <span className="ml-auto text-body-s text-muted">{m.count}</span>
                </button>
              </li>
            ))}
            {shownPeople.map((b) => (
              <li key={b.handle}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(() => onBuilder(b.place, b.handle))} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5">
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small remote avatar
                    <img src={b.image} alt="" className="size-5 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-5 place-items-center rounded-full bg-cobalt text-[10px] font-bold text-on-cobalt">{b.handle[0]}</span>
                  )}
                  <span className="text-body">{b.name}</span>
                  <span className="truncate text-body-s text-muted">@{b.handle} · {b.label}</span>
                </button>
              </li>
            ))}
            {places.length === 0 && shownPeople.length === 0 && <li className="px-3 py-2 text-body-s text-muted">No builders or places match yet.</li>}
          </ul>
        )}
      </div>

      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onRandom} className="inline-flex h-10 items-center gap-2 rounded-sm border px-3.5 text-body-s font-semibold border-white/15 bg-[#0d1020]/70 backdrop-blur transition-colors duration-120 hover:border-white/40">
          <Dices className="size-4" aria-hidden="true" /> random builder
        </button>
        <div className="flex">
          <button type="button" onClick={onReset} aria-label="Reset view" title="Reset view" className="grid size-10 place-items-center rounded-l-sm border border-white/15 bg-[#0d1020]/70 backdrop-blur transition-colors duration-120 hover:border-white/40">
            <LocateFixed className="size-4" />
          </button>
          {onZoom && (
            <>
              <button type="button" onClick={() => onZoom(1.4)} aria-label="Zoom in" title="Zoom in" className="-ml-px grid size-10 place-items-center border border-white/15 bg-[#0d1020]/70 backdrop-blur transition-colors duration-120 hover:border-white/40">
                <Plus className="size-4" />
              </button>
              <button type="button" onClick={() => onZoom(1 / 1.4)} aria-label="Zoom out" title="Zoom out" className="-ml-px grid size-10 place-items-center border border-white/15 bg-[#0d1020]/70 backdrop-blur transition-colors duration-120 hover:border-white/40">
                <Minus className="size-4" />
              </button>
            </>
          )}
          {canToggle && (
            <button type="button" onClick={onToggleList} aria-pressed={listView} aria-label={listView ? "Show globe" : "Show as list"} title={listView ? "Show globe" : "Show as list"} className="-ml-px grid size-10 place-items-center rounded-r-sm border border-white/15 bg-[#0d1020]/70 backdrop-blur transition-colors duration-120 hover:border-white/40">
              {listView ? <Globe2 className="size-4" /> : <List className="size-4" />}
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Wraps on wider screens; swipes sideways (no scrollbar) on phones. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter builders">
        <button type="button" aria-pressed={!category} onClick={() => setCategory(null)} className={chip(!category)}>all builders</button>
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button" aria-pressed={category === c.key} onClick={() => setCategory(category === c.key ? null : c.key)} className={chip(category === c.key)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Accessible list of every place: the list view, and the fallback without WebGL. */
function PlaceList({ markers, webgl, onOpen }: { markers: WorldMarker[]; webgl: boolean; onOpen: (key: string) => void }) {
  const sorted = [...markers].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return (
    <div className="mt-6 rounded-sm border border-white/10 bg-[#0d1020]/70 backdrop-blur">
      {!webgl && <p className="border-b border-white/10 px-4 py-3 text-body-s text-muted">Your browser can&apos;t show the 3D globe, so here are all the places instead.</p>}
      {sorted.length === 0 ? (
        <p className="px-4 py-10 text-center text-body text-muted">No flags yet.</p>
      ) : (
        <ul className="grid gap-px sm:grid-cols-2">
          {sorted.map((m) => (
            <li key={m.key}>
              <button type="button" onClick={() => onOpen(m.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                <MapPin className="size-4 shrink-0 text-amber" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-body">{m.label}</span>
                <span className="text-count text-muted">{m.count} {m.count === 1 ? "builder" : "builders"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Builders around the world": real totals from the database. */
function Counter({ stats }: { stats: { builders: number; countries: number; projects: number } }) {
  const items = [
    { n: stats.builders, label: stats.builders === 1 ? "builder" : "builders" },
    { n: stats.countries, label: stats.countries === 1 ? "country" : "countries" },
    { n: stats.projects, label: stats.projects === 1 ? "project" : "projects" },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-end justify-between gap-4 lg:absolute lg:bottom-10 lg:left-6 lg:mt-0 lg:block">
      <p className="text-label text-muted">builders around the world</p>
      <dl className="flex gap-6 lg:mt-2">
        {items.map((i) => (
          <div key={i.label}>
            <dd className="font-display text-[28px] leading-8 font-extrabold tracking-[-0.03em]">{i.n}</dd>
            <dt className="text-body-s text-muted">{i.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Side panel on desktop, bottom sheet on phones: who's building at a place. */
function PlacePanel({
  cluster,
  marker,
  category,
  highlight,
  now,
  onClose,
  onPlace,
}: {
  cluster: { places: WorldMarker[]; count: number } | undefined;
  marker: WorldMarker | null;
  category: CategoryKey | null;
  highlight: string | null;
  now: Date | null;
  onClose: () => void;
  onPlace: (key: string) => void;
}) {
  const several = cluster && cluster.places.length > 1;
  const place = several ? null : (marker ?? cluster?.places[0] ?? null);
  const [pages, setPages] = useState<PlaceBuilders[]>([]);
  const [failed, setFailed] = useState(false);
  const load = (page: number) => {
    if (!place) return;
    fetch(`/api/world/builders?place=${place.key}&page=${page}${category ? `&category=${category}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: PlaceBuilders) =>
        setPages((p) => {
          const next = [...p];
          next[page] = j;
          return next;
        }),
      )
      .catch(() => setFailed(true));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per place (the panel is keyed by place)
  useEffect(() => load(0), []);
  useEffect(() => {
    if (highlight) document.getElementById(`b-${highlight}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlight, pages.length]);
  const builders = pages.filter(Boolean).flatMap((p) => p.builders);
  const last = pages.at(-1);

  return (
    <aside
      aria-labelledby="panel-h"
      className="fixed inset-x-0 bottom-16 z-40 max-h-[62dvh] overflow-y-auto rounded-t-lg border-t border-white/10 bg-[#0b0d16]/97 shadow-2xl backdrop-blur md:bottom-0 lg:absolute lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-6 lg:max-h-none lg:w-[380px] lg:rounded-sm lg:border"
    >
      <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-white/10 bg-[#0b0d16] px-5 py-4">
        <div>
          <p className="text-label flex items-center gap-1.5 text-amber"><MapPin className="size-3.5" aria-hidden="true" /> {several ? "this corner of the world" : "building from"}</p>
          <h2 id="panel-h" className="mt-1 font-display text-[20px] leading-6 font-extrabold tracking-[-0.02em]">
            {several ? `${cluster!.places.length} places nearby` : place?.label}
          </h2>
          <p className="text-body-s text-muted">
            {(several ? cluster!.count : (last?.total ?? place?.count ?? 0))} {category ? CATEGORIES.find((c) => c.key === category)!.label.toLowerCase() : "builders"}
          </p>
          {!several && place?.tz && now && <LocalTime tz={place.tz} now={now} />}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-sm border border-white/15 text-muted hover:text-ink">
          <X className="size-4" />
        </button>
      </div>

      {several ? (
        <ul className="p-2">
          {cluster!.places.map((p) => (
            <li key={p.key}>
              <button type="button" onClick={() => onPlace(p.key)} className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left hover:bg-white/5">
                <MapPin className="size-4 text-amber" aria-hidden="true" />
                <span className="flex-1 text-body">{p.label}</span>
                <span className="text-count text-muted">{p.count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2 p-3">
          {failed && <p className="px-2 py-4 text-body-s text-red">Couldn&apos;t load builders. Try again.</p>}
          {!failed && pages.length === 0 && <p className="px-2 py-4 text-body-s text-muted">Finding builders…</p>}
          {builders.map((b) => (
            <article key={b.handle} id={`b-${b.handle}`} className={`rounded-sm border p-3 transition-colors ${highlight === b.handle ? "border-amber bg-amber/5" : "border-white/10"}`}>
              <Link href={`/${b.handle}`} className="flex items-center gap-3">
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote avatar
                  <img src={b.image} alt="" className="size-11 rounded-sm object-cover" />
                ) : (
                  <span className="grid size-11 place-items-center rounded-sm bg-cobalt font-display text-[18px] font-bold text-on-cobalt">{b.handle[0]}</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold hover:underline">{b.name}</span>
                  <span className="block truncate text-body-s text-muted">@{b.handle}{b.headline ? ` · ${b.headline}` : ""}</span>
                </span>
              </Link>
              {b.bio && <p className="mt-2 text-body-s text-muted">{b.bio}</p>}
              {b.skills.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1" aria-label="Skills">
                  {b.skills.map((s) => <li key={s} className="rounded-sm border border-white/10 px-1.5 py-0.5 text-[11px] text-muted">{s}</li>)}
                </ul>
              )}
              {b.projects.length > 0 && (
                <ul className="mt-2.5 space-y-1 border-t border-white/10 pt-2.5" aria-label="Projects">
                  {b.projects.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/${b.handle}/${p.slug}`} className="block text-body-s hover:underline">
                        <span className="font-semibold text-ink">{p.name}</span> <span className="text-muted">· {p.tagline}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
          {last?.hasMore && (
            <button type="button" onClick={() => load(pages.length)} className="h-10 w-full rounded-sm border border-white/15 text-body-s font-semibold hover:border-white/40">
              show more builders
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

const PERIOD_ICON = { night: Moon, early: Sunrise, day: Sun, evening: Sunset } as const;

function LocalTime({ tz, now }: { tz: string; now: Date }) {
  const c = localClock(tz, now);
  const Icon = PERIOD_ICON[c.period];
  return (
    <p className={`mt-1 flex items-center gap-1.5 text-body-s ${c.night ? "text-cobalt" : "text-amber"}`}>
      <Icon className="size-3.5" aria-hidden="true" /> {c.label} there · {PERIODS.find((p) => p.key === c.period)!.label}
    </p>
  );
}

/**
 * "Who's cooking right now": every place on the map at its current local time, midnight to
 * midnight. Uses only each place's public timezone; places in multi-zone countries are left out.
 */
function TimeRibbon({ markers, now, onOpen }: { markers: WorldMarker[]; now: Date | null; onOpen: (key: string) => void }) {
  if (!now) return null;
  const timed = markers
    .filter((m) => m.tz)
    .map((m) => ({ m, c: localClock(m.tz!, now) }))
    .sort((a, b) => a.c.hours - b.c.hours);
  const untimed = markers.length - timed.length;
  // Stack places that are close in time into lanes so nothing overlaps.
  const laneEnds: number[] = [];
  const placed = timed.map((t) => {
    const x = t.c.hours / 24;
    // ~a chip's width on the narrowest ribbon (560px), so chips in one lane never touch.
    let lane = laneEnds.findIndex((end) => x - end > 0.17);
    if (lane === -1) lane = laneEnds.push(x) - 1;
    else laneEnds[lane] = x;
    return { ...t, x, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  const shade = { night: "bg-[#05060c]", early: "bg-cobalt/10", day: "bg-amber/10", evening: "bg-cobalt/[0.06]" } as const;

  return (
    <section aria-labelledby="clock-h" className="relative z-10 mt-8 rounded-sm border border-white/10 bg-[#0d1020]/70 p-4 backdrop-blur md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="clock-h" className="font-display text-[20px] font-extrabold tracking-[-0.02em]">
          who&apos;s <span className="accent-serif text-amber">cooking</span> right now
        </h2>
        <p className="text-body-s text-muted">every place on the map, at its local time</p>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="relative min-w-[560px]" style={{ height: 34 + lanes * 34 }}>
          {PERIODS.map((p) => {
            const Icon = PERIOD_ICON[p.key];
            return (
              <div key={p.key} className={`absolute inset-y-0 border-r border-white/5 ${shade[p.key]}`} style={{ left: `${(p.from / 24) * 100}%`, width: `${((p.to - p.from) / 24) * 100}%` }}>
                <span className="text-label absolute bottom-1.5 left-2 flex items-center gap-1 text-muted">
                  <Icon className="size-3" aria-hidden="true" /> {p.label}
                </span>
              </div>
            );
          })}
          {placed.map(({ m, c, x, lane }) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onOpen(m.key)}
              title={`${m.label} · ${c.label}`}
              aria-label={`${m.label}: ${m.count} ${m.count === 1 ? "builder" : "builders"}, ${c.label} there`}
              className="group absolute flex items-center gap-1 rounded-full border border-white/15 bg-[#0d1020] py-0.5 pr-2 pl-0.5 whitespace-nowrap transition-colors duration-120 hover:border-white/50"
              // Centred on its time, but kept inside the ribbon near midnight on either end.
              style={{ left: `${x * 100}%`, top: 6 + lane * 34, transform: `translateX(${x < 0.08 ? 0 : x > 0.92 ? -100 : -50}%)` }}
            >
              {m.avatars[0]?.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- small remote avatar
                <img src={m.avatars[0].image} alt="" className="size-5 rounded-full object-cover" />
              ) : (
                <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${c.night ? "bg-cobalt text-on-cobalt" : "bg-amber text-amber-ink"}`}>{m.avatars[0]?.handle[0] ?? "·"}</span>
              )}
              <span className={`font-mono text-[11px] ${c.night ? "text-cobalt" : "text-amber"}`}>{c.label}</span>
              {m.count > 1 && <span className="font-mono text-[10px] text-muted">×{m.count}</span>}
            </button>
          ))}
        </div>
        <div className="mt-1 flex min-w-[560px] justify-between font-mono text-[10px] text-muted" aria-hidden="true">
          {["12am", "6am", "12pm", "6pm", "12am"].map((h, i) => <span key={i}>{h}</span>)}
        </div>
      </div>
      {untimed > 0 && (
        <p className="mt-2 text-body-s text-muted">
          {untimed} {untimed === 1 ? "place spans" : "places span"} several time zones, so {untimed === 1 ? "it isn't" : "they aren't"} shown here.
        </p>
      )}
    </section>
  );
}
