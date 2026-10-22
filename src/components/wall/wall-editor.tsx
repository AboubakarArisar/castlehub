"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eraser, Minus, Pencil, Plus, Redo2, Send, Trash2, Undo2 } from "lucide-react";
import { drawStrokes, MAX_POINTS, MAX_STROKES, TILE_PX, type Stroke } from "@/lib/wall";

type Status = {
  review: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  hiddenReason: string | null;
  live: boolean;
  liveImage: string | null;
};
type Save = "saved" | "saving" | "unsaved" | "offline" | "error";

const SIZES = [3, 6, 12, 24, 48];
const PALETTE = ["#f1eee6", "#16150f", "#7b90ff", "#2448ff", "#ffc04d", "#e2622b", "#d64545", "#3dd68c", "#0e93b0", "#c58bff", "#8a6a4a", "#a29d92"];
const LOCAL = "castle-wall-draft";
const SCALE = 2; // backing pixels per tile pixel, for crisp lines on dense screens

/**
 * Drawing editor for your own square. Strokes are the source of truth: they autosave (debounced)
 * to the server and to this device, so a dropped connection or a closed tab doesn't lose work.
 * Submitting renders a 512×512 PNG for moderators; only an approved PNG appears on the wall.
 */
export function WallEditor({
  tile,
  initialStrokes,
  serverSavedAt,
  status,
}: {
  tile: { id: string; x: number; y: number };
  initialStrokes: Stroke[];
  serverSavedAt: number;
  status: Status;
}) {
  const router = useRouter();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");
  const [color, setColor] = useState(PALETTE[2]);
  const [size, setSize] = useState(6);
  const [zoom, setZoom] = useState(1);
  const [save, setSave] = useState<Save>("saved");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"" | "submitting" | "releasing">("");
  const current = useRef<Stroke | null>(null);
  const dirty = useRef(false);
  const total = strokes.reduce((n, s) => n + s.p.length / 2, 0);
  const full = strokes.length >= MAX_STROKES || total >= MAX_POINTS;

  const redraw = useCallback((list: Stroke[]) => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, TILE_PX * SCALE, TILE_PX * SCALE);
    drawStrokes(ctx, list, SCALE);
  }, []);
  useEffect(() => redraw(strokes), [strokes, redraw]);

  // Recover unsynced work left on this device (e.g. the tab closed while offline).
  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL) ?? "null");
      if (local?.tileId === tile.id && !local.synced && local.at > serverSavedAt && Array.isArray(local.strokes)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a local backup once mounted
        setStrokes(local.strokes);
        dirty.current = true;
        setSave("unsaved");
        setNotice("Restored changes that were saved on this device but hadn't reached the server yet.");
      }
    } catch {}
  }, [tile.id, serverSavedAt]);

  // Every change: back up locally at once, save to the server 1.5 s after drawing stops.
  const persistLocal = (list: Stroke[], synced: boolean) => {
    try {
      localStorage.setItem(LOCAL, JSON.stringify({ tileId: tile.id, strokes: list, at: Date.now(), synced }));
    } catch {}
  };
  const saveNow = useCallback(async (list: Stroke[]) => {
    setSave("saving");
    try {
      const res = await fetch("/api/wall/draft", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ strokes: list }) });
      if (!res.ok) {
        setSave("error");
        setNotice((await res.json().catch(() => null))?.error ?? "Couldn't save.");
        return false;
      }
      dirty.current = false;
      setSave("saved");
      try {
        const local = JSON.parse(localStorage.getItem(LOCAL) ?? "null");
        if (local?.tileId === tile.id) localStorage.setItem(LOCAL, JSON.stringify({ ...local, synced: true }));
      } catch {}
      return true;
    } catch {
      setSave("offline");
      return false;
    }
  }, [tile.id]);

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => saveNow(strokes), 1500);
    return () => clearTimeout(t);
  }, [strokes, saveNow]);

  // Offline: keep retrying every 8 s, and as soon as the browser says it's back online.
  useEffect(() => {
    if (save !== "offline") return;
    const retry = () => dirty.current && saveNow(strokes);
    const t = setInterval(retry, 8000);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", retry);
    };
  }, [save, strokes, saveNow]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const commit = (list: Stroke[]) => {
    dirty.current = true;
    setSave("unsaved");
    persistLocal(list, false);
    setStrokes(list);
  };
  const undo = () => {
    if (!strokes.length) return;
    setRedo((r) => [...r, strokes[strokes.length - 1]]);
    commit(strokes.slice(0, -1));
  };
  const redoOne = () => {
    if (!redo.length) return;
    commit([...strokes, redo[redo.length - 1]]);
    setRedo((r) => r.slice(0, -1));
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redoOne();
      else undo();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  // Pointer drawing: mouse, touch and stylus. touch-action:none on the canvas stops page scrolling.
  const toTile = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * TILE_PX), Math.round(((e.clientY - r.top) / r.height) * TILE_PX)];
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (full || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toTile(e);
    current.current = { c: color, w: size, ...(tool === "eraser" && { e: true }), p: [x, y] };
    const ctx = canvas.current!.getContext("2d")!;
    drawStrokes(ctx, [current.current], SCALE);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = current.current;
    if (!s) return;
    const ctx = canvas.current!.getContext("2d")!;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events) {
      const [x, y] = toTile(ev);
      const lx = s.p[s.p.length - 2];
      const ly = s.p[s.p.length - 1];
      if (Math.abs(x - lx) + Math.abs(y - ly) < 2 || s.p.length >= 19_998) continue;
      s.p.push(x, y);
      // Draw just the new segment; the full smoothed stroke is redrawn when it ends.
      ctx.globalCompositeOperation = s.e ? "destination-out" : "source-over";
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w * SCALE;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lx * SCALE, ly * SCALE);
      ctx.lineTo(x * SCALE, y * SCALE);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
  };
  const up = () => {
    const s = current.current;
    current.current = null;
    if (!s) return;
    setRedo([]);
    commit([...strokes, s]);
  };

  const submit = async () => {
    if (!strokes.length) return;
    setBusy("submitting");
    setNotice("");
    if (dirty.current && !(await saveNow(strokes))) {
      setBusy("");
      setNotice("Save failed, so nothing was submitted. Check your connection and try again.");
      return;
    }
    const off = document.createElement("canvas");
    off.width = TILE_PX;
    off.height = TILE_PX;
    drawStrokes(off.getContext("2d")!, strokes, 1);
    const png = await new Promise<Blob | null>((r) => off.toBlob(r, "image/png"));
    const form = new FormData();
    form.append("png", png!, "tile.png");
    form.append("strokes", JSON.stringify(strokes));
    const res = await fetch("/api/wall/submit", { method: "POST", body: form }).catch(() => null);
    setBusy("");
    if (res?.ok) {
      setNotice("Submitted! A moderator will review it before it appears on the wall.");
      router.refresh();
    } else setNotice((await res?.json().catch(() => null))?.error ?? "Couldn't submit. Check your connection and try again.");
  };

  const release = async () => {
    const msg = status.live
      ? "Release this square? Your artwork is removed from the wall and your drawing is deleted for good. Someone else can then claim the square. This can't be undone."
      : "Release this square? Your drawing is deleted for good and the square becomes free for someone else.";
    if (!window.confirm(msg)) return;
    setBusy("releasing");
    const res = await fetch("/api/wall/tile", { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      dirty.current = false;
      try {
        localStorage.removeItem(LOCAL);
      } catch {}
      router.push("/castle-wall");
      router.refresh();
    } else {
      setBusy("");
      setNotice("Couldn't release the square. Try again.");
    }
  };

  const tb = "grid size-11 shrink-0 place-items-center rounded-sm border border-line-strong transition-colors duration-120 hover:border-ink disabled:opacity-40 aria-pressed:border-cobalt aria-pressed:bg-cobalt aria-pressed:text-on-cobalt";
  const banner = status.hiddenReason
    ? { tone: "border-red/60 bg-red/10", text: `Hidden by moderators: ${status.hiddenReason}. Edit it and submit again for review.` }
    : status.review === "PENDING"
      ? { tone: "border-amber/60 bg-amber/10", text: status.live ? "Your new version is waiting for review. The approved version stays on the wall meanwhile." : "Submitted for review. A moderator will check it before it appears on the wall." }
      : status.review === "REJECTED"
        ? { tone: "border-red/60 bg-red/10", text: `Not approved: ${status.reviewNote ?? "this version can't go on the wall"}. Change it and submit again.` }
        : status.live
          ? { tone: "border-green/60 bg-green/10", text: "Your artwork is on the wall. Changes stay private until you submit them for review again." }
          : { tone: "border-line-strong bg-surface", text: "Only you can see this draft. Submit it for review when you're ready to put it on the wall." };

  return (
    <div className="dark min-h-[calc(100dvh-4rem)] bg-[#0b0b09] text-ink">
      <div className="mx-auto max-w-[1000px] px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/castle-wall" className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> back to the wall
          </Link>
          <p className="text-label text-muted">
            your square · {tile.x + 1},{tile.y + 1} ·{" "}
            <span aria-live="polite" className={save === "error" || save === "offline" ? "text-amber" : ""}>
              {save === "saved" ? "saved" : save === "saving" ? "saving…" : save === "unsaved" ? "unsaved changes" : save === "offline" ? "offline: saved on this device, retrying" : "not saved"}
            </span>
          </p>
        </div>

        <p className={`mt-3 rounded-sm border px-3 py-2 text-body-s ${banner.tone}`} role="status">{banner.text}</p>
        {notice && <p className="mt-2 text-body-s text-muted" role="status">{notice}</p>}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="overflow-auto rounded-sm border border-line bg-[#0f0f0c] p-3">
            <canvas
              ref={canvas}
              width={TILE_PX * SCALE}
              height={TILE_PX * SCALE}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              aria-label={`Drawing canvas for square ${tile.x + 1},${tile.y + 1}`}
              className="mx-auto block aspect-square touch-none cursor-crosshair bg-[conic-gradient(#1b1a16_25%,#151410_0_50%,#1b1a16_0_75%,#151410_0)] bg-[length:24px_24px] shadow-[0_0_0_1px_rgba(255,192,77,0.35)]"
              style={{ width: `min(100%, ${TILE_PX * zoom}px)`, maxWidth: "none", ...(zoom > 1 && { width: TILE_PX * zoom }) }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tools">
              <button type="button" aria-pressed={tool === "pencil"} onClick={() => setTool("pencil")} aria-label="Pencil" title="Pencil" className={tb}><Pencil className="size-4" /></button>
              <button type="button" aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")} aria-label="Eraser" title="Eraser" className={tb}><Eraser className="size-4" /></button>
              <button type="button" onClick={undo} disabled={!strokes.length} aria-label="Undo" title="Undo (Ctrl+Z)" className={tb}><Undo2 className="size-4" /></button>
              <button type="button" onClick={redoOne} disabled={!redo.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={tb}><Redo2 className="size-4" /></button>
              <button
                type="button"
                onClick={() => {
                  if (strokes.length && window.confirm("Clear the whole square? You can still undo this.")) {
                    setRedo([...strokes].reverse());
                    commit([]);
                  }
                }}
                disabled={!strokes.length}
                aria-label="Clear"
                title="Clear"
                className={tb}
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div>
              <p className="text-label mb-1.5 text-muted">brush</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Brush size">
                {SIZES.map((s) => (
                  <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} aria-label={`Brush size ${s}`} className={tb}>
                    <span className="rounded-full bg-current" style={{ width: Math.max(3, s / 2.2), height: Math.max(3, s / 2.2) }} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-label mb-1.5 text-muted">colour</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colour">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={color === c && tool === "pencil"}
                    aria-label={`Colour ${c}`}
                    onClick={() => {
                      setColor(c);
                      setTool("pencil");
                    }}
                    className="size-8 rounded-sm border border-line-strong aria-pressed:ring-2 aria-pressed:ring-amber aria-pressed:ring-offset-2 aria-pressed:ring-offset-[#0b0b09]"
                    style={{ background: c }}
                  />
                ))}
                <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-sm border border-dashed border-line-strong text-muted" title="Any colour">
                  <Plus className="size-4" />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      setTool("pencil");
                    }}
                    aria-label="Pick any colour"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-label text-muted">zoom</p>
              <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} aria-label="Zoom out" className={tb}><Minus className="size-4" /></button>
              <span className="text-count w-10 text-center">{zoom}x</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} aria-label="Zoom in" className={tb}><Plus className="size-4" /></button>
            </div>

            {full && <p className="text-body-s text-amber">This square has reached its detail limit. Undo or clear some strokes to keep drawing.</p>}

            <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
              <button type="button" onClick={submit} disabled={!strokes.length || busy !== ""} className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-amber font-semibold text-amber-ink disabled:opacity-50">
                <Send className="size-4" /> {busy === "submitting" ? "submitting…" : status.live ? "submit changes for review" : "submit for review"}
              </button>
              <button type="button" onClick={release} disabled={busy !== ""} className="h-10 rounded-sm text-body-s text-muted hover:text-red">
                {busy === "releasing" ? "releasing…" : "release this square"}
              </button>
            </div>
          </div>
        </div>

        {status.liveImage && (
          <div className="mt-6 flex items-center gap-3 text-body-s text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- the approved version currently on the wall */}
            <img src={status.liveImage} alt="Your approved artwork currently on the wall" className="size-16 rounded-sm border border-line bg-[#0f0f0c]" />
            <span>This is the version on the wall now.</span>
          </div>
        )}
      </div>
    </div>
  );
}
