import { Fragment, type ReactNode } from "react";
import Link from "next/link";

// A tiny, safe formatter for user text: builds React elements only (no HTML
// strings), and only http(s) links. Supports **bold**, *italic* / _italic_,
// `code`, [label](https://…), bare URLs, @handle mentions, "- " bullet
// lists, blank-line paragraphs and single line breaks.

const TOKEN = new RegExp(
  [
    "(`[^`\\n]+`)", // 1 code
    "\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)", // 2,3 [label](url)
    "\\*\\*([^\\n]+?)\\*\\*", // 4 bold
    "(?<![\\w*])\\*([^*\\n]+?)\\*(?![\\w*])", // 5 italic *x*
    "(?<![\\w])_([^_\\n]+?)_(?![\\w])", // 6 italic _x_
    "(https?:\\/\\/[^\\s<]+[^\\s<.,;:!?)\\]'\"])", // 7 bare URL
    "(?<![\\w@/])@([a-z0-9][a-z0-9-]{1,28}[a-z0-9])(?![\\w-])", // 8 @handle
  ].join("|"),
  "gi",
);

const linkClass = "text-cobalt underline decoration-cobalt/40 underline-offset-2 hover:decoration-cobalt";

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<code key={k} className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-[0.88em]">{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<a key={k} href={m[3]} target="_blank" rel="noopener noreferrer nofollow ugc" className={linkClass}>{inline(m[2], k)}</a>);
    else if (m[4]) out.push(<strong key={k} className="font-semibold">{inline(m[4], k)}</strong>);
    else if (m[5] || m[6]) out.push(<em key={k}>{inline(m[5] ?? m[6], k)}</em>);
    else if (m[7]) out.push(<a key={k} href={m[7]} target="_blank" rel="noopener noreferrer nofollow ugc" className={`${linkClass} break-all`}>{m[7].replace(/^https?:\/\//, "")}</a>);
    else if (m[8]) out.push(<Link key={k} href={`/${m[8].toLowerCase()}`} className="font-medium text-cobalt hover:underline">@{m[8]}</Link>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function lines(text: string, key: string): ReactNode[] {
  return text.split("\n").map((line, n, all) => (
    <Fragment key={`${key}-l${n}`}>
      {inline(line, `${key}-l${n}`)}
      {n < all.length - 1 && <br />}
    </Fragment>
  ));
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  // Browsers submit textarea line breaks as \r\n; normalise before splitting.
  const blocks = text.replace(/\r\n?/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className={`space-y-3 break-words ${className}`}>
      {blocks.map((block, b) => {
        const rows = block.split("\n");
        if (rows.every((r) => /^\s*[-*•]\s+/.test(r))) {
          return (
            <ul key={b} className="list-disc space-y-1 pl-5 marker:text-muted">
              {rows.map((r, n) => (
                <li key={n}>{inline(r.replace(/^\s*[-*•]\s+/, ""), `${b}-${n}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={b}>{lines(block, String(b))}</p>;
      })}
    </div>
  );
}

/** One-line hint shown under text areas that accept formatting. */
export const FORMAT_HINT = "**bold**  *italic*  `code`  [link](https://…)  @handle  - list";
