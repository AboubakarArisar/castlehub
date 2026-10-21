import assert from "node:assert/strict";
import { test } from "node:test";
import { audioDuration, sniffAudio } from "./audio";

const bytes = (...parts: (number[] | Uint8Array)[]) => Uint8Array.from(parts.flatMap((p) => [...p]));
const u16 = (v: number) => [(v >> 8) & 0xff, v & 0xff];
const u32 = (v: number) => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
const UNKNOWN = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

/** A tiny WebM like MediaRecorder writes: unknown-size segment and clusters, no Duration. */
function webm(clusters: { time: number; blocks: number[] }[]) {
  const header = [0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x01];
  const info = [0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40]; // TimecodeScale 1,000,000
  const body = clusters.flatMap((c) => [
    0x1f, 0x43, 0xb6, 0x75, ...UNKNOWN,
    0xe7, 0x82, ...u16(c.time),
    ...c.blocks.flatMap((rel) => [0xa3, 0x86, 0x81, ...u16(rel), 0x80, 0xaa, 0xbb]),
  ]);
  return bytes(header, [0x18, 0x53, 0x80, 0x67, ...UNKNOWN], info, body);
}

test("recognises recordings by their bytes, not their name", () => {
  assert.equal(sniffAudio(webm([{ time: 0, blocks: [0] }]))?.ext, "webm");
  assert.equal(sniffAudio(bytes([0x4f, 0x67, 0x67, 0x53], new Array(30).fill(0)))?.ext, "ogg");
  assert.equal(sniffAudio(bytes(u32(20), [0x66, 0x74, 0x79, 0x70], new Array(12).fill(0)))?.ext, "m4a");
  assert.equal(sniffAudio(bytes([0x89, 0x50, 0x4e, 0x47], new Array(20).fill(0))), null); // a PNG
  assert.equal(sniffAudio(new TextEncoder().encode("<script>alert(1)</script>")), null);
});

test("WebM duration from cluster and block times (no Duration element)", () => {
  const file = webm([
    { time: 0, blocks: [0, 20, 40] },
    { time: 30000, blocks: [0, 1000, 12000] }, // last block at 42.0 s
  ]);
  const d = audioDuration(file, sniffAudio(file)!);
  assert.ok(d !== null && Math.abs(d - 42.02) < 0.001, String(d));
  const long = webm([{ time: 60000, blocks: [0, 5000] }]); // 65 s: over the limit
  assert.ok(audioDuration(long, sniffAudio(long)!)! > 60);
});

test("Ogg Opus duration from the last granule position", () => {
  const page = (granule: number) => bytes([0x4f, 0x67, 0x67, 0x53, 0, 0], u32(granule).reverse(), [0, 0, 0, 0], new Array(16).fill(0));
  const opusHead = bytes([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 1, 1], [0x38, 0x01], new Array(8).fill(0)); // pre-skip 312
  const file = bytes(page(0), opusHead, page(48000 * 10 + 312), page(48000 * 25 + 312));
  assert.equal(audioDuration(file, sniffAudio(file)!), 25);
});

test("MP4 duration from the movie header", () => {
  const mvhd = bytes(u32(108), [0x6d, 0x76, 0x68, 0x64], [0, 0, 0, 0], u32(0), u32(0), u32(1000), u32(37500), new Array(80).fill(0));
  const file = bytes(u32(20), [0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20], new Array(8).fill(0), u32(116), [0x6d, 0x6f, 0x6f, 0x76], mvhd);
  assert.equal(audioDuration(file, sniffAudio(file)!), 37.5);
});

test("garbage that only looks like a recording yields no duration", () => {
  const fake = bytes([0x1a, 0x45, 0xdf, 0xa3], new Array(64).fill(0xff));
  assert.equal(audioDuration(fake, sniffAudio(fake)!), null);
});

test("a file with a second recording glued on is rejected, not mis-measured", () => {
  const one = webm([{ time: 0, blocks: [0, 60, 120] }]);
  const glued = bytes(one.subarray(0, one.length - 2), webm([{ time: 0, blocks: [0, 20] }]));
  assert.equal(audioDuration(glued, sniffAudio(glued)!), null);
  const truncatedBlock = bytes(webm([{ time: 0, blocks: [0] }]).subarray(0, 60), [0xa3, 0x8f, 0x81, 0x00]);
  assert.equal(audioDuration(truncatedBlock, sniffAudio(truncatedBlock)!), null);
});
