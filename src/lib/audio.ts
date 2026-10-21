// Voice comments: identify an uploaded recording from its bytes and read its real duration,
// so the 60-second limit is enforced on the server rather than trusted from the browser.

export const MAX_VOICE_SECONDS = 60;
export const MAX_VOICE_BYTES = 2.5 * 1024 * 1024;

export type AudioKind = { mime: string; ext: "webm" | "ogg" | "m4a"; container: "webm" | "ogg" | "mp4" };

/** WebM/Matroska (Chrome, Android), Ogg (Firefox) or MP4/M4A (Safari). Never trusts the file name. */
export function sniffAudio(b: Uint8Array): AudioKind | null {
  if (b.length < 12) return null;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: "audio/webm", ext: "webm", container: "webm" };
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return { mime: "audio/ogg", ext: "ogg", container: "ogg" };
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return { mime: "audio/mp4", ext: "m4a", container: "mp4" };
  return null;
}

/** Duration in seconds read from the container itself, or null if it can't be determined. */
export function audioDuration(b: Uint8Array, kind: AudioKind): number | null {
  try {
    if (kind.container === "webm") return webmDuration(b);
    if (kind.container === "ogg") return oggDuration(b);
    return mp4Duration(b);
  } catch {
    return null;
  }
}

// ── WebM (EBML) ────────────────────────────────────────────
// MediaRecorder's WebM often has no Duration element, so walk the clusters and take the
// latest block time. Element ids keep their length marker; sizes drop it.

const CLUSTER = 0x1f43b675;
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;

function vint(b: Uint8Array, at: number, keepMarker: boolean) {
  const first = b[at];
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
  if (len > 8 || at + len > b.length) throw new Error("bad vint");
  let value = keepMarker ? first : first & (0xff >> len);
  let allOnes = value === (0xff >> len);
  for (let i = 1; i < len; i++) {
    value = value * 256 + b[at + i];
    if (b[at + i] !== 0xff) allOnes = false;
  }
  return { value, len, unknown: !keepMarker && allOnes };
}

function uint(b: Uint8Array, at: number, len: number) {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + b[at + i];
  return v;
}

function float(b: Uint8Array, at: number, len: number) {
  const view = new DataView(b.buffer, b.byteOffset + at, len);
  return len === 4 ? view.getFloat32(0) : view.getFloat64(0);
}

function webmDuration(b: Uint8Array): number | null {
  let scale = 1_000_000; // TimecodeScale default: 1 ms in ns
  let declared: number | null = null;
  let latest = -1;
  let pos = 0;
  const end = b.length;
  while (pos < end) {
    const id = vint(b, pos, true);
    const size = vint(b, pos + id.len, false);
    const body = pos + id.len + size.len;
    if (id.value === 0x1a45dfa3 && pos > 0) return null; // a second file glued on: malformed
    if (id.value === SEGMENT) {
      pos = body; // descend into the segment
      continue;
    }
    if (id.value === INFO) {
      for (let p = body; p < body + size.value; ) {
        const cid = vint(b, p, true);
        const cs = vint(b, p + cid.len, false);
        const cb = p + cid.len + cs.len;
        if (cid.value === 0x2ad7b1) scale = uint(b, cb, cs.value);
        if (cid.value === 0x4489) declared = float(b, cb, cs.value);
        p = cb + cs.value;
      }
    }
    if (id.value === CLUSTER) {
      let clusterTime = 0;
      let p = body;
      const stop = size.unknown ? end : Math.min(end, body + size.value);
      while (p < stop) {
        const cid = vint(b, p, true);
        if (cid.value === CLUSTER) break; // unknown-size cluster ends where the next one starts
        const cs = vint(b, p + cid.len, false);
        const cb = p + cid.len + cs.len;
        if (cs.unknown || cb + cs.value > end) return null; // runs past the data: malformed
        if (cid.value === 0xe7) clusterTime = uint(b, cb, cs.value);
        if (cid.value === 0xa3 || cid.value === 0xa1) {
          // SimpleBlock / Block: track number (vint), then a signed 16-bit relative time
          const track = vint(b, cb, false);
          const rel = new DataView(b.buffer, b.byteOffset + cb + track.len, 2).getInt16(0);
          latest = Math.max(latest, clusterTime + rel);
        }
        if (cid.value === 0xa0) {
          // BlockGroup: look for its Block
          for (let q = cb; q < cb + cs.value; ) {
            const gid = vint(b, q, true);
            const gs = vint(b, q + gid.len, false);
            const gb = q + gid.len + gs.len;
            if (gid.value === 0xa1) {
              const track = vint(b, gb, false);
              latest = Math.max(latest, clusterTime + new DataView(b.buffer, b.byteOffset + gb + track.len, 2).getInt16(0));
            }
            q = gb + gs.value;
          }
        }
        p = cb + cs.value;
      }
      pos = p;
      continue;
    }
    if (size.unknown) return null;
    pos = body + size.value;
  }
  if (latest >= 0) return (latest * scale) / 1e9 + 0.02; // + one ~20 ms Opus frame
  return declared !== null ? (declared * scale) / 1e9 : null;
}

// ── Ogg ────────────────────────────────────────────────────
// The last page's granule position counts samples; Opus always uses 48 kHz, Vorbis declares its rate.

function oggDuration(b: Uint8Array): number | null {
  const text = (at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));
  let rate = 48000;
  const vorbis = findBytes(b, [0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]); // "\x01vorbis"
  if (vorbis >= 0) rate = new DataView(b.buffer, b.byteOffset + vorbis + 12, 4).getUint32(0, true);
  let preSkip = 0;
  const opus = findBytes(b, [0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64]); // "OpusHead"
  if (opus >= 0) preSkip = new DataView(b.buffer, b.byteOffset + opus + 10, 2).getUint16(0, true);
  for (let i = b.length - 27; i >= 0; i--) {
    if (b[i] === 0x4f && text(i, 4) === "OggS") {
      const granule = Number(new DataView(b.buffer, b.byteOffset + i + 6, 8).getBigUint64(0, true));
      return Math.max(0, granule - preSkip) / rate;
    }
  }
  return null;
}

// ── MP4 / M4A ──────────────────────────────────────────────
// The movie header ('mvhd') holds duration and timescale.

function mp4Duration(b: Uint8Array): number | null {
  const at = findBytes(b, [0x6d, 0x76, 0x68, 0x64]); // "mvhd"
  if (at < 0) return null;
  const view = new DataView(b.buffer, b.byteOffset + at + 4);
  const version = view.getUint8(0);
  if (version === 1) return Number(view.getBigUint64(24)) / view.getUint32(20);
  return view.getUint32(16) / view.getUint32(12);
}

function findBytes(b: Uint8Array, needle: number[]) {
  outer: for (let i = 0; i <= b.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (b[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}
