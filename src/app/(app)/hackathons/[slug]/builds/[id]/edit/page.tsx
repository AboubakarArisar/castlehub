import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateBuild, withdrawBuild } from "@/actions/hackathon";
import { BuildForm, WithdrawButton } from "@/components/hackathon-forms";
import { PageHeader } from "@/components/shell";
import { getBuild } from "@/lib/hackathons-server";
import { requireBuilder } from "@/lib/session";

export const metadata: Metadata = { title: "edit build · castlehub" };

export default async function EditBuildPage({ params }: PageProps<"/hackathons/[slug]/builds/[id]/edit">) {
  const { slug, id } = await params;
  const viewer = await requireBuilder();
  const b = await getBuild(slug, id, viewer);
  // Authors only; everyone else gets a plain 404.
  if (!b?.mine) notFound();
  const view = `/hackathons/${slug}/builds/${id}`;

  if (b.status !== "open" || b.withdrawnAt) {
    return (
      <>
        <PageHeader label="edit build" title={b.name} />
        <div className="px-4 py-8 md:px-6">
          <p className="text-body text-muted">
            {b.withdrawnAt ? "You withdrew this build. Submit it again from the hackathon page while it's open." : "Submissions for this hackathon have closed, so builds can't be changed any more."}
          </p>
          <Link href={view} className="mt-4 inline-flex h-10 items-center rounded-sm border border-line-strong px-4 text-body font-semibold hover:border-ink">view your build</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader label={`edit build · ${b.hackathon.title}`} title={b.name} />
      <BuildForm
        action={updateBuild.bind(null, b.id)}
        submitLabel="save changes"
        closesAt={b.hackathon.override === "OPEN" ? null : (b.hackathon.closesAt?.toISOString() ?? null)}
        cancelHref={view}
        defaults={{
          name: b.name,
          tagline: b.tagline ?? "",
          description: b.description ?? "",
          demoUrl: b.demoUrl ?? "",
          repoUrl: b.repoUrl ?? "",
          videoUrl: b.videoUrl ?? "",
          coverUrl: b.coverUrl,
          images: b.images,
          tech: b.tech.join(", "),
        }}
      />
      <div className="border-t border-line px-4 py-6 md:px-6">
        <p className="text-body font-semibold">Withdraw this build</p>
        <p className="mb-3 text-body-s text-muted">Removes it from the gallery. While the hackathon is open you can submit again.</p>
        <WithdrawButton action={withdrawBuild.bind(null, b.id)} name={b.name} />
      </div>
    </>
  );
}
