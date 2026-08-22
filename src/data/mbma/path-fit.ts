/**
 * Fit SVG choropleth paths to the currently visible counties.
 * Paths are already in a CONUS Albers plane (not geoAlbersUsa / AK+HI).
 * Isolating a state must re-fit to that state's paths only — never the radar bbox.
 */

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PathStats {
  points: { x: number; y: number }[];
  rings: { x: number; y: number }[][];
  bbox: BBox;
  centroid: { x: number; y: number };
}

const cache = new Map<string, PathStats>();

export function pathStats(fips: string, d: string): PathStats {
  const hit = cache.get(fips);
  if (hit) return hit;
  const stats = analyze(d);
  cache.set(fips, stats);
  return stats;
}

function analyze(d: string): PathStats {
  const rings: { x: number; y: number }[][] = [];
  let ring: { x: number; y: number }[] = [];
  const re = /([MLZmlz])\s*(-?\d+(?:\.\d+)?)?\s*,?\s*(-?\d+(?:\.\d+)?)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1].toUpperCase();
    if (cmd === "Z") {
      if (ring.length) {
        rings.push(ring);
        ring = [];
      }
      continue;
    }
    if (m[2] == null || m[3] == null) continue;
    const pt = { x: Number(m[2]), y: Number(m[3]) };
    if (cmd === "M") {
      if (ring.length) rings.push(ring);
      ring = [pt];
    } else {
      ring.push(pt);
    }
  }
  if (ring.length) rings.push(ring);

  const points = rings.flat();
  const bbox = pointsBBox(points);
  const outer = rings.reduce((a, b) => (a.length >= b.length ? a : b), [] as { x: number; y: number }[]);
  const centroid = polygonCentroid(outer) ?? bboxCenter(bbox);
  return { points, rings, bbox, centroid };
}

function pointsBBox(points: { x: number; y: number }[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

export function unionBBox(boxes: BBox[]): BBox | null {
  if (!boxes.length) return null;
  const u = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const b of boxes) {
    if (b.minX < u.minX) u.minX = b.minX;
    if (b.minY < u.minY) u.minY = b.minY;
    if (b.maxX > u.maxX) u.maxX = b.maxX;
    if (b.maxY > u.maxY) u.maxY = b.maxY;
  }
  return u;
}

function bboxCenter(b: BBox): { x: number; y: number } {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

function polygonCentroid(pts: { x: number; y: number }[]): { x: number; y: number } | null {
  if (pts.length < 3) return null;
  let twiceA = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const p = pts[j];
    const q = pts[i];
    const f = p.x * q.y - q.x * p.y;
    twiceA += f;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  if (Math.abs(twiceA) < 1e-6) return bboxCenter(pointsBBox(pts));
  return { x: cx / (3 * twiceA), y: cy / (3 * twiceA) };
}

export function pointInRings(x: number, y: number, rings: { x: number; y: number }[][]): boolean {
  if (!rings.length) return false;
  let inside = false;
  for (const ring of rings) {
    if (rayCast(x, y, ring)) inside = !inside;
  }
  return inside;
}

function rayCast(x: number, y: number, ring: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * ViewBox that maps `bbox` into the SVG pixel box with padding.
 * `bottomPx` is reserved for the in-svg legend gutter.
 */
export function fitViewBox(
  bbox: BBox,
  svgWidth: number,
  svgHeight: number,
  padPx: number,
  bottomPx: number,
): string {
  const w = Math.max(bbox.maxX - bbox.minX, 1e-3);
  const h = Math.max(bbox.maxY - bbox.minY, 1e-3);
  const innerW = Math.max(8, svgWidth - 2 * padPx);
  const innerH = Math.max(8, svgHeight - padPx - bottomPx);
  const scale = Math.min(innerW / w, innerH / h);
  const vbW = svgWidth / scale;
  const vbH = svgHeight / scale;
  const ox = padPx / scale + (innerW / scale - w) / 2;
  const oy = padPx / scale + (innerH / scale - h) / 2;
  return `${bbox.minX - ox} ${bbox.minY - oy} ${vbW} ${vbH}`;
}

export function pathToScreen(
  x: number,
  y: number,
  viewBox: string,
  svgWidth: number,
  svgHeight: number,
): { left: number; top: number } {
  const p = viewBox.split(/\s+/).map(Number);
  const vx = p[0] ?? 0;
  const vy = p[1] ?? 0;
  const vw = p[2] || 1;
  const vh = p[3] || 1;
  return {
    left: ((x - vx) / vw) * svgWidth,
    top: ((y - vy) / vh) * svgHeight,
  };
}
