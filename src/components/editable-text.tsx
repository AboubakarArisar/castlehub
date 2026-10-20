"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/actions/profile";
import { submitKeepingValues } from "@/lib/submit-keeping-values";

/**
 * Shows server-rendered text (children) with an "edit" link for its author.
 * Editing swaps in a textarea that saves through the given action.
 */
export function EditableText({
  initial,
  save,
  maxLength,
  children,
}: {
  initial: string;
  save: (prev: FormState, data: FormData) => Promise<FormState>;
  maxLength: number;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await save(prev, data);
    if (result.ok) setEditing(false);
    return result;
  }, {});

  if (!editing) {
    return (
      <div className="group/edit">
        {children}
        <button type="button" onClick={() => setEditing(true)} className="mt-1 text-body-s text-muted opacity-70 hover:text-ink hover:underline group-hover/edit:opacity-100">
          edit
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={submitKeepingValues(action)} className="mt-2">
      <textarea
        name="body"
        defaultValue={initial}
        maxLength={maxLength}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
        className="field-sizing-content min-h-20 w-full resize-y rounded-sm border border-line-strong bg-surface px-3 py-2 text-body focus:border-cobalt focus:outline-none"
      />
      {state.errors?.body && <p className="mt-1 text-body-s text-red" role="alert">{state.errors.body}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button type="submit" disabled={pending} className="h-8 rounded-sm bg-cobalt px-3 text-body-s font-semibold text-on-cobalt disabled:opacity-50">
          {pending ? "saving…" : "save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="h-8 rounded-sm border border-line px-3 text-body-s hover:border-line-strong">
          cancel
        </button>
        <span className="text-[11px] text-muted">Ctrl+Enter saves · Esc cancels</span>
      </div>
    </form>
  );
}
