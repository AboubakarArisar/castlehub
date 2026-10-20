import { ExternalLink, Play } from "lucide-react";
import { embedUrl } from "@/lib/rules";

// A desktop-style window: square frame, mono title bar with a name and label.
export function MediaWindow({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="group overflow-hidden border border-line-strong bg-surface transition-colors duration-150 hover:border-ink/40">
      <figcaption className="flex h-7 items-center justify-between gap-2 border-b border-line-strong px-2.5">
        <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-line-strong transition-colors group-hover:bg-red" />
          <span className="size-2 rounded-full bg-line-strong transition-colors group-hover:bg-amber" />
          <span className="size-2 rounded-full bg-line-strong transition-colors group-hover:bg-green" />
        </span>
        <span className="min-w-0 truncate px-2 font-mono text-[11px] text-muted">{title}</span>
        <span className="text-label shrink-0 whitespace-nowrap text-muted">{label}</span>
      </figcaption>
      {children}
    </figure>
  );
}

export function ImageWindow({ src, alt, title, label }: { src: string; alt: string; title: string; label: string }) {
  return (
    <MediaWindow title={title} label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element -- user uploads (Vercel Blob or local) */}
      <img src={src} alt={alt} loading="lazy" className="max-h-[560px] w-full bg-surface-2 object-contain" />
    </MediaWindow>
  );
}

/** YouTube/Vimeo links play inline; any other media link becomes a button. */
export function MediaEmbed({ url, title }: { url: string; title: string }) {
  const embed = embedUrl(url);
  if (embed) {
    return (
      <MediaWindow title={title} label="video">
        <iframe
          src={embed}
          title={`${title} video`}
          className="aspect-video w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </MediaWindow>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex h-11 items-center gap-2 rounded-sm bg-ink px-4 font-mono text-[12px] tracking-[0.12em] text-paper uppercase transition-transform duration-120 hover:-translate-y-px"
    >
      <Play className="size-4" /> play / listen <ExternalLink className="size-3.5 opacity-70" />
    </a>
  );
}
