import type { Metadata } from "next";
import Link from "next/link";
import { markNotificationsRead } from "@/actions/notifications";
import { Avatar } from "@/components/avatar";
import { MarkRead } from "@/components/notification-bell";
import { PageHeader } from "@/components/shell";
import { getNotifications, type NotificationRow } from "@/lib/queries";
import { timeAgo } from "@/lib/rules";
import { requireViewer } from "@/lib/session";
import { milestoneName } from "@/lib/streaks";

export const metadata: Metadata = { title: "notifications · castlehub", robots: { index: false } };

const snip = (s?: string | null) => (s ? `“${s.length > 90 ? `${s.slice(0, 90)}…` : s}”` : "");

function describe(n: NotificationRow): { text: React.ReactNode; href: string } {
  const project = n.project && <strong className="font-semibold text-ink">{n.project.name}</strong>;
  const projectHref = n.project ? `/${n.project.owner.handle}/${n.project.slug}` : "/";
  const postHref = n.post ? `/post/${n.post.id}` : "/";
  switch (n.kind) {
    case "POST_COMMENT":
      return { text: <>commented on your post: {snip(n.comment?.body)}</>, href: `${postHref}#comments` };
    case "PROJECT_COMMENT":
      return { text: <>commented on {project}: {snip(n.comment?.body)}</>, href: `${projectHref}#comments` };
    case "POST_REACTION":
      return { text: <>reacted to your post {snip(n.post?.body)}</>, href: postHref };
    case "PROJECT_UPVOTE":
      return { text: <>upvoted {project}</>, href: projectHref };
    case "COLLABORATOR_ADDED":
      return { text: <>added you as a collaborator on {project}</>, href: projectHref };
    case "MENTION":
      return {
        text: <>mentioned you: {snip(n.comment?.body ?? n.post?.body)}</>,
        href: n.commentId ? `${n.postId ? postHref : projectHref}#comments` : postHref,
      };
    case "STREAK_MILESTONE":
      return {
        text: <>reached a {n.streakDays}-day build streak: <strong className="font-semibold text-amber">{milestoneName(n.streakDays ?? 0)}</strong></>,
        href: `/${n.actor.handle}#streak`,
      };
  }
}

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const items = await getNotifications(viewer.id);

  return (
    <>
      <PageHeader label="for you" title={<>what&apos;s <span className="accent-serif">new</span></>} />
      <MarkRead action={markNotificationsRead} />
      {items.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-title-l">nothing yet</p>
          <p className="mt-2 text-body text-muted">Comments, reactions, upvotes and @mentions on your work show up here.</p>
        </div>
      ) : (
        <ul>
          {items.map((n) => {
            const { text, href } = describe(n);
            return (
              <li key={n.id} className={`border-b border-line ${n.readAt ? "" : "bg-cobalt/[0.06]"}`}>
                <Link href={href} className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface md:px-6">
                  <Avatar seed={n.actor.handle ?? n.actor.id} src={n.actor.image} size={36} />
                  <p className="min-w-0 flex-1 text-body">
                    <span className="font-semibold">{n.kind === "STREAK_MILESTONE" ? "You" : n.actor.name}</span> <span className="text-muted">{text}</span>
                  </p>
                  <span className="flex shrink-0 items-center gap-2 text-body-s text-muted">
                    {timeAgo(n.createdAt)}
                    {!n.readAt && <span className="size-2 rounded-full bg-cobalt" aria-label="unread" />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
