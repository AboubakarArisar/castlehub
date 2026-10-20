import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteComment, type CommentTarget } from "@/actions/comment";
import { Avatar } from "@/components/avatar";
import { CommentForm } from "@/components/comment-form";
import { ConfirmButton } from "@/components/confirm-button";
import type { CommentRow } from "@/lib/queries";
import { RichText } from "@/lib/rich";
import { timeAgo } from "@/lib/rules";

type Viewer = { id: string; handle: string; image: string | null } | null;

export function CommentItem({ comment, canDelete, compact = false }: { comment: CommentRow; canDelete: boolean; compact?: boolean }) {
  const a = comment.author;
  return (
    <li className="group flex gap-2.5">
      <Link href={`/${a.handle}`} className="shrink-0" aria-label={`${a.name}'s profile`}>
        <Avatar seed={a.handle ?? a.id} src={a.image} size={compact ? 28 : 32} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-sm bg-surface-2 px-3 py-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Link href={`/${a.handle}`} className="text-body-s font-semibold hover:underline">{a.name}</Link>
            <time className="text-body-s text-muted" dateTime={comment.createdAt.toISOString()}>{timeAgo(comment.createdAt)}</time>
          </p>
          <RichText text={comment.body} className="mt-0.5 text-body" />
        </div>
      </div>
      {canDelete && (
        <form action={deleteComment.bind(null, comment.id)} className="self-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <ConfirmButton
            message="Delete this comment?"
            aria-label="Delete comment"
            title="Delete comment"
            className="grid size-8 place-items-center rounded-sm text-muted hover:bg-surface-2 hover:text-red"
          >
            <Trash2 className="size-3.5" />
          </ConfirmButton>
        </form>
      )}
    </li>
  );
}

/** Full thread with a comment box: project pages and post pages. */
export function CommentThread({
  comments,
  target,
  viewer,
  ownerId,
}: {
  comments: CommentRow[];
  target: CommentTarget;
  viewer: Viewer;
  ownerId: string;
}) {
  return (
    <div className="space-y-4">
      {viewer ? (
        <CommentForm target={target} viewer={viewer} />
      ) : (
        <p className="text-body-s text-muted">
          <Link href="/signin" className="font-semibold text-cobalt hover:underline">Sign in</Link> to join the conversation.
        </p>
      )}
      {comments.length === 0 ? (
        <p className="text-body-s text-muted">No comments yet. Say something nice, ask a question, or share feedback.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} canDelete={viewer?.id === c.authorId || viewer?.id === ownerId} />
          ))}
        </ul>
      )}
    </div>
  );
}
