// The public address of the site (AUTH_URL in production) and the Slack #builds deep link.
export const SITE_URL = process.env.AUTH_URL ?? "https://castlehub.aboubakarisar.tech";

const BUILDS_CHANNEL = process.env.SLACK_BUILDS_CHANNEL_ID ?? "C0BG5GRT0GP";

/** Opens #builds in the Slack app (or web) for the SkyCastle workspace. */
export function buildsLink() {
  const team = process.env.SLACK_TEAM_ID;
  return `https://slack.com/app_redirect?channel=${BUILDS_CHANNEL}${team ? `&team=${team}` : ""}`;
}
