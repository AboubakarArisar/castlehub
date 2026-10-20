import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Trophy } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { CommentThread } from "@/components/comments";
import { MediaEmbed } from "@/components/media";
import { Post } from "@/components/post";
import { ProjectGallery } from "@/components/project-gallery";
import { ProjectIcon } from "@/components/project-row";
import { ProjectUpvote } from "@/components/reactions";
import { ShareToBuilds } from "@/components/share-to-builds";
import { getComments, getFeed, getProject, getWeekWinner } from "@/lib/queries";
import { RichText } from "@/lib/rich";
import { TYPE_LABEL } from "@/lib/rules";
import { asBuilder, getViewer } from "@/lib/session";
import { buildsLink, SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[handle]/[slug]">): Promise<Metadata> {
  const { handle, slug } = await params;
  const project = await getProject(handle, slug);
  if (!project) return {};
  // Link previews in Slack and elsewhere show the project's first screenshot (or icon).
  const image = project.images[0]?.url ?? project.iconUrl;
  const title = `${project.name} · castlehub`;
  return {
    title,
    description: project.tagline,
    openGraph: { title, description: project.tagline, ...(image && { images: [image] }) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: project.tagline, ...(image && { images: [image] }) },
  };
}

export default async function ProjectPage({ params }: PageProps<"/[handle]/[slug]">) {
  const { handle, slug } = await params;
  const viewer = await getViewer();
  const project = await getProject(handle, slug, viewer?.id);
  if (!project) notFound();
  const [posts, comments] = await Promise.all([
    getFeed(viewer?.id, { projectId: project.id }, 10),
    getComments({ projectId: project.id }),
  ]);
  const isOwner = viewer?.id === project.ownerId;
  const won = project.launchWeek ? (await getWeekWinner(project.launchWeek))?.id === project.id : false;
  const shareText = isOwner
    ? `🚀 I just launched *${project.name}* on CastleHub: ${project.tagline}`
    : `👀 Check out *${project.name}* by @${project.owner.handle} on CastleHub: ${project.tagline}`;

  return (
    <article>
      <div className="flex items-center justify-between border-b border-line px-4 py-3 md:px-6">
        <Link href="/discover" className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> discover
        </Link>
        {isOwner && (
          <Link href={`/${handle}/${slug}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-body-s font-semibold hover:border-ink">
            <Pencil className="size-3.5" /> edit
          </Link>
        )}
      </div>

      <header className="border-b border-line px-4 py-6 md:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <ProjectIcon name={project.name} src={project.iconUrl} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-display-l break-words">{project.name}</h1>
            <p className="mt-1.5 text-body-l text-muted">{project.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link href={`/${project.owner.handle}`} className="inline-flex items-center gap-2 text-body font-semibold hover:underline">
                <Avatar seed={project.owner.handle ?? project.owner.id} src={project.owner.image} size={22} /> {project.owner.name}
              </Link>
              {project.collaborators.length > 0 && (
                <span className="text-body-s text-muted">
                  with{" "}
                  {project.collaborators.map(({ user }, i) => (
                    <span key={user.id}>
                      {i > 0 && ", "}
                      <Link href={`/${user.handle}`} className="font-semibold text-ink hover:underline">@{user.handle}</Link>
                    </span>
                  ))}
                </span>
              )}
              <span className="text-label flex flex-wrap gap-x-2 text-muted">
                <span>{TYPE_LABEL[project.type]}</span>
                {project.launchWeek && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link href={`/launchpad?week=${project.launchWeek}`} className="text-cobalt hover:underline">
                      launchpad week {Number(project.launchWeek.slice(-2))}
                    </Link>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        {won && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-sm bg-amber px-2.5 py-1.5 text-amber-ink">
            <Trophy className="size-4" />
            <span className="text-label">top launch of week {Number(project.launchWeek!.slice(-2))}</span>
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <ProjectUpvote projectId={project.id} count={project._count.upvotes} upvoted={project.upvoted} canVote={Boolean(viewer?.handle)} large />
          {project.websiteUrl && (
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-body font-semibold hover:border-ink"
            >
              visit <ExternalLink className="size-4" />
            </a>
          )}
          {viewer && <ShareToBuilds message={shareText} url={`${SITE_URL}/${handle}/${slug}`} slackLink={buildsLink()} />}
        </div>
      </header>

      <div className="space-y-5 px-4 py-6 md:px-6">
        {project.images.length > 0 && <ProjectGallery images={project.images} name={project.name} />}
        {project.mediaUrl && <MediaEmbed url={project.mediaUrl} title={project.slug} />}
        <RichText text={project.description} className="text-body-l" />
        {project.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {project.tags.map((t) => (
              <li key={t} className="text-label rounded-sm border border-line px-2 py-1 text-muted">#{t}</li>
            ))}
          </ul>
        )}
      </div>

      <section id="comments" aria-labelledby="discussion-h" className="scroll-mt-24 border-t border-line px-4 py-6 md:px-6">
        <h2 id="discussion-h" className="text-title-m">
          discussion <span className="text-count align-middle text-muted">{comments.length}</span>
        </h2>
        <div className="mt-4">
          <CommentThread comments={comments} target={{ projectId: project.id }} viewer={asBuilder(viewer)} ownerId={project.ownerId} />
        </div>
      </section>

      <section aria-labelledby="updates-h" className="border-t border-line">
        <h2 id="updates-h" className="text-label px-4 pt-5 pb-2 text-muted md:px-6">updates</h2>
        {posts.length === 0 ? (
          <p className="px-4 pb-8 text-body-s text-muted md:px-6">
            No posts about {project.name} yet.{isOwner && " Tag this project when you post to the feed."}
          </p>
        ) : (
          posts.map((p) => <Post key={p.id} post={p} viewer={asBuilder(viewer)} />)
        )}
      </section>
    </article>
  );
}
