import type { Metadata } from "next";
import { createProject } from "@/actions/project";
import { ProjectForm } from "@/components/project-form";
import { PageHeader } from "@/components/shell";
import { requireBuilder } from "@/lib/session";

export const metadata: Metadata = { title: "publish a project · castlehub" };

export default async function NewProjectPage() {
  await requireBuilder();
  return (
    <>
      <PageHeader label="new project" title={<>publish a <span className="accent-serif">project</span></>} />
      <ProjectForm
        action={createProject}
        submitLabel="publish"
        launchHint="It appears in this week's ranking. Leave it off and the project still shows in Discover."
      />
    </>
  );
}
