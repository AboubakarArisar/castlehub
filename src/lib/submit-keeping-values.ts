import { startTransition } from "react";

/**
 * onSubmit handler for forms driven by useActionState. React 19 clears a form
 * after an `action={...}` submit even when the server returns errors, so people
 * lost what they typed. Submitting through onSubmit keeps the fields as they are.
 */
export function submitKeepingValues(action: (data: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(data));
  };
}
