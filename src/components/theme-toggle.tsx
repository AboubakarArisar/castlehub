"use client";

import { Moon, Sun } from "lucide-react";

// Flips the theme on <html> and stores it so the server renders it next time.
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const dark =
      root.classList.contains("dark") ||
      (!root.classList.contains("light") &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    root.classList.remove("light", "dark");
    root.classList.add(next);
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch light or dark theme"
      className={`grid size-9 place-items-center rounded-sm border border-line text-muted transition-colors duration-120 hover:border-line-strong hover:text-ink ${className}`}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </button>
  );
}
