"use client";

import { useRef, useState } from "react";
import { AudioLines, Clapperboard, ImagePlus, Link2, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { me } from "@/lib/demo";

type Draft = { id: number; text: string; image?: string; project: string };

// Prototype composer: posts stay in this browser tab and are never saved.
export function Composer() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string>();
  const [project, setProject] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = text.trim().length > 0 || !!image;

  function post(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setDrafts((d) => [{ id: Date.now(), text: text.trim(), image, project }, ...d]);
    setText("");
    setImage(undefined);
    setProject("");
  }

  return (
    <>
      <form onSubmit={post} className="border-b border-line bg-surface px-4 py-4 md:px-6">
        <div className="flex gap-3">
          <Avatar seed={me.handle} label="Your avatar" />
          <div className="min-w-0 flex-1">
            <label htmlFor="composer" className="sr-only">
              Write a post
            </label>
            <textarea
              id="composer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="what are you building?"
              rows={2}
              maxLength={2000}
              className="field-sizing-content min-h-12 w-full resize-none bg-transparent pt-2 text-body-l placeholder:font-display placeholder:text-[19px] placeholder:font-bold placeholder:tracking-[-0.02em] placeholder:text-muted/70 focus:outline-none focus-visible:outline-none"
            />
            {image && (
              <div className="relative mt-2 inline-block border border-line-strong">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
                <img src={image} alt="Selected image preview" className="max-h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  aria-label="Remove image"
                  className="absolute top-1 right-1 grid size-7 place-items-center rounded-sm bg-ink text-paper"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-0.5 md:gap-1 md:pl-[52px]">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setImage(URL.createObjectURL(f));
              e.target.value = "";
            }}
          />
          <Attach label="Add image" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-[18px]" />
          </Attach>
          <Attach label="Add video (coming soon)" disabled>
            <Clapperboard className="size-[18px]" />
          </Attach>
          <Attach label="Add audio (coming soon)" disabled>
            <AudioLines className="size-[18px]" />
          </Attach>
          <Attach label="Add link (coming soon)" disabled>
            <Link2 className="size-[18px]" />
          </Attach>

          <label htmlFor="composer-project" className="sr-only">
            Tag one of your projects
          </label>
          <select
            id="composer-project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="ml-1 h-9 min-w-0 max-w-28 rounded-sm border border-line bg-transparent px-1.5 font-mono text-[11px] tracking-[0.06em] text-muted uppercase hover:border-line-strong md:max-w-none md:px-2"
          >
            <option value="">no project</option>
            <option value="skyhop">skyhop</option>
            <option value="tapesynth">tapesynth</option>
          </select>

          <span className={`ml-auto mr-2 text-count md:mr-3 ${text.length > 1800 ? "text-red" : "text-muted"}`}>
            {text.length > 0 ? `${text.length}/2000` : ""}
          </span>
          <button
            type="submit"
            disabled={!ready}
            className="h-9 rounded-sm bg-cobalt px-4 text-body font-semibold text-on-cobalt transition-[transform,opacity] duration-120 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            post
          </button>
        </div>
      </form>

      {drafts.map((d) => (
        <article key={d.id} className="flex gap-3 border-b border-line bg-cobalt/5 px-4 py-5 md:px-6">
          <Avatar seed={me.handle} />
          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-body font-semibold">{me.name}</span>
              <span className="text-body-s text-muted">@{me.handle} · just now</span>
              <span className="text-label ml-auto rounded-sm border border-cobalt px-1.5 py-0.5 text-cobalt">
                not saved · prototype
              </span>
            </header>
            {d.text && <p className="mt-2 text-body-l whitespace-pre-wrap">{d.text}</p>}
            {d.image && (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
              <img src={d.image} alt="Image attached to your post" className="mt-3 max-h-96 border border-line-strong" />
            )}
            {d.project && <p className="text-label mt-3 text-muted">tagged · {d.project}</p>}
          </div>
        </article>
      ))}
    </>
  );
}

function Attach({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-sm text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-cobalt disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}
