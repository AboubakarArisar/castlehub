import Link from "next/link";

/** Page number from ?page=, clamped to 1..200. */
export const pageParam = (v: unknown) => Math.min(200, Math.max(1, Number.parseInt(String(v ?? "1"), 10) || 1));

/** "newer / older" links under a list. hasMore comes from fetching one extra row. */
export function Pager({ page, hasMore, href, older = "older", newer = "newer" }: { page: number; hasMore: boolean; href: (page: number) => string; older?: string; newer?: string }) {
  if (page === 1 && !hasMore) return null;
  const cls = "inline-flex h-10 items-center rounded-sm border border-line-strong px-4 text-body font-semibold hover:border-ink";
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 px-4 py-5 md:px-6">
      {page > 1 ? <Link href={href(page - 1)} className={cls}>← {newer}</Link> : <span />}
      <span className="text-count text-muted">page {page}</span>
      {hasMore ? <Link href={href(page + 1)} className={cls}>{older} →</Link> : <span />}
    </nav>
  );
}
