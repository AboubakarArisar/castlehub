import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteProject, updateProject } from "@/actions/project";
import { ConfirmButton } from "@/components/confirm-button";
import { ProjectForm } from "@/components/project-form";
import { PageHeader } from "@/components/shell";
import { getProject } from "@/lib/queries";
import { requireBuilder } from "@/lib/session";

export const metadata: Metadata = { title: "edit project · castlehub" };

export default async function EditProjectPage({ params }: PageProps<"/[handle]/[slug]/edit">) {
  const { handle, slug } = await params;
  const viewer = await requireBuilder();
  const project = await getProject(handle, slug);
  // Owners only; everyone else gets a plain 404.
  if (!project || project.ownerId !== viewer.id) notFound();

  return (
    <>
      <PageHeader label="edit project" title={project.name} />
      <ProjectForm
        action={updateProject.bind(null, project.id)}
        submitLabel="save changes"
        launchHint={project.launchWeek ? `Entered for ${project.launchWeek}. Untick to remove it from the Launchpad.` : "Adds it to this week's ranking."}
        defaults={{
          name: project.name,
          tagline: project.tagline,
          description: project.description,
          type: project.type,
          tags: project.tags.join(", "),
          websiteUrl: project.websiteUrl ?? "",
          mediaUrl: project.mediaUrl ?? "",
          iconUrl: project.iconUrl ?? undefined,
          images: project.images.map((i) => i.url),
          launch: Boolean(project.launchWeek),
        }}
      />
      <form action={deleteProject.bind(null, project.id)} className="border-t border-line px-4 py-6 md:px-6">
        <p className="text-body font-semibold">Delete this project</p>
        <p className="text-body-s text-muted">Removes the project, its images and its upvotes. Posts that tagged it stay.</p>
        <ConfirmButton
          message={`Delete ${project.name}? This can't be undone.`}
          className="mt-3 h-10 rounded-sm border border-red px-4 text-body font-semibold text-red transition-colors duration-120 hover:bg-red hover:text-paper"
        >
          delete project
        </ConfirmButton>
      </form>
    </>
  );
}
