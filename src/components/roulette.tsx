"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Dices, FastForward, MapPin, Sparkles } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ProjectIcon } from "@/components/project-row";
import { FILTERS, type Mode } from "@/lib/roulette";
import type { ReelFace, RouletteResult } from "@/lib/roulette-server";
import { TYPE_LABEL } from "@/lib/rules";
import appIcon from "../../public/brand/app-icon.png";

type Spin = {
  result: RouletteResult | null;
  reel?: ReelFace[];
  firstEncounter?: boolean;
  newRound?: boolean;
  remaining?: number;
  total: number;
};
type Phase = "idle" | "loading" | "rolling" | "revealed" | "empty" | "error";

const TILE = 76; // reel tile width
const GAP = 12;
const ROLL_MS = 2400;

// The round's seen ids live in sessionStorage (per tab), so a refresh mid-round keeps going.
const load = (mode: Mode): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(`roulette-seen-${mode}`) ?? "[]");
  } catch {
    return [];
  }
};
const save = (mode: Mode, ids: string[]) => {
  try {
    sessionStorage.setItem(`roulette-seen-${mode}`, JSON.stringify(ids.slice(-1000)));
  } catch {}
};

export function Roulette({ counts, signedIn }: { counts: { builders: number; projects: number }; signedIn: boolean }) {
  const [mode, setMode] = useState<Mode>("builders");
  const [filter, setFilter] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [spin, setSpin] = useState<Spin | null>(null);
  const [reel, setReel] = useState<ReelFace[]>([]);
  const [winnerAt, setWinnerAt] = useState(0);
  const [offset, setOffset] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [reduced, setReduced] = useState(false);
  const request = useRef(0);
  const last = useRef<Record<Mode, string | null>>({ builders: null, projects: null });
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the user's motion setting once mounted
    setReduced(mq.matches);
  }, []);

  const total = mode === "builders" ? counts.builders : counts.projects;
  const noun = mode === "builders" ? "builder" : "project";
  const busy = phase === "loading" || phase === "rolling";

  async function go() {
    if (busy) return; // one spin at a time, however fast the clicks
    const id = ++request.current;
    setPhase("loading");
    setRolling(false);
    setReel([]); // never show a previous spin's reel with a new result
    try {
      const res = await fetch("/api/roulette", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, filter, seen: load(mode), last: last.current[mode] }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: Spin = await res.json();
      if (id !== request.current) return; // a newer spin or a mode change superseded this one
      if (!data.result) {
        setSpin(data);
        setPhase("empty");
        return;
      }
      const pickedId = data.result.id;
      save(mode, data.newRound ? [pickedId] : [...load(mode), pickedId]);
      last.current[mode] = pickedId;
      setSpin(data);

      const faces = data.reel ?? [];
      if (reduced || faces.length === 0) {
        setPhase("revealed");
        return;
      }
      const winner: ReelFace =
        data.result.kind === "builder"
          ? { id: data.result.id, seed: data.result.handle, image: data.result.image, name: data.result.name ?? data.result.handle }
          : { id: data.result.id, seed: data.result.slug, image: data.result.iconUrl ?? data.result.cover, name: data.result.name };
      // A few real faces continue past the winner, so the strip never ends abruptly at the marker.
      setReel([...faces, winner, ...faces.slice(0, 5)]);
      setWinnerAt(faces.length);
      setOffset(0);
      setPhase("rolling");
      // Next frame: slide so the winner (the last tile) stops under the marker.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const w = viewport.current?.clientWidth ?? 320;
          setRolling(true);
          setOffset(w / 2 - (faces.length * (TILE + GAP) + TILE / 2));
        }),
      );
    } catch {
      if (id === request.current) setPhase("error");
    }
  }

  const finish = () => {
    if (phase !== "rolling") return;
    setRolling(false);
    setOffset(() => (viewport.current?.clientWidth ?? 320) / 2 - (winnerAt * (TILE + GAP) + TILE / 2));
    setPhase("revealed");
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    request.current++; // ignore any spin still in flight
    setMode(m);
    setFilter(null);
    setSpin(null);
    setReel([]);
    setPhase("idle");
  };

  return (
    <div className="px-4 py-6 md:px-6">
      {/* Mode switch */}
      <div className="flex items-center justify-between gap-3">
        <div role="group" aria-label="What to discover" className="inline-flex rounded-sm border border-line-strong p-0.5">
          {(["builders", "projects"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => switchMode(m)}
              className="h-9 rounded-[3px] px-3.5 text-body-s font-semibold text-muted transition-colors duration-120 aria-pressed:bg-ink aria-pressed:text-paper"
            >
              <span className="sm:hidden">{m === "builders" ? "Builders" : "Projects"}</span>
              <span className="hidden sm:inline">{m === "builders" ? "Builder Roulette" : "Project Roulette"}</span>
            </button>
          ))}
        </div>
        <p className="text-count text-muted" aria-live="polite">
          {total} {total === 1 ? noun : `${noun}s`} to discover
        </p>
      </div>

      {/* Filters */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter">
        {[{ key: null, label: mode === "builders" ? "All builders" : "All projects" }, ...FILTERS[mode]].map((f) => (
          <button
            key={f.key ?? "all"}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className="text-label inline-flex h-9 shrink-0 items-center rounded-sm border border-line px-3 text-muted transition-colors duration-120 hover:border-line-strong hover:text-ink aria-pressed:border-cobalt aria-pressed:bg-cobalt aria-pressed:text-on-cobalt"
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div className="relative mt-6 overflow-hidden rounded-sm border border-line bg-[radial-gradient(ellipse_at_50%_0%,rgba(123,144,255,0.14),transparent_60%)] px-4 py-8 text-center sm:px-8">
        {phase === "rolling" || (phase === "revealed" && reel.length > 0 && !reduced) ? (
          <Reel faces={reel} winnerAt={winnerAt} offset={offset} rolling={rolling} viewport={viewport} onDone={finish} projects={mode === "projects"} />
        ) : (
          <Castle shuffling={phase === "loading"} />
        )}

        {phase === "idle" && (
          <>
            <h2 className="mt-5 font-display text-[clamp(1.8rem,5vw,2.6rem)] leading-none font-extrabold tracking-[-0.04em]">
              Who&apos;s <span className="accent-serif text-amber">building</span> next?
            </h2>
            <p className="mt-2 text-body-l text-muted">One spin. One {noun}. A new discovery.</p>
          </>
        )}
        {phase === "error" && <p className="mt-5 text-body text-red">The castle gate jammed. Try spinning again.</p>}
        {phase === "empty" && (
          <div className="mt-5">
            <p className="font-display text-[22px] font-bold">
              {filter ? `No ${noun}s match this filter yet.` : `No ${noun}s to discover yet.`}
            </p>
            <p className="mt-1 text-body text-muted">
              {filter ? "Try another filter, or all of them." : mode === "builders" ? "Invite a friend from the SkyCastle Slack to join you." : "Be the first to publish one."}
            </p>
            {!filter && mode === "projects" && (
              <Link href="/projects/new" className="mt-3 inline-block text-body font-semibold text-cobalt hover:underline">publish a project →</Link>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {phase === "rolling" ? (
            <button type="button" onClick={finish} className="inline-flex h-12 items-center gap-2 rounded-sm border border-line-strong px-5 text-body font-semibold hover:border-ink">
              <FastForward className="size-4" /> skip
            </button>
          ) : (
            phase !== "revealed" && (
              <SpinButton onClick={go} busy={phase === "loading"} disabled={total === 0}>
                {phase === "idle" || phase === "empty" ? "Spin the Castle" : "Spin again"}
              </SpinButton>
            )
          )}
        </div>
        {total === 0 && phase === "idle" && <p className="mt-3 text-body-s text-muted">Nobody to discover yet: the castle is just getting started.</p>}
      </div>

      {phase === "revealed" && spin?.result && (
        <div className="mt-5 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
          {spin.newRound && (
            <p className="mb-3 text-center text-body-s text-muted" role="status">
              You&apos;ve met every {noun} in the last round, so a fresh one begins.
            </p>
          )}
          {spin.result.kind === "builder" ? <BuilderReveal b={spin.result} first={Boolean(spin.firstEncounter)} /> : <ProjectReveal p={spin.result} first={Boolean(spin.firstEncounter)} />}
          <div className="mt-4 flex flex-col items-center gap-2">
            <SpinButton onClick={go} busy={false}>Spin again</SpinButton>
            <p className="text-body-s text-muted">
              {spin.total === 1
                ? `That's the only ${noun} here for now.`
                : spin.remaining
                  ? `${spin.remaining} more ${spin.remaining === 1 ? noun : `${noun}s`} to meet this round`
                  : `That's everyone this round. The next spin starts a new one.`}
              {!signedIn && " · Sign in to keep track of first encounters."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SpinButton({ onClick, busy, disabled, children }: { onClick: () => void; busy: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="inline-flex h-14 min-w-56 items-center justify-center gap-2.5 rounded-sm bg-amber px-7 font-display text-[19px] font-extrabold tracking-[-0.02em] text-amber-ink shadow-[0_3px_0_var(--ink)] transition-transform duration-120 hover:-translate-y-px active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <Dices className={`size-5 ${busy ? "motion-safe:animate-castle-shuffle" : ""}`} aria-hidden="true" />
      {busy ? "Shuffling…" : children}
    </button>
  );
}

/** The CastleHub castle on a slowly turning ring: bobs when idle, shakes while shuffling. */
function Castle({ shuffling }: { shuffling: boolean }) {
  return (
    <div className="relative mx-auto grid size-40 place-items-center sm:size-44" aria-hidden="true">
      <div className="animate-ring absolute inset-0 rounded-full border-2 border-dashed border-cobalt/40" />
      <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,192,77,0.18),transparent_70%)]" />
      <Image src={appIcon} alt="" className={`size-24 ${shuffling ? "animate-castle-shuffle" : "animate-castle-float"}`} priority />
    </div>
  );
}

/** A strip of real faces that slows to a stop on the picked one, under a gold marker. */
function Reel({
  faces,
  winnerAt,
  offset,
  rolling,
  viewport,
  onDone,
  projects,
}: {
  faces: ReelFace[];
  winnerAt: number;
  offset: number;
  rolling: boolean;
  viewport: React.RefObject<HTMLDivElement | null>;
  onDone: () => void;
  projects: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 border-x-[9px] border-t-[11px] border-x-transparent border-t-amber" aria-hidden="true" />
      <div ref={viewport} className="overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_18%,#000_82%,transparent)]" aria-hidden="true">
        <div
          className="flex"
          style={{
            gap: GAP,
            transform: `translateX(${offset}px)`,
            transition: rolling ? `transform ${ROLL_MS}ms cubic-bezier(0.15, 0.7, 0.12, 1)` : "none",
          }}
          onTransitionEnd={(e) => e.target === e.currentTarget && onDone()}
        >
          {faces.map((f, i) => (
            <div key={i} className={`shrink-0 rounded-sm transition-transform duration-300 ${!rolling && i === winnerAt ? "scale-110 ring-2 ring-amber" : !rolling ? "opacity-40" : ""}`} style={{ width: TILE }}>
              {projects ? <ProjectIcon name={f.name} src={f.image} size={TILE} /> : <Avatar seed={f.seed} src={f.image} size={TILE} />}
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">Spinning…</p>
    </div>
  );
}

/** Castle battlements along the top edge of a reveal card. */
const Battlements = () => (
  <div className="h-2.5 bg-[repeating-linear-gradient(90deg,var(--amber)_0_16px,transparent_16px_28px)] opacity-80" aria-hidden="true" />
);

function FirstEncounter() {
  return (
    <span className="text-label inline-flex items-center gap-1 rounded-sm bg-amber px-2 py-1 text-amber-ink motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in motion-safe:delay-200 motion-safe:duration-500 motion-safe:fill-mode-both">
      <Sparkles className="size-3.5" aria-hidden="true" /> First Encounter!
    </span>
  );
}

function BuilderReveal({ b, first }: { b: Extract<RouletteResult, { kind: "builder" }>; first: boolean }) {
  return (
    <article aria-labelledby="reveal-h" className="overflow-hidden rounded-sm border border-amber/50 bg-surface shadow-[0_20px_60px_-30px_rgba(255,192,77,0.35)]">
      <Battlements />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar seed={b.handle} src={b.image} size={96} label={`${b.name ?? b.handle}'s avatar`} />
          <div className="min-w-0 flex-1">
            {first && <FirstEncounter />}
            <h3 id="reveal-h" className="mt-1.5 font-display text-[28px] leading-8 font-extrabold tracking-[-0.03em] break-words">{b.name ?? b.handle}</h3>
            <p className="text-body text-muted">@{b.handle}{b.headline ? ` · ${b.headline}` : ""}</p>
            {b.location && (
              <p className="mt-1 inline-flex items-center gap-1 text-body-s text-amber">
                <MapPin className="size-3.5" aria-hidden="true" /> building from {b.location}
              </p>
            )}
          </div>
        </div>
        {b.bio && <p className="mt-4 text-body whitespace-pre-wrap text-muted">{b.bio}</p>}
        {b.skills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills">
            {b.skills.map((s) => <li key={s} className="rounded-sm border border-line px-2 py-1 text-body-s">{s}</li>)}
          </ul>
        )}
        {b.projects.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-line pt-4" aria-label="Recent projects">
            {b.projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/${b.handle}/${p.slug}`} className="flex items-center gap-3 rounded-sm p-1.5 hover:bg-surface-2">
                  <ProjectIcon name={p.name} src={p.iconUrl} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[15px] font-bold">{p.name}</span>
                    <span className="block truncate text-body-s text-muted">{p.tagline}</span>
                  </span>
                  <span className="text-label ml-auto shrink-0 text-muted">{TYPE_LABEL[p.type]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-line pt-4 text-body-s text-muted">No projects yet. Say hi and ask what they&apos;re working on.</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/${b.handle}`} className="inline-flex h-11 items-center gap-2 rounded-sm bg-cobalt px-5 text-body font-semibold text-on-cobalt">
            View profile <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProjectReveal({ p, first }: { p: Extract<RouletteResult, { kind: "project" }>; first: boolean }) {
  const href = `/${p.owner.handle}/${p.slug}`;
  return (
    <article aria-labelledby="reveal-h" className="overflow-hidden rounded-sm border border-amber/50 bg-surface shadow-[0_20px_60px_-30px_rgba(255,192,77,0.35)]">
      <Battlements />
      <div className={`relative bg-surface-2 ${p.cover ? "aspect-[16/8]" : "h-36"}`}>
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded project screenshot
          <img src={p.cover} alt={`${p.name} screenshot`} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_40%,rgba(123,144,255,0.25),transparent_65%)]">
            <ProjectIcon name={p.name} src={p.iconUrl} size={88} />
          </div>
        )}
      </div>
      <div className="p-5 sm:p-6">
        {first && <FirstEncounter />}
        <h3 id="reveal-h" className="mt-1.5 font-display text-[28px] leading-8 font-extrabold tracking-[-0.03em] break-words">{p.name}</h3>
        <p className="mt-1 text-body-l text-muted">{p.tagline}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Category and tags">
          <li className="text-label rounded-sm bg-amber px-2 py-1 text-amber-ink">{TYPE_LABEL[p.type]}</li>
          {p.tags.map((t) => <li key={t} className="text-label rounded-sm border border-line px-2 py-1 text-muted">#{t}</li>)}
        </ul>
        {p.description && <p className="mt-3 text-body text-muted">{p.description}</p>}
        <Link href={`/${p.owner.handle}`} className="mt-4 flex items-center gap-2.5 border-t border-line pt-4 text-body hover:underline">
          <Avatar seed={p.owner.handle} src={p.owner.image} size={28} /> built by <span className="font-semibold">{p.owner.name ?? p.owner.handle}</span>
        </Link>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={href} className="inline-flex h-11 items-center gap-2 rounded-sm bg-cobalt px-5 text-body font-semibold text-on-cobalt">
            Explore project <ArrowRight className="size-4" />
          </Link>
          <Link href={`/${p.owner.handle}`} className="inline-flex h-11 items-center rounded-sm border border-line-strong px-5 text-body font-semibold hover:border-ink">
            View builder
          </Link>
        </div>
      </div>
    </article>
  );
}
