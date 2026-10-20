import type { Metadata } from "next";
import { Roulette } from "@/components/roulette";
import { PageHeader } from "@/components/shell";
import { rouletteCounts } from "@/lib/roulette-server";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "builder roulette · castlehub",
  description: "One spin. One builder. A new discovery.",
};

export default async function RoulettePage() {
  const viewer = await getViewer();
  const counts = await rouletteCounts(viewer?.id ?? null);
  return (
    <>
      <PageHeader label="builder roulette · one spin, one builder" title={<>meet someone <span className="accent-serif">new</span></>} />
      <Roulette counts={counts} signedIn={Boolean(viewer)} />
    </>
  );
}
