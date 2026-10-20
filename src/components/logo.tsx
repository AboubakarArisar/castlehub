import Image from "next/image";
import appIcon from "../../public/brand/app-icon.png";
import logoOnDark from "../../public/brand/logo-on-dark.png";
import logoOnLight from "../../public/brand/logo-on-light.png";

/** The CastleHub app icon (rounded square). Used in navigation. */
export function Mark({ className = "size-8" }: { className?: string }) {
  return <Image src={appIcon} alt="" className={`shrink-0 ${className}`} sizes="48px" priority />;
}

/** App icon + name, for headers and navigation. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <Mark className="size-8" />
      <span className="font-display text-[1.6rem] leading-none font-extrabold tracking-[-0.05em]">
        castle<span className="text-cobalt">hub</span>
      </span>
    </span>
  );
}

/** Full logo artwork. Swaps to the version that reads on the current theme. */
export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <span className="inline-flex">
      <Image src={logoOnLight} alt="castlehub" className={`dark:hidden ${className}`} sizes="320px" />
      <Image src={logoOnDark} alt="castlehub" className={`hidden dark:block ${className}`} sizes="320px" />
    </span>
  );
}
