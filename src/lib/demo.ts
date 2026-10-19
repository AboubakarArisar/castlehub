// DEMO DATA ONLY. Every person, post and number here is invented for the
// prototype and must be replaced by real community content.

export type ProjectType = "GAME" | "WEBSITE" | "AI_TOOL" | "MUSIC" | "ART" | "VIDEO";

export type Media =
  | { kind: "game"; file: string }
  | { kind: "audio"; file: string; track: string; length: string }
  | { kind: "website"; file: string; url: string }
  | { kind: "video"; file: string; length: string }
  | { kind: "art"; file: string };

export type DemoPost = {
  id: string;
  author: { name: string; handle: string; tag: string };
  time: string;
  title?: string;
  body: string;
  media?: Media;
  project?: { name: string; tagline: string; type: ProjectType; launching?: boolean };
  upvotes: number;
  comments: number;
  stamps: { ship: number; need: number; how: number };
};

export const me = { name: "Demo Builder", handle: "demo.builder", tag: "you" };

export const posts: DemoPost[] = [
  {
    id: "p1",
    author: { name: "Mira Okafor", handle: "mira.makes", tag: "game dev" },
    time: "12m",
    title: "skyhop has wall-jumps now",
    body: "Spent the weekend on movement feel. Coyote time is 90ms, jump buffer is 120ms, and wall-jumps push you off at 1.4× run speed. Playable in the browser, arrow keys + space. Tell me where it feels floaty.",
    media: { kind: "game", file: "skyhop-build-14.web" },
    project: { name: "skyhop", tagline: "A tiny platformer about climbing a castle in the clouds", type: "GAME", launching: true },
    upvotes: 48,
    comments: 12,
    stamps: { ship: 9, need: 3, how: 6 },
  },
  {
    id: "p2",
    author: { name: "Theo Lindqvist", handle: "theo.sound", tag: "music" },
    time: "41m",
    body: "Night-shift demo, made entirely with the synth I'm building in WebAudio. Every sound on this track comes out of 300 lines of TypeScript.",
    media: { kind: "audio", file: "night-shift-demo.wav", track: "night shift (demo)", length: "3:04" },
    project: { name: "tapesynth", tagline: "A browser synth with tape wobble built in", type: "MUSIC" },
    upvotes: 31,
    comments: 7,
    stamps: { ship: 4, need: 11, how: 8 },
  },
  {
    id: "p3",
    author: { name: "Ana Ruiz", handle: "ana.ships", tag: "ai tools" },
    time: "1h",
    title: "my agent now files its own bug reports",
    body: "When a test fails it opens the repo, finds the commit, and writes the issue with a repro. 42 seconds from red to ticket in this run.",
    media: { kind: "video", file: "bugscout-demo.mp4", length: "0:42" },
    project: { name: "bugscout", tagline: "An agent that turns failing tests into good bug reports", type: "AI_TOOL", launching: true },
    upvotes: 77,
    comments: 23,
    stamps: { ship: 14, need: 19, how: 12 },
  },
  {
    id: "p4",
    author: { name: "Kenji Mori", handle: "kenji.paints", tag: "generative art" },
    time: "3h",
    body: "Tiles No. 14. Quarter circles on a 6×6 grid, one rule: no two neighbours can face the same way. Prints coming if anyone wants one.",
    media: { kind: "art", file: "tiles-no-14.png" },
    upvotes: 56,
    comments: 9,
    stamps: { ship: 2, need: 15, how: 7 },
  },
  {
    id: "p5",
    author: { name: "Priya Shah", handle: "priya.dev", tag: "web" },
    time: "5h",
    title: "tinyforms is live",
    body: "Forms that fit in a tweet. Write the questions in plain text, get a hosted form and a CSV. Free while it's small.",
    media: { kind: "website", file: "tinyforms-landing.png", url: "tinyforms.app" },
    project: { name: "tinyforms", tagline: "Plain-text forms with a CSV at the end", type: "WEBSITE" },
    upvotes: 39,
    comments: 15,
    stamps: { ship: 21, need: 5, how: 2 },
  },
  {
    id: "p6",
    author: { name: "Sam Achebe", handle: "sam.builds", tag: "hardware" },
    time: "8h",
    body: "Question for the castle: how are you all recording demo videos? Screen Studio, OBS, or straight from the phone? Trying to make a 30-second launch clip that doesn't look like a Zoom call.",
    upvotes: 18,
    comments: 31,
    stamps: { ship: 0, need: 2, how: 9 },
  },
];

export const launching = [
  { name: "bugscout", type: "AI_TOOL" as ProjectType, upvotes: 77 },
  { name: "skyhop", type: "GAME" as ProjectType, upvotes: 48 },
  { name: "tinyforms", type: "WEBSITE" as ProjectType, upvotes: 39 },
];

export const builders = [
  { name: "Lena Park", handle: "lena.3d", tag: "3d + shaders" },
  { name: "Omar Haddad", handle: "omar.audio", tag: "audio plugins" },
  { name: "Jo Brennan", handle: "jo.prints", tag: "zines + art" },
];

export const typeLabel: Record<ProjectType, string> = {
  GAME: "game",
  WEBSITE: "website",
  AI_TOOL: "ai tool",
  MUSIC: "music",
  ART: "art",
  VIDEO: "video",
};
