"use client";

import { useActionState, useState } from "react";
import { CornerDownLeft, Mic } from "lucide-react";
import { createComment, type CommentTarget } from "@/actions/comment";
import type { FormState } from "@/actions/profile";
import { Avatar } from "@/components/avatar";
import { VoiceRecorder } from "@/components/voice";

export function CommentForm({
  target,
  viewer,
  compact = false,
}: {
  target: CommentTarget;
  viewer: { id: string; handle: string; image: string | null };
  compact?: boolean;
}) {
  // Remount after each successful comment so the box clears.
  const [round, setRound] = useState(0);
  return <Form key={round} target={target} viewer={viewer} compact={compact} onDone={() => setRound((r) => r + 1)} />;
}

function Form({
  target,
  viewer,
  compact,
  onDone,
}: {
  target: CommentTarget;
  viewer: { id: string; handle: string; image: string | null };
  compact: boolean;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [state, action, pending] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await createComment(target, prev, data);
    if (result.ok) onDone();
    return result;
  }, {});
  const id = `comment-${"postId" in target ? target.postId : target.projectId}`;

  return (
    <form action={action} className="flex items-start gap-2.5">
      <Avatar seed={viewer.handle} src={viewer.image} size={compact ? 28 : 32} />
      <div className="min-w-0 flex-1">
        {recording ? (
          <VoiceRecorder target={target} onClose={() => setRecording(false)} />
        ) : (
        <>
        <label htmlFor={id} className="sr-only">Write a comment</label>
        <div className="flex items-end gap-2 rounded-sm border border-line-strong bg-surface px-3 py-1.5 transition-colors focus-within:border-cobalt">
          <textarea
            id={id}
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (text.trim()) e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder={compact ? "write a comment…" : "add to the discussion…"}
            className="field-sizing-content max-h-40 min-h-7 w-full resize-none bg-transparent py-1 text-body placeholder:text-muted/70 focus:outline-none focus-visible:outline-none"
          />
          {!text && (
            <button
              type="button"
              onClick={() => setRecording(true)}
              aria-label="Record a voice comment (up to 60 seconds)"
              title="Record a voice comment"
              className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Mic className="size-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Post comment"
            className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-sm bg-cobalt text-on-cobalt transition-opacity disabled:opacity-30"
          >
            <CornerDownLeft className="size-3.5" />
          </button>
        </div>
        {state.errors?.body ? (
          <p className="mt-1 text-body-s text-red" role="alert">{state.errors.body}</p>
        ) : (
          !compact && text.length > 0 && <p className="mt-1 text-[11px] text-muted">Enter to send · Shift+Enter for a new line · **bold** *italic* [link](https://…)</p>
        )}
        </>
        )}
      </div>
    </form>
  );
}
