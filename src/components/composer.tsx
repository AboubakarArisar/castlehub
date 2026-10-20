"use client";

import { useActionState, useState } from "react";
import { createPost } from "@/actions/post";
import type { FormState } from "@/actions/profile";
import { Avatar } from "@/components/avatar";
import { ImageUpload } from "@/components/upload-field";
import { submitKeepingValues } from "@/lib/submit-keeping-values";

export function Composer({
  viewer,
  projects,
}: {
  viewer: { id: string; handle: string; image: string | null };
  projects: { id: string; name: string }[];
}) {
  // Remount the form after each successful post so every field resets.
  const [round, setRound] = useState(0);
  return <ComposerForm key={round} viewer={viewer} projects={projects} onPosted={() => setRound((r) => r + 1)} />;
}

function ComposerForm({
  viewer,
  projects,
  onPosted,
}: {
  viewer: { id: string; handle: string; image: string | null };
  projects: { id: string; name: string }[];
  onPosted: () => void;
}) {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await createPost(prev, data);
    if (result.ok) onPosted();
    return result;
  }, {});

  return (
    <form onSubmit={submitKeepingValues(action)} className="border-b border-line bg-surface px-4 py-4 md:px-6">
      <div className="flex gap-3">
        <Avatar seed={viewer.handle} src={viewer.image} label="Your avatar" />
        <div className="min-w-0 flex-1">
          <label htmlFor="composer" className="sr-only">
            Write a post
          </label>
          <textarea
            id="composer"
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="what are you building?"
            rows={2}
            maxLength={2000}
            className="field-sizing-content min-h-12 w-full resize-none bg-transparent pt-2 text-body-l placeholder:font-display placeholder:text-[19px] placeholder:font-bold placeholder:tracking-[-0.02em] placeholder:text-muted/70 focus:outline-none focus-visible:outline-none"
          />
          {state.errors?.body ? (
            <p className="text-body-s text-red" role="alert">{state.errors.body}</p>
          ) : (
            text.length > 0 && <p className="text-[11px] text-muted">**bold** · *italic* · `code` · [link](https://…) · @handle · - list</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-1 md:pl-[52px]">
        <ImageUpload name="imageUrl" label="Add image" compact error={state.errors?.imageUrl} />
        {projects.length > 0 && (
          <>
            <label htmlFor="composer-project" className="sr-only">
              Tag one of your projects
            </label>
            <select
              id="composer-project"
              name="projectId"
              defaultValue=""
              className="ml-1 h-9 max-w-36 min-w-0 rounded-sm border border-line bg-transparent px-1.5 font-mono text-[11px] tracking-[0.06em] text-muted uppercase hover:border-line-strong md:max-w-none md:px-2"
            >
              <option value="">no project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </>
        )}
        <span className={`mt-2.5 mr-2 ml-auto text-count md:mr-3 ${text.length > 1800 ? "text-red" : "text-muted"}`}>
          {text.length > 0 ? `${text.length}/2000` : ""}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-sm bg-cobalt px-4 text-body font-semibold text-on-cobalt transition-[transform,opacity] duration-120 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {pending ? "posting…" : "post"}
        </button>
      </div>
      {state.errors?.projectId && <p className="mt-1 text-body-s text-red md:pl-[52px]">{state.errors.projectId}</p>}
    </form>
  );
}
