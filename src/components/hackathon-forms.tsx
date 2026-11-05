"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { FormState } from "@/actions/profile";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageUpload } from "@/components/upload-field";
import { FORMAT_HINT } from "@/lib/rich";
import { MAX_SCREENSHOTS } from "@/lib/hackathons";
import { submitKeepingValues } from "@/lib/submit-keeping-values";

// ── Times ──────────────────────────────────────────────────

const fmt = (iso: string, timeZone?: string) =>
  new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone }).format(new Date(iso));
const noSubscribe = () => () => {};

/** A time in the viewer's own timezone, labelled with the zone. The server renders UTC. */
export function LocalTime({ iso }: { iso: string }) {
  const local = useSyncExternalStore(noSubscribe, () => fmt(iso), () => null);
  const utc = fmt(iso, "UTC");
  return (
    <time dateTime={iso} title={utc} className="whitespace-nowrap">
      {local ?? utc}
    </time>
  );
}

// ── Shared form bits ───────────────────────────────────────

const input =
  "mt-1.5 w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-body transition-colors duration-120 placeholder:text-muted/70 hover:border-ink/40 focus:border-cobalt focus:outline-none aria-[invalid=true]:border-red";
const primary = "inline-flex h-11 items-center gap-2 rounded-sm bg-cobalt px-6 text-body font-semibold text-on-cobalt transition-transform duration-120 hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0";
const secondary = "inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong px-5 text-body font-semibold hover:border-ink disabled:opacity-50";

function Field({ label, need, hint, error, id, children }: { label: string; need?: "required" | "optional"; hint?: string; error?: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-body font-medium">
        {label}
        {need && <span className={`text-label ml-2 ${need === "required" ? "text-cobalt" : "text-muted"}`}>{need}</span>}
      </label>
      {hint && <span className="block text-body-s text-muted">{hint}</span>}
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-body-s text-red" role="alert">{error}</p>}
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-2 rounded-sm border border-red px-3 py-2 text-body text-red" role="alert">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {message}
    </p>
  );
}

