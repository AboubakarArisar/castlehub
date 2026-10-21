"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Pause, Play, RotateCcw, Send, Square, Trash2, X } from "lucide-react";
import { MAX_VOICE_SECONDS } from "@/lib/audio";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SPEEDS = [1, 1.5, 2] as const;

/**
 * Compact audio player: play/pause, a seekable progress bar, position / length, and speed.
 * Starting one player pauses any other on the page. Never autoplays. `duration` comes from the
 * server (MediaRecorder WebM files don't carry their own length).
 */
export function AudioPlayer({ src, duration, label }: { src: string; duration: number; label: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const other = (e: Event) => {
      if ((e as CustomEvent).detail !== src) audio.current?.pause();
    };
    window.addEventListener("voice:play", other);
    return () => window.removeEventListener("voice:play", other);
  }, [src]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent("voice:play", { detail: src }));
      if (time >= duration - 0.05) a.currentTime = 0;
      a.playbackRate = speed;
      a.play().catch(() => setFailed(true));
    } else a.pause();
  };

  return (
    <div className="flex min-w-0 items-center gap-2.5" role="group" aria-label={label}>
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(duration);
        }}
        onTimeUpdate={(e) => setTime(Math.min(duration, e.currentTarget.currentTime))}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-cobalt text-on-cobalt transition-transform duration-120 active:scale-95"
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 translate-x-px fill-current" />}
      </button>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.1}
        value={time}
        onChange={(e) => {
          const t = Number(e.target.value);
          setTime(t);
          if (audio.current) audio.current.currentTime = t;
        }}
        aria-label="Position"
        aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--cobalt)]"
      />
      <span className="text-count shrink-0 text-muted tabular-nums">
        {fmt(time)} / {fmt(duration)}
      </span>
      <button
        type="button"
        onClick={() => {
          const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
          setSpeed(next);
          if (audio.current) audio.current.playbackRate = next;
        }}
        aria-label={`Playback speed ${speed}x`}
        className="h-8 shrink-0 rounded-sm border border-line px-1.5 font-mono text-[11px] text-muted hover:border-line-strong hover:text-ink"
      >
        {speed}x
      </button>
      {failed && <span className="sr-only" role="alert">This recording couldn&apos;t be played.</span>}
    </div>
  );
}

/** A published voice comment, streamed through /api/voice/[id] (404 once deleted). */
export function VoicePlayer({ id, duration, author }: { id: string; duration: number; author: string }) {
  return <AudioPlayer src={`/api/voice/${id}`} duration={duration} label={`Voice comment from ${author}, ${fmt(duration)}`} />;
}

type Phase = "starting" | "recording" | "paused" | "preview" | "uploading" | "error";

