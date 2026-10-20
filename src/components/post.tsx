import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deletePost } from "@/actions/post";
import { Avatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageWindow } from "@/components/media";
import { ProjectIcon } from "@/components/project-row";
import { PostReactions } from "@/components/reactions";
import type { FeedPost } from "@/lib/queries";
import { timeAgo, TYPE_LABEL } from "@/lib/rules";

export function Post({ post, viewerId, canReact }: { post: FeedPost; viewerId?: string; canReact: boolean }) {
  const { author, project } = post;
  const profile = `/${author.handle}`;
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
          <time className="text-body-s text-muted" dateTime={post.createdAt.toISOString()}>
            {timeAgo(post.createdAt)}
          </time>
          {author.headline && (
            <span className="text-label ml-auto hidden max-w-[40%] truncate rounded-sm border border-line px-1.5 py-0.5 text-muted sm:inline">
              {author.headline}
            </span>
          )}
        </header>

        {post.body && <p className="mt-2 text-body-l break-words whitespace-pre-wrap">{post.body}</p>}

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

        <div className="flex items-end justify-between gap-2">
          <PostReactions postId={post.id} counts={post.counts} mine={post.mine} canReact={canReact} />
          {viewerId === author.id && (
            <form action={deletePost.bind(null, post.id)}>
              <ConfirmButton
                message="Delete this post?"
                aria-label="Delete post"
                title="Delete post"
                className="grid size-9 place-items-center rounded-sm text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-red"
              >
                <Trash2 className="size-4" />
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
