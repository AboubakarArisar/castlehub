"use client";

import { useState } from "react";
import { SlackLogo } from "@/components/slack-logo";

/**
 * Copies a ready-to-paste message and opens #builds in Slack. The person sends it
 * themselves, so CastleHub never posts on anyone's behalf and needs no extra Slack permissions.
 */
export function ShareToBuilds({ message, url, slackLink }: { message: string; url: string; slackLink: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${message}\n${url}`);
            setCopied(true);
          } catch {}
          if (slackLink) window.open(slackLink, "_blank", "noopener");
        }}
        className="inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-body font-semibold hover:border-ink"
      >
        <SlackLogo className="size-4" /> share to #builds
      </button>
      {copied && (
        <span className="text-body-s text-green" role="status">
          Copied. Paste it in #builds{slackLink ? "" : " on Slack"}.
        </span>
      )}
    </span>
  );
}
