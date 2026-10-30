"use client";

import Link from "next/link";
import { startTransition } from "react";
import { DropdownMenu } from "radix-ui";
import { LogOut, Moon, Settings, ShieldCheck, User } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Avatar } from "@/components/avatar";
import { toggleTheme } from "@/components/theme-toggle";

const item =
  "flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-body outline-none data-[highlighted]:bg-surface-2";

/** Everything about "me" behind the avatar. On phones it also carries the nav the header hides. */
export function AccountMenu({
  viewer,
  links,
}: {
  viewer: { id: string; handle: string | null; image: string | null; isAdmin: boolean };
  links: { href: string; label: string }[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Account menu" className="rounded-sm ring-cobalt transition-shadow outline-none hover:ring-2 focus-visible:ring-2">
        <Avatar seed={viewer.handle ?? viewer.id} src={viewer.image} size={36} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-48 rounded-sm border border-line-strong bg-paper p-1 shadow-lg">
          {links.map((l) => (
            <DropdownMenu.Item key={l.href} asChild className={`${item} md:hidden`}>
              <Link href={l.href}>{l.label}</Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-line md:hidden" />
          <DropdownMenu.Item asChild className={item}>
            <Link href={viewer.handle ? `/${viewer.handle}` : "/onboarding"}><User className="size-4" /> profile</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <Link href="/settings"><Settings className="size-4" /> settings</Link>
          </DropdownMenu.Item>
          {viewer.isAdmin && (
            <DropdownMenu.Item asChild className={item}>
              <Link href="/admin"><ShieldCheck className="size-4" /> admin</Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={item} onSelect={toggleTheme}>
            <Moon className="size-4" /> switch theme
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={item} onSelect={() => startTransition(() => signOutAction())}>
            <LogOut className="size-4" /> log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
