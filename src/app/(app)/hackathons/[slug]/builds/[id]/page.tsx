import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Code2, ExternalLink, EyeOff, Pencil, Video } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Cover, FeaturedBadge, StatusBadge } from "@/components/hackathons";
import { LocalTime } from "@/components/hackathon-forms";
import { MediaEmbed } from "@/components/media";
import { ProjectGallery } from "@/components/project-gallery";
import { ShareToBuilds } from "@/components/share-to-builds";
import { embedUrl } from "@/lib/rules";
import { getBuild } from "@/lib/hackathons-server";
import { RichText } from "@/lib/rich";
import { getViewer } from "@/lib/session";
import { buildsLink, SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/hackathons/[slug]/builds/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const b = await getBuild(slug, id, null);
  if (!b) return { title: "build · castlehub" };
  const title = `${b.name} · ${b.hackathon.title} · castlehub`;
  const image = b.coverUrl ?? b.images[0];
  const description = b.tagline ?? `A build by @${b.author.handle} for ${b.hackathon.title}`;
  return { title, description, openGraph: { title, description, ...(image && { images: [image] }) } };
}

const link = "inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-body font-semibold hover:border-ink";

export default async function BuildPage({ params, searchParams }: PageProps<"/hackathons/[slug]/builds/[id]">) {
  const [{ slug, id }, sp, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const b = await getBuild(slug, id, viewer);
  if (!b) notFound();
  const base = `/hackathons/${slug}`;
  const url = `${SITE_URL}${base}/builds/${b.id}`;
  const video = b.videoUrl && embedUrl(b.videoUrl) ? b.videoUrl : null;
  const share = b.mine
    ? `🛠️ I just shared *${b.name}* for ${b.hackathon.title} on CastleHub`
    : `👀 Check out *${b.name}* by @${b.author.handle} for ${b.hackathon.title} on CastleHub`;

  return (
    <article>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6">
        <Link href={`${base}#builds`} className="inline-flex min-w-0 items-center gap-1.5 text-body-s text-muted hover:text-ink">
          <ArrowLeft className="size-4 shrink-0" /> <span className="truncate">{b.hackathon.title}</span>
        </Link>
        {b.mine && b.status === "open" && !b.withdrawnAt && (
          <Link href={`${base}/builds/${b.id}/edit`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-body-s font-semibold hover:border-ink">
            <Pencil className="size-3.5" /> edit
          </Link>
        )}
      </div>

      {sp.submitted && b.mine && <Banner tone="ok">Your build is in! It&apos;s now in the {b.hackathon.title} gallery. You can edit it until submissions close.</Banner>}
      {sp.saved && b.mine && <Banner tone="ok">Changes saved.</Banner>}
      {b.withdrawnAt && (
        <Banner tone="warn">
          {b.mine ? "You withdrew this build. Only you can see it." : "Withdrawn by its builder."}
          {b.mine && b.status === "open" && <> <Link href={`${base}/submit`} className="font-semibold underline">Submit it again</Link></>}
        </Banner>
      )}
      {b.hiddenAt && (
        <Banner tone="warn">
          <EyeOff className="mr-1.5 inline size-4" />
          Hidden by a moderator{b.mine && ", so only you can see it"}.{b.hiddenReason && <> Reason: {b.hiddenReason}</>}
        </Banner>
      )}

      {(b.coverUrl || b.images.length === 0) && <Cover src={b.coverUrl} name={b.name} className="border-b border-line" />}

      <header className="space-y-3 border-b border-line px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {b.featuredAt && <FeaturedBadge />}
          <Link href={base} className="text-label text-cobalt hover:underline">{b.hackathon.title}</Link>
          {b.status !== "open" && <StatusBadge status={b.status} />}
        </div>
        <h1 className="text-display-l break-words">{b.name}</h1>
        {b.tagline && <p className="text-body-l text-muted">{b.tagline}</p>}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-s text-muted">
          <Link href={`/${b.author.handle}`} className="inline-flex items-center gap-2 text-body font-semibold text-ink hover:underline">
            <Avatar seed={b.author.handle ?? b.author.id} src={b.author.image} size={22} /> {b.author.name ?? `@${b.author.handle}`}
          </Link>
          <span>
            submitted <LocalTime iso={b.createdAt.toISOString()} />
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {b.demoUrl && <a href={b.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className={link}>live demo <ExternalLink className="size-4" /></a>}
          {b.repoUrl && <a href={b.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className={link}><Code2 className="size-4" /> source</a>}
          {b.videoUrl && !video && <a href={b.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className={link}><Video className="size-4" /> demo video <ExternalLink className="size-4" /></a>}
          {viewer && !b.hiddenAt && !b.withdrawnAt && <ShareToBuilds message={share} url={url} slackLink={buildsLink()} />}
        </div>
      </header>

      <div className="space-y-5 px-4 py-6 md:px-6">
        {video && <MediaEmbed url={video} title={b.name} />}
        {b.images.length > 0 && <ProjectGallery images={b.images.map((u) => ({ id: u, url: u }))} name={b.name} />}
        {b.description && <RichText text={b.description} className="text-body-l" />}
        {b.tech.length > 0 && (
          <section aria-labelledby="tech-h">
            <h2 id="tech-h" className="text-label mb-2 text-muted">built with</h2>
            <ul className="flex flex-wrap gap-1.5">
              {b.tech.map((t) => (
                <li key={t} className="text-label rounded-sm border border-line px-2 py-1 text-muted">{t}</li>
              ))}
            </ul>
          </section>
        )}
        <p className="border-t border-line pt-4 text-body-s text-muted">
          Direct link: <span className="break-all text-ink">{url}</span>
        </p>
      </div>
    </article>
  );
}

function Banner({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <p role="status" className={`border-b px-4 py-2.5 text-body md:px-6 ${tone === "ok" ? "border-green bg-green/10" : "border-amber bg-amber/15"}`}>
      {children}
    </p>
  );
}
