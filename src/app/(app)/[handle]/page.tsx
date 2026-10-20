import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Link2, MapPin } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Post } from "@/components/post";
import { ProjectRow } from "@/components/project-row";
import { StreakSection } from "@/components/streaks";
import { placeFor } from "@/lib/places";
import { getBuilder, getFeed, getProjects } from "@/lib/queries";
import { asBuilder, getViewer } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const builder = await getBuilder(handle.toLowerCase());
  if (!builder) return {};
  const title = `${builder.name} (@${builder.handle}) · castlehub`;
  return { title, description: builder.headline ?? undefined, openGraph: { title, description: builder.headline ?? undefined, ...(builder.image && { images: [builder.image] }) } };
}

export default async function ProfilePage({ params, searchParams }: PageProps<"/[handle]">) {
  const { handle } = await params;
  const tab = (await searchParams).tab === "posts" ? "posts" : "projects";
  const builder = await getBuilder(handle.toLowerCase());
  if (!builder) notFound();
  const viewer = await getViewer();
  const isMe = viewer?.id === builder.id;
  // Only shown when the builder chose to be on the World Map.
  const place = builder.onWorldMap && !builder.suspendedAt ? placeFor(builder.countryCode, builder.cityId) : null;

  const [projects, posts] = await Promise.all([
    tab === "projects" ? getProjects({ viewerId: viewer?.id, memberId: builder.id, take: 50 }) : [],
    tab === "posts" ? getFeed(viewer?.id, { authorId: builder.id }) : [],
  ]);

  return (
    <>
      <header className="border-b border-line px-4 pt-8 pb-5 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <Avatar seed={builder.handle ?? builder.id} src={builder.image} size={88} label={`${builder.name}'s avatar`} />
          {isMe && (
            <Link href="/settings" className="inline-flex h-9 items-center rounded-sm border border-line-strong px-3 text-body-s font-semibold hover:border-ink">
              edit profile
            </Link>
          )}
        </div>
        <h1 className="text-display-l mt-4">{builder.name}</h1>
        <p className="flex flex-wrap items-center gap-2 text-body text-muted">
          @{builder.handle}
          {builder.openToCollab && (
            <Link href="/search?collab=1" className="text-label rounded-sm border border-green px-1.5 py-0.5 text-green hover:bg-green/10">open to collab</Link>
          )}
        </p>
        {builder.headline && <p className="mt-2 text-body-l">{builder.headline}</p>}
        {builder.bio && <p className="mt-3 max-w-[60ch] text-body whitespace-pre-wrap text-muted">{builder.bio}</p>}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body-s text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" /> joined {builder.createdAt.toLocaleDateString("en", { month: "short", year: "numeric" })}
          </span>
          {builder.website && (
            <a href={builder.website} target="_blank" rel="noopener noreferrer nofollow me" className="inline-flex items-center gap-1.5 text-cobalt hover:underline">
              <Link2 className="size-4" /> {builder.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
          {place && (
            <Link href={`/world?place=${place.key}`} className="inline-flex items-center gap-1.5 text-amber hover:underline">
              <MapPin className="size-4" /> building from {place.label}
            </Link>
          )}
          {builder.slackTeamId && <span className="text-label self-center rounded-sm bg-surface-2 px-1.5 py-0.5">skycastle slack</span>}
        </p>
        {builder.skills.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills">
            {builder.skills.map((s) => (
              <li key={s} className="rounded-sm border border-line px-2 py-1 text-body-s">{s}</li>
            ))}
          </ul>
        )}
        <StreakSection builder={builder} />
        <nav aria-label="Profile" className="mt-6 -mb-5 flex gap-6">
          {(["projects", "posts"] as const).map((t) => (
            <Link
              key={t}
              href={t === "projects" ? `/${builder.handle}` : `/${builder.handle}?tab=posts`}
              aria-current={tab === t ? "page" : undefined}
              className="border-b-2 border-transparent pb-3 text-body font-medium text-muted transition-colors duration-120 hover:text-ink aria-[current=page]:border-cobalt aria-[current=page]:text-ink"
            >
              {t}
            </Link>
          ))}
        </nav>
      </header>

      {tab === "projects" &&
        (projects.length === 0 ? (
          <Empty text={isMe ? "Publish your first project." : "No projects yet."} href={isMe ? "/projects/new" : undefined} />
        ) : (
          <ol>
            {projects.map((p) => (
              <ProjectRow key={p.id} project={p} canVote={Boolean(viewer?.handle)} />
            ))}
          </ol>
        ))}

      {tab === "posts" &&
        (posts.length === 0 ? (
          <Empty text={isMe ? "Share what you're working on." : "No posts yet."} href={isMe ? "/feed" : undefined} />
        ) : (
          posts.map((p) => <Post key={p.id} post={p} viewer={asBuilder(viewer)} />)
        ))}
    </>
  );
}

function Empty({ text, href }: { text: string; href?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-body text-muted">{text}</p>
      {href && (
        <Link href={href} className="mt-2 inline-block text-body font-semibold text-cobalt hover:underline">
          go →
        </Link>
      )}
    </div>
  );
}
