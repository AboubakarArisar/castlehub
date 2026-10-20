import type { Metadata } from "next";
import Link from "next/link";
import { Composer } from "@/components/composer";
import { SlackButton } from "@/components/landing-hero";
import { Pager, pageParam } from "@/components/pager";
import { Post } from "@/components/post";
import { PageHeader } from "@/components/shell";
import { WinnerCard } from "@/components/winner-card";
import { getFeed, getLastWeekWinner, getOwnProjects } from "@/lib/queries";
import { isoWeek, shiftWeek } from "@/lib/rules";
import { asBuilder, getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "feed · castlehub" };

const PER_PAGE = 30;

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const page = pageParam((await searchParams).page);
  const viewer = await getViewer();
  const [rows, projects, winner] = await Promise.all([
    getFeed(viewer?.id, {}, PER_PAGE + 1, (page - 1) * PER_PAGE),
    viewer?.handle ? getOwnProjects(viewer.id) : [],
    page === 1 ? getLastWeekWinner() : null,
  ]);
  const builder = asBuilder(viewer);
  const posts = rows.slice(0, PER_PAGE);

  return (
    <>
      <PageHeader title={<>what&apos;s <span className="accent-serif">shipping</span> in the castle</>} />
      {winner && <WinnerCard project={winner} week={shiftWeek(isoWeek(), -1)} label="last week's top launch" />}

      {builder ? (
        <Composer viewer={builder} projects={projects} />
      ) : (
        <div className="border-b border-line bg-surface px-4 py-5 md:px-6">
          <p className="text-body">
            {viewer?.suspendedAt
              ? "Your account is suspended, so posting is paused."
              : viewer
                ? "Pick a handle to start posting."
                : "Sign in with the SkyCastle Slack to post and react."}
          </p>
          <div className="mt-3">
            {viewer?.suspendedAt ? null : viewer ? (
              <Link href="/onboarding" className="inline-flex h-10 items-center rounded-sm bg-cobalt px-4 text-body font-semibold text-on-cobalt">
                pick a handle
              </Link>
            ) : (
              <SlackButton size="sm" />
            )}
          </div>
        </div>
      )}

      {posts.length === 0 && page === 1 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-title-l">the castle is quiet</p>
          <p className="mt-2 text-body text-muted">Be the first to share what you&apos;re building.</p>
        </div>
      ) : (
        posts.map((p) => <Post key={p.id} post={p} viewer={builder} />)
      )}
      <Pager page={page} hasMore={rows.length > PER_PAGE} href={(n) => (n === 1 ? "/feed" : `/feed?page=${n}`)} older="older posts" newer="newer posts" />
    </>
  );
}