function pickMime() {
  for (const m of ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"]) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "";
}

/**
 * Record (up to 60 s), pause/resume where supported, preview, re-record or discard, then publish.
 * The microphone is only requested when this opens (after the builder taps the mic button) and is
 * released as soon as recording stops, is discarded, or the component goes away.
 */
export function VoiceRecorder({ target, onClose }: { target: { postId: string } | { projectId: string }; onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("starting");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const tick = useRef<{ last: number; total: number }>({ last: 0, total: 0 });

  const release = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  const start = async () => {
    setError("");
    setElapsed(0);
    tick.current = { last: 0, total: 0 };
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice comments aren't supported in this browser. You can still write a comment.");
      setPhase("error");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(denied ? "Microphone access is blocked. Allow it in your browser's site settings to record." : "Couldn't start the microphone. Check that one is connected.");
      setPhase("error");
      return;
    }
    const mime = pickMime();
    const r = new MediaRecorder(stream.current, { ...(mime && { mimeType: mime }), audioBitsPerSecond: 48_000 });
    const mine: Blob[] = [];
    chunks.current = mine;
    // Handlers belong to this recorder only: a previous one finishing late can't leak into this take.
    r.ondataavailable = (e) => e.data.size && mine.push(e.data);
    r.onstop = () => {
      if (rec.current !== r) return;
      release();
      const blob = new Blob(mine, { type: r.mimeType || mime || "audio/webm" });
      setPreview({ url: URL.createObjectURL(blob), blob });
      setPhase("preview");
    };
    rec.current = r;
    r.start(250);
    tick.current.last = performance.now();
    setPhase("recording");
  };

  // Start right away: opening the recorder is the builder's explicit choice to record.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- begin recording once mounted
    start();
    return () => {
      const r = rec.current;
      rec.current = null;
      if (r) {
        r.ondataavailable = null;
        r.onstop = null;
        if (r.state !== "inactive") r.stop();
      }
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer, and the hard stop at 60 seconds.
  useEffect(() => {
    if (phase !== "recording") return;
    tick.current.last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      tick.current.total += (now - tick.current.last) / 1000;
      tick.current.last = now;
      setElapsed(tick.current.total);
      if (tick.current.total >= MAX_VOICE_SECONDS) rec.current?.stop();
    }, 100);
    return () => clearInterval(t);
  }, [phase]);

  // Leaving the tab mid-recording stops it (the take is kept for preview).
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden" && (phase === "recording" || phase === "paused")) rec.current?.stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [phase]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const canPause = typeof MediaRecorder !== "undefined" && "pause" in MediaRecorder.prototype;

  const discard = () => {
    if (rec.current?.state !== "inactive") {
      rec.current!.onstop = null;
      rec.current?.stop();
    }
    release();
    onClose();
  };

  const publish = async () => {
    if (!preview) return;
    setPhase("uploading");
    setError("");
    const ext = preview.blob.type.includes("mp4") ? "m4a" : preview.blob.type.includes("ogg") ? "ogg" : "webm";
    const form = new FormData();
    form.append("audio", preview.blob, `voice.${ext}`);
    for (const [k, v] of Object.entries(target)) form.append(k, v);
    const res = await fetch("/api/voice-comments", { method: "POST", body: form }).catch(() => null);
    if (res?.ok) {
      onClose();
      router.refresh();
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "Couldn't publish. Check your connection and try again.");
    setPhase("preview");
  };

  const btn = "grid size-11 shrink-0 place-items-center rounded-sm border border-line-strong text-ink transition-colors duration-120 hover:border-ink";

  return (
    <div className="rounded-sm border border-line-strong bg-surface p-3" role="region" aria-label="Voice comment recorder">
      {(phase === "recording" || phase === "paused" || phase === "starting") && (
        <div className="flex items-center gap-3">
          <span className={`size-3 shrink-0 rounded-full ${phase === "recording" ? "bg-red motion-safe:animate-pulse" : "bg-muted"}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-body-s font-semibold" aria-live="polite">
              {phase === "starting" ? "Starting the microphone…" : phase === "paused" ? "Paused" : "Recording"}{" "}
              <span className="font-mono font-normal text-muted tabular-nums">{fmt(elapsed)} / {fmt(MAX_VOICE_SECONDS)}</span>
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-red transition-[width] duration-100" style={{ width: `${Math.min(100, (elapsed / MAX_VOICE_SECONDS) * 100)}%` }} />
            </div>
          </div>
          {canPause && phase !== "starting" && (
            <button
              type="button"
              onClick={() => {
                if (phase === "recording") {
                  rec.current?.pause();
                  setPhase("paused");
                } else {
                  rec.current?.resume();
                  setPhase("recording");
                }
              }}
              aria-label={phase === "paused" ? "Resume recording" : "Pause recording"}
              className={btn}
            >
              {phase === "paused" ? <Mic className="size-4" /> : <Pause className="size-4" />}
            </button>
          )}
          <button type="button" onClick={() => rec.current?.stop()} disabled={phase === "starting"} aria-label="Stop recording" className="grid size-11 shrink-0 place-items-center rounded-sm bg-red text-white disabled:opacity-50">
            <Square className="size-4 fill-current" />
          </button>
          <button type="button" onClick={discard} aria-label="Cancel recording" className={btn}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {(phase === "preview" || phase === "uploading") && preview && (
        <div className="space-y-3">
          <AudioPlayer src={preview.url} duration={Math.max(0.1, Math.min(elapsed, MAX_VOICE_SECONDS))} label="Your recording" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={discard} disabled={phase === "uploading"} className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-body-s font-semibold hover:border-ink disabled:opacity-50">
              <Trash2 className="size-4" /> discard
            </button>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
                start();
              }}
              disabled={phase === "uploading"}
              className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-body-s font-semibold hover:border-ink disabled:opacity-50"
            >
              <RotateCcw className="size-4" /> re-record
            </button>
            <button type="button" onClick={publish} disabled={phase === "uploading"} className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-sm bg-cobalt px-4 text-body-s font-semibold text-on-cobalt disabled:opacity-60">
              <Send className="size-4" /> {phase === "uploading" ? "posting…" : "post voice comment"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3" role="alert">
          <p className="min-w-0 flex-1 text-body-s text-red">{error}</p>
          {phase === "error" && (
            <button type="button" onClick={onClose} className="h-9 shrink-0 rounded-sm border border-line-strong px-3 text-body-s hover:border-ink">
              close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
