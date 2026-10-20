"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

async function upload(file: File): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed. Try again.");
  return data.url;
}

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

/**
 * Uploads images one at a time to /api/upload and keeps their URLs in hidden
 * inputs named `name`, so the surrounding form submits URLs, not files.
 */
export function ImageUpload({
  name,
  initial = [],
  max = 1,
  label,
  hint,
  error,
  compact = false,
}: {
  name: string;
  initial?: string[];
  max?: number;
  label: string;
  hint?: string;
  error?: string;
  compact?: boolean;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setProblem(undefined);
    setBusy(true);
    try {
      const room = max - urls.length;
      const picked = [...files].slice(0, max === 1 ? 1 : room);
      const uploaded: string[] = [];
      for (const f of picked) uploaded.push(await upload(f));
      setUrls((u) => (max === 1 ? uploaded : [...u, ...uploaded].slice(0, max)));
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const shown = problem ?? error;
  const full = urls.length >= max && max > 1;

  return (
    <div>
      {!compact && <span className="text-body font-medium">{label}</span>}
      {hint && !compact && <span className="block text-body-s text-muted">{hint}</span>}
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-2"}`}>
        {urls.map((u) => (
          <div key={u} className="relative border border-line-strong bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded image */}
            <img src={u} alt="" className={compact ? "max-h-48 object-contain" : "size-24 object-cover"} />
            <button
              type="button"
              onClick={() => setUrls((list) => list.filter((x) => x !== u))}
              aria-label="Remove image"
              className="absolute top-1 right-1 grid size-7 place-items-center rounded-sm bg-ink text-paper"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {!full && (!compact || urls.length === 0) && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            className={
              compact
                ? "grid size-9 place-items-center rounded-sm text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-cobalt disabled:opacity-50"
                : "grid size-24 place-items-center border border-dashed border-line-strong text-muted transition-colors duration-120 hover:border-cobalt hover:text-cobalt disabled:opacity-50"
            }
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={max > 1}
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      {shown && <p className="mt-1.5 text-body-s text-red" role="alert">{shown}</p>}
    </div>
  );
}
