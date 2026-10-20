"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A Link that marks itself aria-current="page" when its route is active
// (or, with exact, only on that exact path).
export function NavLink({ href, exact = false, ...props }: React.ComponentProps<typeof Link> & { href: string; exact?: boolean }) {
  const path = usePathname();
  const active = path === href || (!exact && href !== "/" && path.startsWith(`${href}/`));
  return <Link href={href} aria-current={active ? "page" : undefined} {...props} />;
}