/** Warn before closing or reloading the tab while the form has unsaved changes. */
function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/** Tells someone mid-edit that the deadline is near, or has just passed. */
function DeadlineNotice({ closesAt }: { closesAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  if (!closesAt || now === null) return null;
  const left = new Date(closesAt).getTime() - now;
  if (left <= 0) {
    return (
      <p className="flex items-start gap-2 rounded-sm border border-red bg-red/10 px-3 py-2 text-body text-red" role="alert">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        Submissions closed at <LocalTime iso={closesAt} /> while you were editing, so this form can no longer be saved. Copy anything you want to keep.
      </p>
    );
  }
  if (left > 3600_000) return null;
  return (
    <p className="rounded-sm border border-amber bg-amber/10 px-3 py-2 text-body" role="status">
      Heads up: submissions close in {Math.max(1, Math.round(left / 60_000))} min (<LocalTime iso={closesAt} />). Save before then.
    </p>
  );
}

// ── Member: submit or edit a build ─────────────────────────

export type BuildDefaults = {
  name: string;
  tagline: string;
  description: string;
  demoUrl: string;
  repoUrl: string;
  videoUrl: string;
  coverUrl: string | null;
  images: string[];
  tech: string;
};

export const EMPTY_BUILD: BuildDefaults = { name: "", tagline: "", description: "", demoUrl: "", repoUrl: "", videoUrl: "", coverUrl: null, images: [], tech: "" };

const LINK_FIELDS = ["demoUrl", "repoUrl", "videoUrl"] as const;

export function BuildForm({
  action,
  defaults = EMPTY_BUILD,
  submitLabel,
  closesAt,
  cancelHref,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  defaults?: BuildDefaults;
  submitLabel: string;
  closesAt: string | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [local, setLocal] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty && !pending);
  const e = { ...state.errors, ...local };
  const send = submitKeepingValues(formAction);

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(ev.currentTarget);
    const errs: Record<string, string> = {};
    if (!String(data.get("name") ?? "").trim()) errs.name = "Give your build a name";
    if (LINK_FIELDS.every((k) => !String(data.get(k) ?? "").trim())) errs.demoUrl = "Add at least one link: a live demo, the source code or a demo video";
    setLocal(errs);
    if (Object.keys(errs).length) {
      ev.preventDefault();
      ev.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    send(ev);
  }

  const invalid = (k: string) => (e[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  return (
    <form onSubmit={onSubmit} onChange={() => setDirty(true)} className="space-y-6 px-4 py-6 md:px-6" noValidate>
      <DeadlineNotice closesAt={closesAt} />
      <FormError message={e.form} />

      <Field label="Build name" need="required" error={e.name} id="name">
        <input id="name" name="name" defaultValue={defaults.name} maxLength={60} required className={input} placeholder="skyhop" {...invalid("name")} />
      </Field>

      <Field label="Tagline" need="optional" hint="One line, up to 100 characters." error={e.tagline} id="tagline">
        <input id="tagline" name="tagline" defaultValue={defaults.tagline} maxLength={100} className={input} placeholder="A tiny platformer about climbing a castle in the clouds" {...invalid("tagline")} />
      </Field>

      <fieldset className="space-y-4 border border-line p-4">
        <legend className="px-1 text-body font-medium">
          Links <span className="text-label ml-1 text-cobalt">at least one</span>
        </legend>
        <Field label="Live project or demo" error={e.demoUrl} id="demoUrl">
          <input id="demoUrl" name="demoUrl" type="url" inputMode="url" defaultValue={defaults.demoUrl} className={input} placeholder="https://" {...invalid("demoUrl")} />
        </Field>
        <Field label="Source code" error={e.repoUrl} id="repoUrl">
          <input id="repoUrl" name="repoUrl" type="url" inputMode="url" defaultValue={defaults.repoUrl} className={input} placeholder="https://github.com/…" {...invalid("repoUrl")} />
        </Field>
        <Field label="Demo video" hint="YouTube and Vimeo play on the page; other links open in a new tab." error={e.videoUrl} id="videoUrl">
          <input id="videoUrl" name="videoUrl" type="url" inputMode="url" defaultValue={defaults.videoUrl} className={input} placeholder="https://youtu.be/…" {...invalid("videoUrl")} />
        </Field>
      </fieldset>

      <Field label="Description" need="optional" hint={`What it does, how you built it, what you'd do next. ${FORMAT_HINT}`} error={e.description} id="description">
        <textarea id="description" name="description" defaultValue={defaults.description} rows={6} maxLength={5000} className={`${input} field-sizing-content min-h-32 resize-y`} {...invalid("description")} />
      </Field>

      <ImageUpload name="coverUrl" label="Cover image (optional)" hint="Shown on the gallery card. 16:9 works best. PNG, JPG, GIF or WebP up to 4 MB." initial={defaults.coverUrl ? [defaults.coverUrl] : []} error={e.coverUrl} />
      <ImageUpload name="images" label={`Screenshots (optional, up to ${MAX_SCREENSHOTS})`} max={MAX_SCREENSHOTS} initial={defaults.images} error={e.images} />

      <Field label="Technologies" need="optional" hint="Comma separated, up to 10." error={e.tech} id="tech">
        <input id="tech" name="tech" defaultValue={defaults.tech} className={input} placeholder="next.js, three.js, supabase" autoCapitalize="none" {...invalid("tech")} />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <button type="submit" disabled={pending} className={primary}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="text-body text-muted hover:text-ink">cancel</Link>
        {Object.keys(e).length > 0 && !pending && <span className="text-body-s text-red">Fix the highlighted fields.</span>}
      </div>
    </form>
  );
}

export function WithdrawButton({ action, name }: { action: (prev: FormState) => Promise<FormState>; name: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      <ConfirmButton
        message={`Withdraw ${name}? It will disappear from the gallery. You can submit again while the hackathon is open.`}
        disabled={pending}
        className="h-10 rounded-sm border border-red px-4 text-body font-semibold text-red transition-colors duration-120 hover:bg-red hover:text-paper disabled:opacity-50"
      >
        {pending ? "withdrawing…" : "withdraw build"}
      </ConfirmButton>
      {state.errors?.form && <p className="mt-2 text-body-s text-red" role="alert">{state.errors.form}</p>}
    </form>
  );
}

// ── Admin: create or edit an event ─────────────────────────

export type HackathonDefaults = {
  title: string;
  slug: string;
  summary: string;
  brief: string;
  theme: string;
  rules: string;
  prizes: string;
  linkUrl: string;
  coverUrl: string | null;
  opensAt: string;
  closesAt: string;
};

const slugFrom = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");

/** datetime-local typed in UTC, echoed back in the admin's own timezone. */
function UtcInput({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const valid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
  return (
    <Field label={label} need="required" hint="Enter the time in UTC." error={error} id={id}>
      <input id={id} name={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={input} aria-invalid={Boolean(error)} />
      {valid && (
        <span className="mt-1 block text-body-s text-muted">
          = <LocalTime iso={`${value}:00.000Z`} />
        </span>
      )}
    </Field>
  );
}

export function HackathonForm({
  action,
  defaults,
  published,
  isNew,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  defaults: HackathonDefaults;
  published: boolean;
  isNew: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [dirty, setDirty] = useState(false);
  const [slug, setSlug] = useState(defaults.slug);
  const slugTouched = useRef(!isNew);
  const [opensAt, setOpensAt] = useState(defaults.opensAt);
  const [closesAt, setClosesAt] = useState(defaults.closesAt);
  const [savedAt, setSavedAt] = useState(state);
  // Clear the dirty flag once a save succeeds (state changes only when an action returns).
  if (savedAt !== state) {
    setSavedAt(state);
    if (state.ok) setDirty(false);
  }
  useUnsavedWarning(dirty && !pending);
  const e = state.errors ?? {};

  return (
    <form onSubmit={submitKeepingValues(formAction)} onChange={() => setDirty(true)} className="space-y-6" noValidate>
      <FormError message={e.form} />
      {state.ok && !dirty && <p className="rounded-sm border border-green px-3 py-2 text-body" role="status">Saved.</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Title" need="required" error={e.title} id="title">
          <input
            id="title"
            name="title"
            defaultValue={defaults.title}
            maxLength={80}
            className={input}
            aria-invalid={Boolean(e.title)}
            onChange={(ev) => !slugTouched.current && setSlug(slugFrom(ev.target.value))}
          />
        </Field>
        <Field label="Address" need="required" hint={`castlehub…/hackathons/${slug || "…"}`} error={e.slug} id="slug">
          <input
            id="slug"
            name="slug"
            value={slug}
            maxLength={60}
            className={input}
            aria-invalid={Boolean(e.slug)}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(ev) => {
              slugTouched.current = true;
              setSlug(ev.target.value);
            }}
          />
        </Field>
      </div>

      <Field label="Short description" need="optional" hint="One or two sentences for the event card." error={e.summary} id="summary">
        <input id="summary" name="summary" defaultValue={defaults.summary} maxLength={200} className={input} aria-invalid={Boolean(e.summary)} />
      </Field>

      <div className="grid gap-6 md:grid-cols-2">
        <UtcInput id="opensAt" label="Submissions open" value={opensAt} onChange={setOpensAt} error={e.opensAt} />
        <UtcInput id="closesAt" label="Submissions close" value={closesAt} onChange={setClosesAt} error={e.closesAt} />
      </div>

      <Field label="Theme" need="optional" error={e.theme} id="theme">
        <input id="theme" name="theme" defaultValue={defaults.theme} maxLength={80} className={input} aria-invalid={Boolean(e.theme)} placeholder="castles in the sky" />
      </Field>

      <Field label="Brief" need="required" hint={`Needed before publishing. ${FORMAT_HINT}`} error={e.brief} id="brief">
        <textarea id="brief" name="brief" defaultValue={defaults.brief} rows={8} maxLength={10000} className={`${input} field-sizing-content min-h-40 resize-y`} aria-invalid={Boolean(e.brief)} />
      </Field>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Rules" need="optional" error={e.rules} id="rules">
          <textarea id="rules" name="rules" defaultValue={defaults.rules} rows={5} maxLength={5000} className={`${input} field-sizing-content min-h-28 resize-y`} aria-invalid={Boolean(e.rules)} />
        </Field>
        <Field label="Prizes" need="optional" error={e.prizes} id="prizes">
          <textarea id="prizes" name="prizes" defaultValue={defaults.prizes} rows={5} maxLength={2000} className={`${input} field-sizing-content min-h-28 resize-y`} aria-invalid={Boolean(e.prizes)} />
        </Field>
      </div>

      <Field label="Announcement or resources link" need="optional" error={e.linkUrl} id="linkUrl">
        <input id="linkUrl" name="linkUrl" type="url" inputMode="url" defaultValue={defaults.linkUrl} className={input} aria-invalid={Boolean(e.linkUrl)} placeholder="https://" />
      </Field>

      <ImageUpload name="coverUrl" label="Cover image (optional)" hint="16:9 works best. PNG, JPG, GIF or WebP up to 4 MB." initial={defaults.coverUrl ? [defaults.coverUrl] : []} error={e.coverUrl} />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {published ? (
          <button type="submit" name="intent" value="save" disabled={pending} className={primary}>
            {pending ? "saving…" : "save changes"}
          </button>
        ) : (
          <>
            <button type="submit" name="intent" value="save" disabled={pending} className={secondary}>
              {pending ? "saving…" : isNew ? "create draft" : "save draft"}
            </button>
            <button type="submit" name="intent" value="publish" disabled={pending} className={primary}>
              {isNew ? "create and publish" : "publish"}
            </button>
          </>
        )}
        {Object.keys(e).length > 0 && !pending && <span className="text-body-s text-red">Fix the highlighted fields.</span>}
      </div>
    </form>
  );
}
