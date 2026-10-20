import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "./rich";

const html = (t: string) => renderToStaticMarkup(<RichText text={t} />);

test("bold, italic, code", () => {
  const out = html("**We don't wait.** *really* _truly_ `npm i`");
  assert.match(out, /<strong[^>]*>We don&#x27;t wait.<\/strong>/);
  assert.match(out, /<em>really<\/em> <em>truly<\/em>/);
  assert.match(out, /<code[^>]*>npm i<\/code>/);
});

test("links only allow http(s); bare URLs and mentions link", () => {
  assert.match(html("[site](https://castlehub.app)"), /href="https:\/\/castlehub.app"/);
  assert.doesNotMatch(html("[x](javascript:alert(1))"), /href="javascript/);
  assert.match(html("see https://example.com/a."), /href="https:\/\/example.com\/a"/);
  assert.match(html("thanks @mira-makes!"), /href="\/mira-makes"/);
  assert.doesNotMatch(html("mail me@example.com"), /href="\/example/);
});

test("HTML in user text is escaped, never rendered", () => {
  const out = html("<img src=x onerror=alert(1)> **<b>hi</b>**");
  assert.doesNotMatch(out, /<img/);
  assert.match(out, /&lt;img/);
});

test("lists, paragraphs and line breaks", () => {
  const out = html("intro\nsecond line\n\n- one\n- two");
  assert.match(out, /intro<br\/>second line/);
  assert.match(out, /<ul[^>]*><li>one<\/li><li>two<\/li><\/ul>/);
});

test("Windows line breaks from form submissions work the same", () => {
  assert.match(html("intro\r\n\r\n- one\r\n- two"), /<ul[^>]*><li>one<\/li><li>two<\/li><\/ul>/);
});
