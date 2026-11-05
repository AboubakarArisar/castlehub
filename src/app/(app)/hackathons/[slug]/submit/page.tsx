import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { submitBuild } from "@/actions/hackathon";
import { BuildForm, LocalTime, type BuildDefaults } from "@/components/hackathon-forms";
import { PageHeader } from "@/components/shell";
import { db } from "@/lib/db";
import { getHackathon } from "@/lib/hackathons-server";
import { requireBuilder } from "@/lib/session";

export const metadata: Metadata = { title: "submit your build · castlehub" };

export default async function SubmitBuildPage({ params }: PageProps<"/hackathons/[slug]/submit">) {
  const { slug } = await params;
  const viewer = await requireBuilder();
  const h = await getHackathon(slug, viewer);
  if (!h || h.status === "draft") notFound();
  const base = `/hackathons/${h.slug}`;

  const mine = await db.hackathonSubmission.findUnique({
    where: { hackathonId_authorId: { hackathonId: h.id, authorId: viewer.id } },
    select: { id: true, withdrawnAt: true, name: true, tagline: true, description: true, demoUrl: true, repoUrl: true, videoUrl: true, coverUrl: true, images: true, tech: true },
  });
  if (mine && !mine.withdrawnAt) redirect(h.status === "open" ? `${base}/builds/${mine.id}/edit` : `${base}/builds/${mine.id}`);

  if (h.status !== "open") {
    return (
      <>
        <PageHeader label={h.title} title="submissions aren't open" />
        <div className="px-4 py-8 md:px-6">
          <p className="text-body text-muted">
            {h.status === "upcoming" && h.opensAt ? <>This hackathon starts accepting builds <LocalTime iso={h.opensAt.toISOString()} />.</> : "This hackathon has closed. Its builds are still in the gallery."}
          </p>
          <Link href={base} className="mt-4 inline-flex h-10 items-center rounded-sm border border-line-strong px-4 text-body font-semibold hover:border-ink">back to {h.title}</Link>
        </div>
      </>
    );
  }

  // Re-entering after withdrawing starts from the withdrawn entry.
  const defaults: BuildDefaults | undefined = mine
    ? { name: mine.name, tagline: mine.tagline ?? "", description: mine.description ?? "", demoUrl: mine.demoUrl ?? "", repoUrl: mine.repoUrl ?? "", videoUrl: mine.videoUrl ?? "", coverUrl: mine.coverUrl, images: mine.images, tech: mine.tech.join(", ") }
    : undefined;

  return (
    <>
      <PageHeader label={`submit to ${h.title}`} title={<>share your <span className="accent-serif">build</span></>}>
        <p className="mt-2 text-body text-muted">
          Posting as <strong className="text-ink">@{viewer.handle}</strong>. You can edit or withdraw it until submissions close
          {h.closesAt && h.override !== "OPEN" && <> (<LocalTime iso={h.closesAt.toISOString()} />)</>}.
        </p>
      </PageHeader>
      <BuildForm
        action={submitBuild.bind(null, h.id)}
        defaults={defaults}
        submitLabel={mine ? "submit again" : "submit build"}
        closesAt={h.override === "OPEN" ? null : (h.closesAt?.toISOString() ?? null)}
        cancelHref={base}
      />
    </>
  );
}
