import { Avatar } from "@/components/avatar";
import { MediaWindow } from "@/components/media";
import { Reactions } from "@/components/reactions";
import { typeLabel, type DemoPost } from "@/lib/demo";

export function Post({ post }: { post: DemoPost }) {
  const { author } = post;
  return (
    <article className="flex gap-3 border-b border-line px-4 py-5 md:px-6">
      <Avatar seed={author.handle} />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-body font-semibold">{author.name}</span>
          <span className="text-body-s text-muted">@{author.handle}</span>
          <span className="text-body-s text-muted" aria-hidden="true">·</span>
          <span className="text-body-s text-muted">{post.time}</span>
          <span className="ml-auto flex gap-1.5">
            <span className="text-label hidden rounded-sm border border-line px-1.5 py-0.5 text-muted sm:inline">{author.tag}</span>
            <span className="text-label rounded-sm bg-surface-2 px-1.5 py-0.5 text-muted" title="Invented content for the prototype">
              demo
            </span>
          </span>
        </header>

        {post.title && <h2 className="mt-2 text-title-m">{post.title}</h2>}
        <p className={`text-body-l line-clamp-6 ${post.title ? "mt-1" : "mt-2"}`}>{post.body}</p>

        {post.media && (
          <div className="mt-3">
            <MediaWindow media={post.media} />
          </div>
        )}

        {post.project && (
          <a
            href="#"
            className="mt-3 flex items-center gap-3 border border-line px-3 py-2.5 transition-colors duration-120 hover:border-line-strong hover:bg-surface"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-ink font-display text-lg font-extrabold text-paper">
              {post.project.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-display text-[15px] font-bold tracking-[-0.01em]">{post.project.name}</span>
                {post.project.launching && (
                  <span className="text-label rounded-sm bg-amber px-1.5 py-0.5 text-amber-ink">launching</span>
                )}
              </span>
              <span className="block truncate text-body-s text-muted">{post.project.tagline}</span>
            </span>
            <span className="text-label text-muted">{typeLabel[post.project.type]}</span>
          </a>
        )}

        <Reactions upvotes={post.upvotes} comments={post.comments} stamps={post.stamps} />
      </div>
    </article>
  );
}
