import { Composer } from "@/components/composer";
import { Post } from "@/components/post";
import { Shell } from "@/components/shell";
import { posts } from "@/lib/demo";

const TABS = ["for you", "following", "launches"];

// High-fidelity feed prototype (direction B, Sky Workshop). All content is demo data.
export default function FeedPrototype() {
  return (
    <Shell
      title={
        <>
          <p className="text-label mb-2 inline-block rounded-sm bg-amber px-1.5 py-0.5 text-amber-ink">
            prototype · demo content
          </p>
          <h1 className="text-display-l">
            what&apos;s <span className="accent-serif">shipping</span> in the castle
          </h1>
          <nav aria-label="Feed" className="mt-5 -mb-4 flex gap-6">
            {TABS.map((t, i) => (
              <a
                key={t}
                href="#"
                aria-current={i === 0 ? "page" : undefined}
                className="border-b-2 border-transparent pb-3 text-body font-medium text-muted transition-colors duration-120 hover:text-ink aria-[current=page]:border-cobalt aria-[current=page]:text-ink"
              >
                {t}
              </a>
            ))}
          </nav>
        </>
      }
    >
      <Composer />
      {posts.map((p) => (
        <Post key={p.id} post={p} />
      ))}
      <p className="px-6 py-10 text-center text-label text-muted">you&apos;re all caught up · demo feed ends here</p>
    </Shell>
  );
}
