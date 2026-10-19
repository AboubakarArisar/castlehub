"use client";

import { useState } from "react";
import { Gamepad2, Pause, Play } from "lucide-react";
import type { Media } from "@/lib/demo";

const KIND_LABEL: Record<Media["kind"], string> = {
  game: "game",
  audio: "music",
  website: "website",
  video: "video",
  art: "art",
};

// A desktop-style window: square frame, mono title bar with the file name.
export function MediaWindow({ media }: { media: Media }) {
  return (
    <figure className="group overflow-hidden border border-line-strong bg-surface transition-colors duration-150 hover:border-ink/40">
      <figcaption className="flex h-7 items-center justify-between border-b border-line-strong px-2.5">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-line-strong transition-colors group-hover:bg-red" />
          <span className="size-2 rounded-full bg-line-strong transition-colors group-hover:bg-amber" />
          <span className="size-2 rounded-full bg-line-strong transition-colors group-hover:bg-green" />
        </span>
        <span className="min-w-0 truncate px-3 font-mono text-[11px] text-muted">{media.file}</span>
        <span className="text-label shrink-0 whitespace-nowrap text-muted">
          {KIND_LABEL[media.kind]} · demo
        </span>
      </figcaption>
      {media.kind === "game" && <GameScene />}
      {media.kind === "audio" && <AudioPlayer track={media.track} length={media.length} />}
      {media.kind === "video" && <VideoFrame length={media.length} />}
      {media.kind === "website" && <WebsiteShot url={media.url} />}
      {media.kind === "art" && <ArtTiles />}
    </figure>
  );
}

function GameScene() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video bg-[#9fd0ff]">
      <svg viewBox="0 0 160 90" className="absolute inset-0 size-full" shapeRendering="crispEdges" aria-label="Demo game screenshot: a pixel castle in the clouds" role="img">
        <rect width="160" height="90" fill="#9fd0ff" />
        {[[14, 14], [96, 9], [126, 24]].map(([x, y]) => (
          <g key={x} fill="#fff">
            <rect x={x} y={y + 2} width="22" height="5" />
            <rect x={x + 4} y={y} width="12" height="3" />
          </g>
        ))}
        <g fill="#5b6b8c">
          <rect x="98" y="30" width="34" height="48" />
          <rect x="98" y="26" width="6" height="5" />
          <rect x="112" y="26" width="6" height="5" />
          <rect x="126" y="26" width="6" height="5" />
          <rect x="108" y="12" width="14" height="18" />
          <rect x="108" y="8" width="4" height="5" />
          <rect x="118" y="8" width="4" height="5" />
        </g>
        <rect x="111" y="18" width="4" height="6" fill="#ffd34d" />
        <rect x="111" y="62" width="8" height="16" fill="#2c3550" />
        <g fill="#3f8f4f">
          <rect x="0" y="78" width="160" height="12" />
        </g>
        <g fill="#2f6e3c">
          {Array.from({ length: 20 }, (_, i) => (
            <rect key={i} x={i * 8} y="78" width="4" height="2" />
          ))}
        </g>
        <g fill="#8a5a3c">
          <rect x="30" y="58" width="24" height="5" />
          <rect x="62" y="44" width="20" height="5" />
        </g>
        <g>
          <rect x="38" y="48" width="7" height="10" fill="#16150f" />
          <rect x="39" y="50" width="5" height="3" fill="#ffd9b0" />
          <rect x="45" y="51" width="3" height="2" fill="#ff5a3c" />
        </g>
        <g fill="#ffd34d">
          <rect x="66" y="36" width="3" height="3" />
          <rect x="74" y="36" width="3" height="3" />
        </g>
      </svg>
      <div className="absolute top-2 left-2 font-mono text-[10px] text-[#16150f]">
        ♥♥♥ &nbsp;coins 12
      </div>
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-sm bg-[#16150f] px-3 py-2 font-mono text-[11px] tracking-[0.12em] text-white uppercase transition-transform duration-120 hover:-translate-y-px"
      >
        <Gamepad2 className="size-4" />
        {playing ? "loading demo…" : "play in browser"}
      </button>
    </div>
  );
}

const BARS = Array.from({ length: 64 }, (_, i) =>
  Math.round(18 + 70 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23))),
);

