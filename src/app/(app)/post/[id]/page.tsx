import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CommentThread } from "@/components/comments";
import { Post } from "@/components/post";
import { getComments, getPost } from "@/lib/queries";
import { asBuilder, getViewer } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/post/[id]">): Promise<Metadata> {
  const post = await getPost((await params).id);
  if (!post) return {};
  const text = post.body.replace(/\s+/g, " ").slice(0, 140);
  return { title: `${post.author.name} on castlehub`, description: text || undefined };
}

export default async function PostPage({ params }: PageProps<"/post/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  const [post, comments] = await Promise.all([getPost(id, viewer?.id), getComments({ postId: id })]);
  if (!post) notFound();

  return (
    <>
      <div className="border-b border-line px-4 py-3 md:px-6">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-body-s text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> feed
        </Link>
      </div>
      <Post post={post} viewer={asBuilder(viewer)} full />
      <section id="comments" aria-labelledby="comments-h" className="scroll-mt-24 px-4 py-6 md:px-6">
        <h2 id="comments-h" className="text-title-m">
          comments <span className="text-count align-middle text-muted">{comments.length}</span>
        </h2>
        <div className="mt-4">
          <CommentThread comments={comments} target={{ postId: post.id }} viewer={asBuilder(viewer)} ownerId={post.authorId} />
        </div>
      </section>
    </>
  );
}
