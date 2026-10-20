import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { MediaEmbed } from "@/components/media";
import { Post } from "@/components/post";
import { ProjectGallery } from "@/components/project-gallery";
import { ProjectIcon } from "@/components/project-row";
import { ProjectUpvote } from "@/components/reactions";
import { getFeed, getProject } from "@/lib/queries";
import { TYPE_LABEL } from "@/lib/rules";
import { getViewer } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/[handle]/[slug]">): Promise<Metadata> {
  const { handle, slug } = await params;
  const project = await getProject(handle, slug);
  return project ? { title: `${project.name} · castlehub`, description: project.tagline } : {};
}

export default async function ProjectPage({ params }: PageProps<"/[handle]/[slug]">) {
  const { handle, slug } = await params;
  const viewer = await getViewer();
  const project = await getProject(handle, slug, viewer?.id);
  if (!project) notFound();
  const posts = await getFeed(viewer?.id, { projectId: project.id }, 10);
  const isOwner = viewer?.id === project.ownerId;

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
        </div>
      </header>

      <div className="space-y-5 px-4 py-6 md:px-6">
        {project.images.length > 0 && <ProjectGallery images={project.images} name={project.name} />}
        {project.mediaUrl && <MediaEmbed url={project.mediaUrl} title={project.slug} />}
        <p className="text-body-l break-words whitespace-pre-wrap">{project.description}</p>
        {project.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {project.tags.map((t) => (
              <li key={t} className="text-label rounded-sm border border-line px-2 py-1 text-muted">#{t}</li>
            ))}
          </ul>
        )}
      </div>

      <section aria-labelledby="updates-h" className="border-t border-line">
        <h2 id="updates-h" className="text-label px-4 pt-5 pb-2 text-muted md:px-6">updates</h2>
        {posts.length === 0 ? (
          <p className="px-4 pb-8 text-body-s text-muted md:px-6">
            No posts about {project.name} yet.{isOwner && " Tag this project when you post to the feed."}
          </p>
        ) : (
          posts.map((p) => <Post key={p.id} post={p} viewerId={viewer?.id} canReact={Boolean(viewer?.handle)} />)
        )}
      </section>
    </article>
  );
}
