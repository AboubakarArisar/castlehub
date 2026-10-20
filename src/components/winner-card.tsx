import Link from "next/link";
import { Trophy } from "lucide-react";
import { ProjectIcon } from "@/components/project-row";
import type { ProjectCard } from "@/lib/queries";

/** The top Launchpad project of a finished week. */
export function WinnerCard({ project, week, label = "top launch" }: { project: Omit<ProjectCard, "upvoted">; week: string; label?: string }) {
  return (
    <Link
      href={`/${project.owner.handle}/${project.slug}`}
      className="flex items-center gap-3 border-b border-line bg-amber/10 px-4 py-3.5 transition-colors duration-120 hover:bg-amber/20 md:px-6"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-amber text-amber-ink">
        <Trophy className="size-4" />
      </span>
      <ProjectIcon name={project.name} src={project.iconUrl} size={40} />
      <span className="min-w-0 flex-1">
        <span className="text-label block text-muted">
          {label} · week {Number(week.slice(-2))}
        </span>
        <span className="block truncate font-display text-[16px] font-bold tracking-[-0.01em]">
          {project.name} <span className="font-sans text-body-s font-normal text-muted">by @{project.owner.handle}</span>
        </span>
      </span>
      <span className="text-count shrink-0">▲ {project._count.upvotes}</span>
    </Link>
  );
}
