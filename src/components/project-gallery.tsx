"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

type Img = { id: string; url: string };

/** Large image + thumbnails; click the image for a full-screen viewer (Esc closes, ←/→ browse). */
export function ProjectGallery({ images, name }: { images: Img[]; name: string }) {
  const [i, setI] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const many = images.length > 1;
  const go = (d: number) => setI((n) => (n + d + images.length) % images.length);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!el.open) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = images[i];
  const alt = `${name} screenshot ${i + 1} of ${images.length}`;
  const arrow =
    "grid size-10 place-items-center rounded-sm border border-line-strong bg-paper/90 text-ink shadow-sm transition-colors duration-120 hover:border-ink";

  return (
    <section aria-label={`${name} screenshots`} className="space-y-3">
      <div className="group relative border border-line-strong bg-surface-2">
        <button type="button" onClick={() => dialog.current?.showModal()} className="block w-full cursor-zoom-in" aria-label={`Open ${alt} full screen`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded screenshot */}
          <img src={current.url} alt={alt} className="aspect-video w-full object-contain" />
        </button>
        <span className="pointer-events-none absolute top-3 right-3 grid size-9 place-items-center rounded-sm bg-paper/90 text-ink opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
          <Maximize2 className="size-4" />
        </span>
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous screenshot" className={`${arrow} absolute top-1/2 left-3 -translate-y-1/2`}>
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next screenshot" className={`${arrow} absolute top-1/2 right-3 -translate-y-1/2`}>
              <ChevronRight className="size-5" />
            </button>
            <span className="text-count absolute bottom-3 left-3 rounded-sm bg-paper/90 px-2 py-1">
              {i + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, n) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Show screenshot ${n + 1}`}
              aria-current={n === i}
              className="shrink-0 border-2 border-transparent opacity-60 transition-[opacity,border-color] duration-120 hover:opacity-100 aria-[current=true]:border-cobalt aria-[current=true]:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of an uploaded screenshot */}
              <img src={img.url} alt="" className="h-16 w-28 bg-surface-2 object-cover" />
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialog}
        aria-label={`${name} screenshots`}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto h-dvh max-h-none w-dvw max-w-none bg-transparent p-0 backdrop:bg-black/85"
      >
        <div className="relative flex h-full w-full items-center justify-center p-4 md:p-12" onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
          {/* eslint-disable-next-line @next/next/no-img-element -- full-size uploaded screenshot */}
          <img src={current.url} alt={alt} className="max-h-full max-w-full object-contain" />
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="absolute top-4 right-4 grid size-11 place-items-center rounded-sm bg-white/10 text-white hover:bg-white/20">
            <X className="size-6" />
          </button>
          {many && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous screenshot" className="absolute top-1/2 left-4 grid size-11 -translate-y-1/2 place-items-center rounded-sm bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next screenshot" className="absolute top-1/2 right-4 grid size-11 -translate-y-1/2 place-items-center rounded-sm bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="size-6" />
              </button>
              <span className="text-count absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80">
                {i + 1} / {images.length}
              </span>
            </>
          )}
        </div>
      </dialog>
    </section>
  );
}
