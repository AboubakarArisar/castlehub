"use client";

import { useEffect, useRef, useState } from "react";

type Cell = { day: string; count: number } | null;

const SHADES = ["bg-surface-2", "bg-cobalt/30", "bg-cobalt/55", "bg-cobalt/80", "bg-cobalt"];
const shade = (n: number) => SHADES[n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const describe = (c: { day: string; count: number }) =>
  `${c.count === 0 ? "No builds" : `${c.count} ${c.count === 1 ? "build" : "builds"}`} on ${fmt(c.day)}`;

/**
 * GitHub-style build calendar: one square per day, Monday-first columns.
 * Hover, focus or tap a square to read its date and count (works on touch screens too).
 */
export function BuildCalendar({ weeks, label }: { weeks: Cell[][]; label: string }) {
  const [picked, setPicked] = useState<{ day: string; count: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // On narrow screens, start scrolled to the most recent weeks.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const pick = (e: React.SyntheticEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-day]");
    if (t) setPicked({ day: t.dataset.day!, count: Number(t.dataset.count) });
  };

  return (
    <figure className="m-0">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-grid min-w-max grid-cols-[auto_1fr] gap-x-2">
          <span />
          <div className="flex gap-[3px] text-[10px] text-muted" aria-hidden="true">
            {weeks.map((w, i) => {
              // Label the week a month starts in (never the partial first column, which would collide).
              const first = i > 0 ? w.find((c) => c && c.day.endsWith("-01")) : null;
              return (
                <span key={i} className="w-[11px] overflow-visible whitespace-nowrap">
                  {first ? MONTHS[Number(first.day.slice(5, 7)) - 1] : ""}
                </span>
              );
            })}
          </div>
          <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-[11px] text-muted" aria-hidden="true">
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div
            role="group"
            aria-label={label}
            className="flex gap-[3px]"
            onPointerOver={pick}
            onClick={pick}
            onFocus={pick}
            onPointerLeave={() => setPicked(null)}
          >
            {weeks.map((w, i) => (
              <div key={i} className="grid grid-rows-7 gap-[3px]">
                {w.map((c, j) =>
                  c ? (
                    <span
                      key={j}
                      data-day={c.day}
                      data-count={c.count}
                      title={describe(c)}
                      aria-label={describe(c)}
                      role="img"
                      className={`size-[11px] rounded-[2px] ${shade(c.count)} ${picked?.day === c.day ? "ring-1 ring-ink" : ""}`}
                    />
                  ) : (
                    <span key={j} className="size-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-body-s text-muted">
        <span aria-live="polite" className="min-h-[18px]">{picked ? describe(picked) : "Hover or tap a day"}</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          less
          {SHADES.map((s) => (
            <span key={s} className={`size-[11px] rounded-[2px] ${s}`} />
          ))}
          more
        </span>
      </figcaption>
    </figure>
  );
}
