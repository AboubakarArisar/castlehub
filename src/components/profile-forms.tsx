"use client";

import { useActionState } from "react";
import { claimHandle, updateProfile, type FormState } from "@/actions/profile";
import { ImageUpload } from "@/components/upload-field";
import { submitKeepingValues } from "@/lib/submit-keeping-values";

const input =
  "mt-1.5 w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-body transition-colors duration-120 placeholder:text-muted/70 hover:border-ink/40 focus:border-cobalt focus:outline-none aria-[invalid=true]:border-red";

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-body-s text-red" role="alert">{msg}</p> : null;
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(claimHandle, {});
  const e = state.errors ?? {};
  return (
    <form onSubmit={submitKeepingValues(action)} className="mt-8 space-y-5 text-left">
      <div>
        <label htmlFor="handle" className="text-body font-medium">Handle</label>
        <div className="mt-1.5 flex items-center rounded-sm border border-line-strong bg-surface focus-within:border-cobalt aria-[invalid=true]:border-red" aria-invalid={Boolean(e.handle)}>
          <span className="pl-3 font-mono text-body-s text-muted">castlehub/</span>
          <input id="handle" name="handle" required minLength={3} maxLength={30} autoComplete="username" autoCapitalize="none" spellCheck={false} className="w-full bg-transparent px-1 py-2.5 text-body focus:outline-none" placeholder="your-name" />
        </div>
        <p className="mt-1 text-body-s text-muted">3–30 letters, numbers or dashes. This is your profile address.</p>
        <Err msg={e.handle} />
      </div>
      <div>
        <label htmlFor="name" className="text-body font-medium">Display name</label>
        <input id="name" name="name" required maxLength={60} defaultValue={defaultName} aria-invalid={Boolean(e.name)} className={input} />
        <Err msg={e.name} />
      </div>
      <button type="submit" disabled={pending} className="h-11 w-full rounded-sm bg-cobalt text-body font-semibold text-on-cobalt disabled:opacity-50">
        {pending ? "claiming…" : "claim handle"}
      </button>
    </form>
  );
}

export function ProfileForm({
  defaults,
  zones,
}: {
  defaults: { name: string; headline: string; bio: string; website: string; skills: string; image: string | null; openToCollab: boolean; timezone: string };
  zones: string[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const e = state.errors ?? {};
  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-6 px-4 py-6 md:px-6">
      <ImageUpload name="image" label="Photo" hint="Defaults to your Slack photo." initial={defaults.image ? [defaults.image] : []} error={e.image} />
      <div>
        <label htmlFor="name" className="text-body font-medium">Name</label>
        <input id="name" name="name" required maxLength={60} defaultValue={defaults.name} aria-invalid={Boolean(e.name)} className={input} />
        <Err msg={e.name} />
      </div>
      <div>
        <label htmlFor="headline" className="text-body font-medium">Headline</label>
        <input id="headline" name="headline" maxLength={80} defaultValue={defaults.headline} placeholder="game dev · pixel art" aria-invalid={Boolean(e.headline)} className={input} />
        <Err msg={e.headline} />
      </div>
      <div>
        <label htmlFor="bio" className="text-body font-medium">Bio</label>
        <textarea id="bio" name="bio" maxLength={500} rows={4} defaultValue={defaults.bio} aria-invalid={Boolean(e.bio)} className={`${input} field-sizing-content min-h-24 resize-y`} />
        <Err msg={e.bio} />
      </div>
      <div>
        <label htmlFor="website" className="text-body font-medium">Website</label>
        <input id="website" name="website" type="url" inputMode="url" defaultValue={defaults.website} placeholder="https://" aria-invalid={Boolean(e.website)} className={input} />
        <Err msg={e.website} />
      </div>
      <div>
        <label htmlFor="skills" className="text-body font-medium">Skills</label>
        <span className="block text-body-s text-muted">Comma separated, up to 10.</span>
        <input id="skills" name="skills" defaultValue={defaults.skills} placeholder="typescript, godot, blender" aria-invalid={Boolean(e.skills)} className={input} />
        <Err msg={e.skills} />
      </div>
      <div>
        <label htmlFor="timezone" className="text-body font-medium">Timezone</label>
        <span className="block text-body-s text-muted">Decides which day your builds count for in your streak. Set from your browser when you first post.</span>
        <select id="timezone" name="timezone" defaultValue={defaults.timezone} aria-invalid={Boolean(e.timezone)} className={input}>
          <option value="">UTC (default)</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z.replaceAll("_", " ")}</option>
          ))}
        </select>
        <Err msg={e.timezone} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 border border-line-strong p-4 has-checked:border-green has-checked:bg-green/10">
        <input type="checkbox" name="openToCollab" defaultChecked={defaults.openToCollab} className="mt-1 size-4 accent-[var(--green)]" />
        <span>
          <span className="block text-body font-semibold">Open to collab</span>
          <span className="block text-body-s text-muted">Shows a badge on your profile and lists you when builders search for collaborators.</span>
        </span>
      </label>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <button type="submit" disabled={pending} className="h-11 rounded-sm bg-cobalt px-6 text-body font-semibold text-on-cobalt disabled:opacity-50">
          {pending ? "saving…" : "save profile"}
        </button>
        {state.ok && <span className="text-body-s text-green" role="status">Saved.</span>}
      </div>
    </form>
  );
}
