"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, resetPassword, signUp, type AuthState, type ResetState } from "@/actions/auth";
import { SECURITY_QUESTIONS } from "@/lib/rules";
import { submitKeepingValues } from "@/lib/submit-keeping-values";

const input =
  "mt-1.5 w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-body transition-colors duration-120 hover:border-ink/40 focus:border-cobalt focus:outline-none";
const submit =
  "h-12 w-full rounded-sm bg-ink text-body-l font-semibold text-paper shadow-[0_2px_0_var(--cobalt)] transition-transform duration-120 hover:-translate-y-px disabled:opacity-50";

function FormError({ msg }: { msg?: string }) {
  return msg ? <p className="rounded-sm border border-red px-3 py-2 text-body text-red" role="alert">{msg}</p> : null;
}

function Email({ defaultValue, readOnly }: { defaultValue?: string; readOnly?: boolean }) {
  return (
    <div>
      <label htmlFor="email" className="text-body font-medium">Email</label>
      <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={defaultValue} readOnly={readOnly} className={input} />
    </div>
  );
}

function NewPassword({ label = "Password" }: { label?: string }) {
  return (
    <div>
      <label htmlFor="password" className="text-body font-medium">{label}</label>
      <input id="password" name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className={input} />
      <p className="mt-1 text-body-s text-muted">At least 8 characters.</p>
    </div>
  );
}

function SwitchLink({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="text-center text-body-s text-muted">
      {prompt} <Link href={href} className="font-semibold text-ink underline">{label}</Link>
    </p>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const [state, action, pending] = useActionState<AuthState, FormData>(signup ? signUp : logIn, {});
  return (
    <form onSubmit={submitKeepingValues(action)} className="mt-8 space-y-5 text-left">
      <FormError msg={state.error} />
      <Email />
      {signup ? (
        <>
          <NewPassword />
          <div>
            <label htmlFor="question" className="text-body font-medium">Security question</label>
            <select id="question" name="question" required defaultValue="" className={input}>
              <option value="" disabled>Pick one…</option>
              {SECURITY_QUESTIONS.map((q) => <option key={q}>{q}</option>)}
            </select>
            <p className="mt-1 text-body-s text-muted">You&apos;ll answer it if you ever forget your password.</p>
          </div>
          <div>
            <label htmlFor="answer" className="text-body font-medium">Answer</label>
            <input id="answer" name="answer" required minLength={2} maxLength={100} autoComplete="off" className={input} />
          </div>
        </>
      ) : (
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="text-body font-medium">Password</label>
            <Link href="/signin?mode=forgot" className="text-body-s text-muted underline">forgot password?</Link>
          </div>
          <input id="password" name="password" type="password" required maxLength={200} autoComplete="current-password" className={input} />
        </div>
      )}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? "one moment…" : signup ? "create account" : "log in"}
      </button>
      {signup
        ? <SwitchLink prompt="Already have an account?" href="/signin" label="log in" />
        : <SwitchLink prompt="New here?" href="/signin?mode=signup" label="create an account" />}
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  return (
    <form onSubmit={submitKeepingValues(action)} className="mt-8 space-y-5 text-left">
      <FormError msg={state.error} />
      <Email defaultValue={state.email} readOnly={Boolean(state.question)} />
      {state.question && (
        <>
          <div>
            <label htmlFor="answer" className="text-body font-medium">{state.question}</label>
            <input id="answer" name="answer" required maxLength={100} autoComplete="off" className={input} />
          </div>
          <NewPassword label="New password" />
        </>
      )}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? "one moment…" : state.question ? "reset password" : "continue"}
      </button>
      <SwitchLink prompt="Remembered it?" href="/signin" label="log in" />
    </form>
  );
}
