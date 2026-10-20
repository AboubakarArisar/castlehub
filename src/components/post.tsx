import Link from "next/link";
import { MessageSquare, Trash2 } from "lucide-react";
import { deletePost } from "@/actions/post";
import { Avatar } from "@/components/avatar";
import { CommentForm } from "@/components/comment-form";
import { CommentItem } from "@/components/comments";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageWindow } from "@/components/media";
import { ProjectIcon } from "@/components/project-row";
import { PostReactions } from "@/components/reactions";
import type { FeedPost } from "@/lib/queries";
import { RichText } from "@/lib/rich";
import { timeAgo, TYPE_LABEL } from "@/lib/rules";

export type PostViewer = { id: string; handle: string; image: string | null } | null;

/**
 * A feed post. In the feed it shows the two newest comments and a quick reply
 * box; on its own page (`full`) the page renders the whole thread instead.
 */
export function Post({ post, viewer, full = false }: { post: FeedPost; viewer: PostViewer; full?: boolean }) {
  const { author, project } = post;
  const profile = `/${author.handle}`;
  const href = `/post/${post.id}`;
  const commentCount = post._count.comments;

  return (
    <article className="flex gap-3 border-b border-line px-4 py-5 md:px-6">
      <Link href={profile} className="shrink-0" aria-label={`${author.name}'s profile`}>
        <Avatar seed={author.handle ?? author.id} src={author.image} />
      </Link>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link href={profile} className="text-body font-semibold hover:underline">
            {author.name}
          </Link>
          <span className="text-body-s text-muted">@{author.handle}</span>
          <span className="text-body-s text-muted" aria-hidden="true">·</span>
          <Link href={href} className="text-body-s text-muted hover:underline">
            <time dateTime={post.createdAt.toISOString()}>{timeAgo(post.createdAt)}</time>
          </Link>
          {author.headline && (
            <span className="text-label ml-auto hidden max-w-[40%] truncate text-muted sm:inline">
              {author.headline}
            </span>
          )}
        </header>

        {post.body && <RichText text={post.body} className="mt-2 text-body-l" />}

        {post.imageUrl && (
          <div className="mt-3">
            <ImageWindow src={post.imageUrl} alt={`Image posted by ${author.name}`} title={`${author.handle}-post`} label="image" />
          </div>
        )}

        {project && (
          <Link
            href={`/${project.owner.handle}/${project.slug}`}
            className="mt-3 flex items-center gap-3 border border-line px-3 py-2.5 transition-colors duration-120 hover:border-line-strong hover:bg-surface"
          >
            <ProjectIcon name={project.name} src={project.iconUrl} size={36} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-display text-[15px] font-bold tracking-[-0.01em]">{project.name}</span>
                {project.launchWeek && <span className="text-label rounded-sm bg-amber px-1.5 py-0.5 text-amber-ink">launchpad</span>}
              </span>
              <span className="block truncate text-body-s text-muted">{project.tagline}</span>
            </span>
            <span className="text-label text-muted">{TYPE_LABEL[project.type]}</span>
          </Link>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <PostReactions postId={post.id} counts={post.counts} mine={post.mine} canReact={Boolean(viewer)} />
          <div className="flex items-center">
            <Link
              href={full ? "#comments" : href}
              aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-ink"
            >
              <MessageSquare className="size-[18px]" />
              <span className="text-count">{commentCount}</span>
            </Link>
            {viewer?.id === author.id && (
              <form action={deletePost.bind(null, post.id)}>
                <ConfirmButton
                  message="Delete this post and its comments?"
                  aria-label="Delete post"
                  title="Delete post"
                  className="grid size-8 place-items-center rounded-sm text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-red"
                >
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </form>
            )}
          </div>
        </div>

        {!full && (commentCount > 0 || viewer) && (
          <div className="mt-3 space-y-2.5 border-t border-line pt-3">
            {commentCount > post.comments.length && (
              <Link href={href} className="text-body-s font-medium text-muted hover:text-ink">
                view all {commentCount} comments
              </Link>
            )}
            {post.comments.length > 0 && (
              <ul className="space-y-2.5">
                {post.comments.map((c) => (
                  <CommentItem key={c.id} comment={c} compact canDelete={viewer?.id === c.authorId || viewer?.id === author.id} />
                ))}
              </ul>
            )}
            {viewer && <CommentForm target={{ postId: post.id }} viewer={viewer} compact />}
          </div>
        )}
      </div>
    </article>
  );
}
