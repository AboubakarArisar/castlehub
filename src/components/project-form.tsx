"use client";

import { useActionState } from "react";
import type { FormState } from "@/actions/profile";
import { ImageUpload } from "@/components/upload-field";
import { PROJECT_TYPES, TYPE_LABEL } from "@/lib/rules";

export type ProjectDefaults = {
  name: string;
  tagline: string;
  description: string;
  type: string;
  tags: string;
  websiteUrl: string;
  mediaUrl: string;
  iconUrl?: string;
  images: string[];
  launch: boolean;
};

const EMPTY: ProjectDefaults = {
  name: "", tagline: "", description: "", type: "", tags: "", websiteUrl: "", mediaUrl: "", images: [], launch: false,
};

const input =
  "mt-1.5 w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-body transition-colors duration-120 placeholder:text-muted/70 hover:border-ink/40 focus:border-cobalt focus:outline-none aria-[invalid=true]:border-red";

export function ProjectForm({
  action,
  defaults = EMPTY,
  submitLabel,
  launchHint,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  defaults?: ProjectDefaults;
  submitLabel: string;
  launchHint: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6 px-4 py-6 md:px-6" noValidate>
      {e.form && <p className="rounded-sm border border-red px-3 py-2 text-body text-red" role="alert">{e.form}</p>}

      <Field label="Name" error={e.name} id="name">
        <input id="name" name="name" defaultValue={defaults.name} maxLength={60} required aria-invalid={Boolean(e.name)} className={input} placeholder="skyhop" />
      </Field>

      <Field label="Tagline" hint="One line, up to 60 characters." error={e.tagline} id="tagline">
        <input id="tagline" name="tagline" defaultValue={defaults.tagline} maxLength={60} required aria-invalid={Boolean(e.tagline)} className={input} placeholder="A tiny platformer about climbing a castle in the clouds" />
      </Field>

      <fieldset>
        <legend className="text-body font-medium">Type</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROJECT_TYPES.map((t) => (
            <label key={t} className="cursor-pointer">
              <input type="radio" name="type" value={t} defaultChecked={defaults.type === t} className="peer sr-only" required />
              <span className="text-label inline-block rounded-sm border border-line px-2.5 py-1.5 text-muted transition-colors duration-120 peer-checked:border-cobalt peer-checked:bg-cobalt peer-checked:text-on-cobalt peer-focus-visible:outline-2 peer-focus-visible:outline-cobalt hover:border-line-strong">
                {TYPE_LABEL[t]}
              </span>
            </label>
          ))}
        </div>
        {e.type && <p className="mt-1.5 text-body-s text-red" role="alert">{e.type}</p>}
      </fieldset>

      <Field label="Description" hint="What it is, who it's for, what you'd like feedback on. Supports **bold**, *italic*, [links](https://…) and - lists." error={e.description} id="description">
        <textarea id="description" name="description" defaultValue={defaults.description} rows={7} maxLength={5000} required aria-invalid={Boolean(e.description)} className={`${input} field-sizing-content min-h-40 resize-y`} />
      </Field>

      <ImageUpload name="iconUrl" label="Icon" hint="Square works best. PNG, JPG, GIF or WebP up to 4 MB." initial={defaults.iconUrl ? [defaults.iconUrl] : []} error={e.iconUrl} />
      <ImageUpload name="images" label="Screenshots" hint="Up to 4 images, shown in a gallery." max={4} initial={defaults.images} error={e.images} />

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Website or play link" error={e.websiteUrl} id="websiteUrl">
          <input id="websiteUrl" name="websiteUrl" type="url" inputMode="url" defaultValue={defaults.websiteUrl} aria-invalid={Boolean(e.websiteUrl)} className={input} placeholder="https://" />
        </Field>
        <Field label="Video or audio link" hint="YouTube and Vimeo play inline." error={e.mediaUrl} id="mediaUrl">
          <input id="mediaUrl" name="mediaUrl" type="url" inputMode="url" defaultValue={defaults.mediaUrl} aria-invalid={Boolean(e.mediaUrl)} className={input} placeholder="https://youtu.be/…" />
        </Field>
      </div>

      <Field label="Tags" hint="Comma separated, up to 5." error={e.tags} id="tags">
        <input id="tags" name="tags" defaultValue={defaults.tags} aria-invalid={Boolean(e.tags)} className={input} placeholder="pixel art, platformer" />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 border border-line-strong p-4 has-checked:border-amber has-checked:bg-amber/10">
        <input type="checkbox" name="launch" defaultChecked={defaults.launch} className="mt-1 size-4 accent-[var(--cobalt)]" />
        <span>
          <span className="block text-body font-semibold">Enter this week&apos;s Launchpad</span>
          <span className="block text-body-s text-muted">{launchHint}</span>
        </span>
      </label>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-sm bg-cobalt px-6 text-body font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px disabled:opacity-50"
        >
          {pending ? "saving…" : submitLabel}
        </button>
        {Object.keys(e).length > 0 && <span className="text-body-s text-red">Fix the highlighted fields.</span>}
      </div>
    </form>
  );
}

function Field({ label, hint, error, id, children }: { label: string; hint?: string; error?: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-body font-medium">{label}</label>
      {hint && <span className="block text-body-s text-muted">{hint}</span>}
      {children}
      {error && <p className="mt-1.5 text-body-s text-red" role="alert">{error}</p>}
    </div>
  );
}
