"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A Link that marks itself aria-current="page" when its route is active.
export function NavLink({ href, ...props }: React.ComponentProps<typeof Link> & { href: string }) {
  const path = usePathname();
  const active = path === href || (href !== "/" && path.startsWith(`${href}/`));
  return <Link href={href} aria-current={active ? "page" : undefined} {...props} />;
}
