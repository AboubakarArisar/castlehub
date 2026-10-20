import type { Metadata } from "next";
import { NavLink } from "@/components/nav-link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "admin · castlehub", robots: { index: false, follow: false } };

const TABS = [
  { href: "/admin", label: "overview" },
  { href: "/admin/content", label: "content" },
  { href: "/admin/users", label: "users" },
  { href: "/admin/log", label: "audit log" },
];

// Only admins get past requireAdmin; everyone else sees the normal 404.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-8 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line">
          <div className="pb-4">
            <p className="text-label text-muted">admin</p>
            <h1 className="text-display-l">
              castle <span className="accent-serif">control</span>
            </h1>
          </div>
          <nav aria-label="Admin" className="flex gap-6">
            {TABS.map((t) => (
              <NavLink
                key={t.href}
                href={t.href}
                exact
                className="border-b-2 border-transparent pb-3 text-body font-medium text-muted transition-colors duration-120 hover:text-ink aria-[current=page]:border-cobalt aria-[current=page]:text-ink"
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="py-6">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