function AudioPlayer({ track, length }: { track: string; length: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="relative grid size-20 shrink-0 place-items-center bg-[#16150f]" aria-hidden="true">
        <div className="size-12 rounded-full border-[6px] border-[#ffb020]" />
        <div className="absolute size-2 rounded-full bg-[#f6f4ee]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-body font-medium">{track}</p>
          <span className="text-count shrink-0 whitespace-nowrap text-muted">
            {playing ? "0:12" : "0:00"} / {length}
          </span>
        </div>
        <div className="mt-2 flex h-12 items-end gap-[2px]" aria-hidden="true">
          {BARS.map((h, i) => (
            <span
              key={i}
              className={`w-full ${i < 6 && playing ? "bg-cobalt" : "bg-line-strong"} ${playing ? "animate-eq" : ""}`}
              style={{ height: `${h}%`, animationDelay: playing ? `${(i % 8) * 70}ms` : undefined }}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause demo track" : "Play demo track"}
        className="grid size-11 shrink-0 place-items-center rounded-sm bg-cobalt text-on-cobalt transition-transform duration-120 hover:-translate-y-px"
      >
        {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
      </button>
    </div>
  );
}

function VideoFrame({ length }: { length: string }) {
  return (
    <div className="relative aspect-video bg-[#101014]">
      <div className="absolute inset-3 grid gap-3 font-mono text-[10px] leading-4 sm:inset-4 sm:grid-cols-[1fr_1.4fr]" aria-hidden="true">
        <div className="hidden space-y-1 border border-white/10 p-2 text-[#ff6b70] sm:block">
          <p className="text-white/40">tests</p>
          <p>✕ checkout › applies coupon</p>
          <p className="text-[#3dd68c]">✓ cart › totals</p>
          <p className="text-[#3dd68c]">✓ auth › login</p>
        </div>
        <div className="space-y-1 border border-white/10 p-2 text-white/70">
          <p className="text-white/40">bugscout</p>
          <p>› bisecting 14 commits…</p>
          <p>› found a91c3e: “round coupon early”</p>
          <p>› writing issue #212 with repro</p>
          <p className="text-[#ffc04d]">› done in 42s</p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Play demo video"
        className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-white/90 text-[#16150f] transition-transform duration-150 hover:scale-105"
      >
        <Play className="ml-1 size-7" />
      </button>
      <span className="absolute right-3 bottom-3 bg-black/70 px-1.5 py-0.5 text-count text-white">{length}</span>
    </div>
  );
}

function WebsiteShot({ url }: { url: string }) {
  return (
    <div className="bg-[#fffaf0] p-5 text-[#16150f]" role="img" aria-label={`Demo screenshot of ${url}`}>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className="font-bold">tinyforms</span>
        <span className="opacity-60">pricing · docs · sign in</span>
      </div>
      <div className="mt-6 grid grid-cols-[1.2fr_1fr] items-center gap-5">
        <div>
          <p className="font-display text-[28px] leading-[28px] font-extrabold tracking-[-0.04em]">forms that fit in a tweet.</p>
          <p className="mt-2 text-[12px] opacity-70">Write questions in plain text. Get a form and a CSV.</p>
          <span className="mt-3 inline-block bg-[#16150f] px-3 py-1.5 text-[11px] text-white">make a form →</span>
        </div>
        <div className="border border-[#16150f] bg-white p-3 font-mono text-[10px] leading-5">
          <p>name?</p>
          <p>email? *</p>
          <p>what are you building?</p>
          <p className="mt-1 text-[#2448ff]">→ tinyforms.app/f/k3x9</p>
        </div>
      </div>
    </div>
  );
}

const TILE_COLORS = ["#16150f", "#2448ff", "#ffb020", "#f6f4ee"];

function ArtTiles() {
  return (
    <div className="bg-[#f6f4ee] p-4">
      <svg viewBox="0 0 6 6" className="mx-auto aspect-square w-full max-w-[420px]" role="img" aria-label="Demo artwork: quarter circles on a 6 by 6 grid">
        {Array.from({ length: 36 }, (_, i) => {
          const x = i % 6;
          const y = Math.floor(i / 6);
          const turn = (x * 3 + y * 5 + ((x * y) % 3)) % 4;
          const bg = TILE_COLORS[(x + y * 2) % 4];
          const fg = TILE_COLORS[(x * 2 + y + 1) % 4];
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${turn * 90} 0.5 0.5)`}>
              <rect width="1" height="1" fill={bg} />
              <path d="M0 0h1a1 1 0 0 1-1 1z" fill={fg === bg ? "#c9c4b6" : fg} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
