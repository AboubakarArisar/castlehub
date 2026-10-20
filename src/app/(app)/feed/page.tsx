import type { Metadata } from "next";
import Link from "next/link";
import { Composer } from "@/components/composer";
import { SlackButton } from "@/components/landing-hero";
import { Post } from "@/components/post";
import { PageHeader } from "@/components/shell";
import { getFeed, getOwnProjects } from "@/lib/queries";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "feed · castlehub" };

export default async function FeedPage() {
  const viewer = await getViewer();
  const [posts, projects] = await Promise.all([
    getFeed(viewer?.id),
    viewer?.handle ? getOwnProjects(viewer.id) : [],
  ]);
  const builder = viewer?.handle ? { id: viewer.id, handle: viewer.handle, image: viewer.image } : null;

  return (
    <>
      <PageHeader title={<>what&apos;s <span className="accent-serif">shipping</span> in the castle</>} />

      {builder ? (
        <Composer viewer={builder} projects={projects} />
      ) : (
        <div className="border-b border-line bg-surface px-4 py-5 md:px-6">
          <p className="text-body">
            {viewer ? "Pick a handle to start posting." : "Sign in with the SkyCastle Slack to post and react."}
          </p>
          <div className="mt-3">
            {viewer ? (
              <Link href="/onboarding" className="inline-flex h-10 items-center rounded-sm bg-cobalt px-4 text-body font-semibold text-on-cobalt">
                pick a handle
              </Link>
            ) : (
              <SlackButton size="sm" />
            )}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-title-l">the castle is quiet</p>
          <p className="mt-2 text-body text-muted">Be the first to share what you&apos;re building.</p>
        </div>
      ) : (
        posts.map((p) => <Post key={p.id} post={p} viewerId={viewer?.id} canReact={Boolean(viewer?.handle)} />)
      )}
    </>
  );
}
