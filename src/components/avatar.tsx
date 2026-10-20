// A builder's photo, or a 5×5 mirrored pixel avatar seeded by their handle.
const HUES = ["#3b5bff", "#12a150", "#e2622b", "#0e93b0", "#c8901a", "#d64545", "#7a8a3a"];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function Avatar({
  seed,
  src,
  size = 40,
  label,
}: {
  seed: string;
  src?: string | null;
  size?: number;
  label?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user photos from Slack or uploads
      <img
        src={src}
        alt={label ?? ""}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-sm bg-surface-2 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const h = hash(seed);
  const color = HUES[h % HUES.length];
  const cells: [number, number][] = [];
  for (let i = 0; i < 15; i++) {
    if ((h >> (i + 3)) & 1) {
      const x = i % 3;
      const y = Math.floor(i / 3);
      cells.push([x, y]);
      if (x < 2) cells.push([4 - x, y]);
    }
  }
  return (
    <svg
      viewBox="-1 -1 7 7"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="shrink-0 rounded-sm bg-surface-2"
      shapeRendering="crispEdges"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />
      ))}
    </svg>
  );
}
