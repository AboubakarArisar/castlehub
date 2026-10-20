import Link from "next/link";
import { ProjectUpvote } from "@/components/reactions";
import type { ProjectCard } from "@/lib/queries";
import { TYPE_LABEL } from "@/lib/rules";

export function ProjectIcon({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded project icon
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-sm border border-line object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-sm bg-ink font-display font-extrabold text-paper"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name[0]?.toLowerCase()}
    </span>
  );
}

export function ProjectRow({ project, rank, canVote }: { project: ProjectCard; rank?: number; canVote: boolean }) {
  const href = `/${project.owner.handle}/${project.slug}`;
  return (
    <li className="flex items-center gap-3 border-b border-line px-4 py-4 transition-colors duration-120 hover:bg-surface md:gap-4 md:px-6">
      {rank !== undefined && <span className="text-count w-5 shrink-0 text-muted">{rank}</span>}
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <ProjectIcon name={project.name} src={project.iconUrl} />
        <span className="min-w-0">
          <span className="block truncate font-display text-[17px] font-bold tracking-[-0.01em]">{project.name}</span>
          <span className="block truncate text-body text-muted">{project.tagline}</span>
          <span className="text-label mt-1 flex gap-2 text-muted">
            <span>{TYPE_LABEL[project.type]}</span>
            <span aria-hidden="true">·</span>
            <span className="normal-case tracking-normal">by @{project.owner.handle}</span>
          </span>
        </span>
      </Link>
      <ProjectUpvote projectId={project.id} count={project._count.upvotes} upvoted={project.upvoted} canVote={canVote} />
    </li>
  );
}
