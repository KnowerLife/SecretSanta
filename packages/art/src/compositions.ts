import type { SceneId } from './scenes.ts';
import type { Palette } from './palettes.ts';

export interface ArtContext {
  readonly w: number;
  readonly h: number;
  readonly p: Palette;
  readonly random: () => number;
}

export type Composition = (c: ArtContext) => string[];

function n(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function opacity(value: number): string {
  return value.toFixed(2);
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  alpha = 1,
  stroke?: string,
  strokeWidth = 0,
  dash?: string,
): string {
  const attrs = [
    `x="${n(x)}"`, `y="${n(y)}"`, `width="${n(w)}"`, `height="${n(h)}"`,
    `rx="${n(r)}"`, `fill="${fill}"`,
  ];
  if (alpha !== 1) attrs.push(`opacity="${opacity(alpha)}"`);
  if (stroke && strokeWidth > 0) {
    attrs.push(`stroke="${stroke}"`, `stroke-width="${n(strokeWidth)}"`);
    if (dash) attrs.push(`stroke-dasharray="${dash}"`);
  }
  return `<rect ${attrs.join(' ')}/>`;
}

function circle(cx: number, cy: number, r: number, fill: string, alpha = 1): string {
  const attrs = [`cx="${n(cx)}"`, `cy="${n(cy)}"`, `r="${n(r)}"`, `fill="${fill}"`];
  if (alpha !== 1) attrs.push(`opacity="${opacity(alpha)}"`);
  return `<circle ${attrs.join(' ')}/>`;
}

function ring(cx: number, cy: number, r: number, stroke: string, strokeWidth: number, alpha = 1): string {
  const attrs = [
    `cx="${n(cx)}"`, `cy="${n(cy)}"`, `r="${n(r)}"`, 'fill="none"',
    `stroke="${stroke}"`, `stroke-width="${n(strokeWidth)}"`,
  ];
  if (alpha !== 1) attrs.push(`opacity="${opacity(alpha)}"`);
  return `<circle ${attrs.join(' ')}/>`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, strokeWidth: number, alpha = 1): string {
  return path(`M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`, 'none', stroke, strokeWidth, alpha);
}

function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, alpha = 1): string {
  const attrs = [
    `cx="${n(cx)}"`, `cy="${n(cy)}"`, `rx="${n(rx)}"`, `ry="${n(ry)}"`, `fill="${fill}"`,
  ];
  if (alpha !== 1) attrs.push(`opacity="${opacity(alpha)}"`);
  return `<ellipse ${attrs.join(' ')}/>`;
}

function path(
  d: string,
  fill = 'none',
  stroke?: string,
  strokeWidth = 0,
  alpha = 1,
  dash?: string,
): string {
  const attrs = [`d="${d}"`, `fill="${fill}"`];
  if (stroke && strokeWidth > 0) {
    attrs.push(`stroke="${stroke}"`, `stroke-width="${n(strokeWidth)}"`, 'stroke-linecap="round"', 'stroke-linejoin="round"');
    if (dash) attrs.push(`stroke-dasharray="${dash}"`);
  }
  if (alpha !== 1) attrs.push(`opacity="${opacity(alpha)}"`);
  return `<path ${attrs.join(' ')}/>`;
}

function group(elements: string[], transform: string): string {
  return `<g transform="${transform}">\n${elements.join('\n')}\n</g>`;
}

function unit(c: ArtContext, scale: number): number {
  return Math.min(c.w, c.h) * scale;
}

function at(c: ArtContext, x: number, y: number, s: number) {
  return { x: c.w * x, y: c.h * y, s: unit(c, s) };
}

/* ---------- backdrops: each scene gets its own stage, not the same hills ---------- */

function snowfall(c: ArtContext, count: number, top = 0.85): string[] {
  const dots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    dots.push(circle(
      c.random() * c.w,
      c.random() * c.h * top,
      unit(c, 0.003 + c.random() * 0.009),
      c.p.snow,
      0.35 + c.random() * 0.5,
    ));
  }
  return dots;
}

function table(c: ArtContext, y: number, fill: string, alpha = 1): string[] {
  const top = c.h * y;
  return [
    path(
      `M0 ${n(top + unit(c, 0.02))} Q${n(c.w * 0.5)} ${n(top - unit(c, 0.015))} ${c.w} ${n(top + unit(c, 0.02))} L${c.w} ${c.h} L0 ${c.h} Z`,
      fill, undefined, 0, alpha,
    ),
    path(`M0 ${n(top + unit(c, 0.02))} Q${n(c.w * 0.5)} ${n(top - unit(c, 0.015))} ${c.w} ${n(top + unit(c, 0.02))}`, 'none', c.p.snow, unit(c, 0.006), 0.5),
  ];
}

function window(c: ArtContext, x: number, y: number, w: number, h: number): string[] {
  const px = c.w * x;
  const py = c.h * y;
  const pw = c.w * w;
  const ph = c.h * h;
  const sw = unit(c, 0.012);
  return [
    rect(px, py, pw, ph, unit(c, 0.02), c.p.sky2, 0.55, c.p.snow, sw),
    line(px + pw / 2, py, px + pw / 2, py + ph, c.p.snow, sw, 0.9),
    line(px, py + ph * 0.52, px + pw, py + ph * 0.52, c.p.snow, sw, 0.9),
    ...Array.from({ length: 8 }, (_, i) => circle(
      px + c.random() * pw,
      py + c.random() * ph,
      unit(c, 0.004 + c.random() * 0.007),
      c.p.snow,
      0.7,
    )),
  ];
}

function arcs(c: ArtContext, x: number, y: number, count: number): string[] {
  const cx = c.w * x;
  const cy = c.h * y;
  return Array.from({ length: count }, (_, i) => circle(
    cx, cy, unit(c, 0.16 + i * 0.12), 'none', 0,
  )).map((_, i) => {
    const r = unit(c, 0.16 + i * 0.12);
    return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${c.p.snow}" stroke-width="${n(unit(c, 0.005))}" opacity="${opacity(0.42 - i * 0.06)}"/>`;
  });
}

function stripes(c: ArtContext, count: number, angle = 1): string[] {
  return Array.from({ length: count }, (_, i) => {
    const x = c.w * (0.08 + i * 0.09);
    const d = angle > 0
      ? `M${n(x)} ${c.h} L${n(x + c.w * 0.22)} 0`
      : `M${n(x)} 0 L${n(x + c.w * 0.22)} ${c.h}`;
    return path(d, 'none', c.p.snow, unit(c, 0.012), 0.22);
  });
}

function grid(c: ArtContext, step: number): string[] {
  const dots: string[] = [];
  for (let y = step; y < 1; y += step) {
    for (let x = step; x < 1; x += step) {
      dots.push(circle(c.w * x, c.h * y, unit(c, 0.006), c.p.snow, 0.42));
    }
  }
  return dots;
}

function sheet(c: ArtContext, x: number, y: number, w: number, h: number, rot: number, fill?: string): string[] {
  const a = at(c, x, y, 1);
  const sw = c.w * w;
  const sh = c.h * h;
  return [
    group([
      rect(a.x - sw / 2, a.y - sh / 2, sw, sh, unit(c, 0.02), fill ?? c.p.snow, 0.95, c.p.hillFar, unit(c, 0.005)),
    ], `rotate(${n(rot)} ${n(a.x)} ${n(a.y)})`),
  ];
}

function sun(c: ArtContext, x: number, y: number, r: number): string[] {
  return [
    circle(c.w * x, c.h * y, unit(c, r * 1.9), c.p.glow, 0.45),
    circle(c.w * x, c.h * y, unit(c, r), c.p.glow, 0.9),
  ];
}

/* ---------- paper objects ---------- */

function gift(c: ArtContext, x: number, y: number, s: number, ribbonColor?: string): string[] {
  const p = c.p;
  const w = s * 0.78;
  const h = s * 0.56;
  const left = x - w / 2;
  const top = y - h * 0.18;
  const ribbon = ribbonColor ?? p.accent;
  return [
    ellipse(x, y + h * 0.9, w * 0.62, h * 0.14, p.ink, 0.14),
    rect(left, top, w, h, s * 0.035, p.snow),
    rect(left, top, w, h * 0.22, s * 0.025, ribbon, 0.95),
    rect(x - s * 0.045, top, s * 0.09, h, s * 0.01, ribbon, 0.88),
    path(`M${n(x)} ${n(top)} C${n(x - w * 0.42)} ${n(top - s * 0.16)} ${n(x - w * 0.34)} ${n(top - s * 0.46)} ${n(x - s * 0.05)} ${n(top - s * 0.34)} C${n(x)} ${n(top - s * 0.27)} ${n(x)} ${n(top)} ${n(x)} ${n(top)} Z`, ribbon),
    path(`M${n(x)} ${n(top)} C${n(x + w * 0.42)} ${n(top - s * 0.16)} ${n(x + w * 0.34)} ${n(top - s * 0.46)} ${n(x + s * 0.05)} ${n(top - s * 0.34)} C${n(x)} ${n(top - s * 0.27)} ${n(x)} ${n(top)} ${n(x)} ${n(top)} Z`, ribbon, undefined, 0, 0.85),
    circle(x, top - s * 0.02, s * 0.055, p.accent2),
  ];
}

function card(c: ArtContext, x: number, y: number, s: number, rot: number, lines = 2, fill?: string): string[] {
  const p = c.p;
  const w = s * 0.8;
  const h = s * 0.58;
  const parts = [
    rect(x - w / 2, y - h / 2, w, h, s * 0.035, fill ?? p.snow, 0.98),
    rect(x - w / 2, y - h / 2, w * 0.3, h, s * 0.03, p.accent, 0.82),
  ];
  for (let i = 0; i < lines; i += 1) {
    const ly = y - h * 0.22 + i * h * 0.26;
    parts.push(path(`M${n(x - w * 0.1)} ${n(ly)} L${n(x + w * 0.32)} ${n(ly)}`, 'none', p.ink, s * 0.018, 0.32));
  }
  return [group(parts, `rotate(${n(rot)} ${n(x)} ${n(y)})`)];
}

function envelope(c: ArtContext, x: number, y: number, s: number, rot = 0, open = false): string[] {
  const p = c.p;
  const w = s;
  const h = s * 0.66;
  const parts = [
    rect(x - w / 2, y - h / 2, w, h, s * 0.04, p.snow),
  ];
  if (open) {
    parts.push(path(`M${n(x - w / 2)} ${n(y - h / 2)} L${n(x)} ${n(y + h * 0.18)} L${n(x + w / 2)} ${n(y - h / 2)} Z`, p.hillFar, undefined, 0, 0.6));
    parts.push(rect(x - w * 0.24, y - h * 0.48, w * 0.48, h * 0.46, s * 0.02, p.snow, 0.9));
  } else {
    parts.push(path(`M${n(x - w / 2)} ${n(y - h / 2)} L${n(x)} ${n(y + h * 0.12)} L${n(x + w / 2)} ${n(y - h / 2)} Z`, p.hillFar, undefined, 0, 0.45));
    parts.push(path(`M${n(x - w / 2)} ${n(y + h / 2)} L${n(x - w * 0.12)} ${n(y - h * 0.03)} M${n(x + w / 2)} ${n(y + h / 2)} L${n(x + w * 0.12)} ${n(y - h * 0.03)}`, 'none', p.ink, s * 0.018, 0.28));
    parts.push(circle(x, y + h * 0.08, s * 0.07, p.accent));
  }
  return [group(parts, `rotate(${n(rot)} ${n(x)} ${n(y)})`)];
}

function bubble(c: ArtContext, x: number, y: number, s: number, fill?: string, tail = 1): string[] {
  const p = c.p;
  const w = s * 1.05;
  const h = s * 0.72;
  const parts = [
    rect(x - w / 2, y - h / 2, w, h, h * 0.42, fill ?? p.snow),
    path(`M${n(x + tail * w * 0.24)} ${n(y + h * 0.32)} L${n(x + tail * w * 0.42)} ${n(y + h * 0.62)} L${n(x + tail * w * 0.03)} ${n(y + h * 0.4)} Z`, fill ?? p.snow),
    circle(x - w * 0.2, y, s * 0.035, p.accent),
    circle(x, y, s * 0.035, p.accent2),
    circle(x + w * 0.2, y, s * 0.035, p.hillNear),
  ];
  return parts;
}

function mug(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  const w = s * 0.62;
  const h = s * 0.5;
  return [
    rect(x - w / 2, y - h / 2, w, h, s * 0.07, p.snow),
    path(`M${n(x + w / 2)} ${n(y - h * 0.24)} C${n(x + w * 0.95)} ${n(y - h * 0.36)} ${n(x + w * 0.95)} ${n(y + h * 0.34)} ${n(x + w / 2)} ${n(y + h * 0.2)}`, 'none', p.snow, s * 0.07),
    ellipse(x, y - h / 2, w * 0.46, h * 0.14, p.hillFar, 0.75),
    path(`M${n(x - w * 0.18)} ${n(y - h * 0.68)} C${n(x - w * 0.3)} ${n(y - h * 0.95)} ${n(x + w * 0.12)} ${n(y - h)} ${n(x + w * 0.02)} ${n(y - h * 0.66)}`, 'none', p.snow, s * 0.025, 0.6),
  ];
}

function token(c: ArtContext, x: number, y: number, r: number, fill: string): string[] {
  return [
    circle(x, y, r, fill),
    circle(x, y, r * 0.62, c.p.snow, 0.55),
  ];
}

function pine(c: ArtContext, x: number, y: number, s: number, fill?: string): string[] {
  const color = fill ?? c.p.hillNear;
  return [
    rect(x - s * 0.045, y, s * 0.09, s * 0.34, s * 0.02, color, 0.8),
    path(`M${n(x)} ${n(y - s * 0.9)} L${n(x - s * 0.34)} ${n(y - s * 0.12)} L${n(x + s * 0.34)} ${n(y - s * 0.12)} Z`, color, undefined, 0, 0.92),
    path(`M${n(x)} ${n(y - s * 0.55)} L${n(x - s * 0.42)} ${n(y + s * 0.12)} L${n(x + s * 0.42)} ${n(y + s * 0.12)} Z`, color, undefined, 0, 0.8),
  ];
}

function mitten(c: ArtContext, x: number, y: number, s: number, fill?: string): string[] {
  const color = fill ?? c.p.accent2;
  return [
    path(`M${n(x - s * 0.26)} ${n(y + s * 0.32)} C${n(x - s * 0.5)} ${n(y + s * 0.1)} ${n(x - s * 0.4)} ${n(y - s * 0.34)} ${n(x - s * 0.05)} ${n(y - s * 0.36)} C${n(x + s * 0.24)} ${n(y - s * 0.38)} ${n(x + s * 0.34)} ${n(y - s * 0.12)} ${n(x + s * 0.34)} ${n(y + s * 0.06)} C${n(x + s * 0.52)} ${n(y + s * 0.02)} ${n(x + s * 0.48)} ${n(y + s * 0.34)} ${n(x + s * 0.22)} ${n(y + s * 0.42)} Z`, color),
    rect(x - s * 0.4, y + s * 0.3, s * 0.82, s * 0.13, s * 0.05, c.p.snow, 0.9),
  ];
}

function star(c: ArtContext, x: number, y: number, s: number, fill?: string): string[] {
  const pts = [
    [0, -1], [0.24, -0.28], [1, -0.24], [0.38, 0.18], [0.6, 0.86],
    [0, 0.46], [-0.6, 0.86], [-0.38, 0.18], [-1, -0.24], [-0.24, -0.28],
  ].map(([dx, dy]) => `${n(x + dx * s * 0.5)},${n(y + dy * s * 0.5)}`).join(' ');
  return [`<polygon points="${pts}" fill="${fill ?? c.p.accent}"/>`];
}

function checklist(c: ArtContext, x: number, y: number, s: number, checks: number): string[] {
  const p = c.p;
  const w = s * 0.8;
  const h = s * 1.02;
  const parts = [rect(x - w / 2, y - h / 2, w, h, s * 0.03, p.snow)];
  for (let i = 0; i < 3; i += 1) {
    const cy = y - h * 0.3 + i * h * 0.29;
    parts.push(rect(x - w * 0.34, cy - s * 0.055, s * 0.11, s * 0.11, s * 0.015, 'none', 1, i < checks ? p.accent : p.ink, s * 0.022));
    if (i < checks) {
      parts.push(path(`M${n(x - w * 0.32)} ${n(cy)} l${n(s * 0.04)} ${n(s * 0.04)} l${n(s * 0.08)} ${n(-s * 0.09)}`, 'none', p.accent, s * 0.025));
    }
    parts.push(path(`M${n(x - w * 0.12)} ${n(cy)} L${n(x + w * 0.34)} ${n(cy)}`, 'none', p.ink, s * 0.018, 0.34));
  }
  return parts;
}

function calendar(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  const w = s * 0.86;
  const h = s * 0.8;
  return [
    rect(x - w / 2, y - h / 2, w, h, s * 0.035, p.snow),
    rect(x - w / 2, y - h / 2, w, h * 0.24, s * 0.03, p.accent, 0.9),
    path(`M${n(x - w * 0.22)} ${n(y - h * 0.6)} L${n(x - w * 0.22)} ${n(y - h * 0.32)} M${n(x + w * 0.22)} ${n(y - h * 0.6)} L${n(x + w * 0.22)} ${n(y - h * 0.32)}`, 'none', p.snow, s * 0.045, 0.95),
    ring(x, y + h * 0.12, s * 0.13, p.accent2, s * 0.035),
  ];
}

function lock(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  return [
    path(`M${n(x - s * 0.22)} ${n(y - s * 0.05)} V${n(y - s * 0.3)} C${n(x - s * 0.22)} ${n(y - s * 0.62)} ${n(x + s * 0.22)} ${n(y - s * 0.62)} ${n(x + s * 0.22)} ${n(y - s * 0.3)} V${n(y - s * 0.05)}`, 'none', p.snow, s * 0.1),
    rect(x - s * 0.36, y - s * 0.05, s * 0.72, s * 0.58, s * 0.08, p.snow),
    circle(x, y + s * 0.18, s * 0.07, p.accent),
    path(`M${n(x)} ${n(y + s * 0.23)} V${n(y + s * 0.38)}`, 'none', p.accent, s * 0.055),
  ];
}

function key(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  return [
    ring(x - s * 0.28, y - s * 0.16, s * 0.18, p.snow, s * 0.08),
    path(`M${n(x - s * 0.12)} ${n(y - s * 0.02)} L${n(x + s * 0.42)} ${n(y + s * 0.46)}`, 'none', p.snow, s * 0.1),
    path(`M${n(x + s * 0.24)} ${n(y + s * 0.28)} L${n(x + s * 0.38)} ${n(y + s * 0.14)} M${n(x + s * 0.36)} ${n(y + s * 0.4)} L${n(x + s * 0.5)} ${n(y + s * 0.26)}`, 'none', p.snow, s * 0.08),
  ];
}

function hourglass(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  return [
    path(`M${n(x - s * 0.32)} ${n(y - s * 0.46)} H${n(x + s * 0.32)} L${n(x + s * 0.04)} ${n(y)} L${n(x + s * 0.32)} ${n(y + s * 0.46)} H${n(x - s * 0.32)} L${n(x - s * 0.04)} ${n(y)} Z`, p.snow, undefined, 0, 0.92),
    path(`M${n(x - s * 0.22)} ${n(y - s * 0.32)} L${n(x)} ${n(y - s * 0.04)} L${n(x + s * 0.22)} ${n(y - s * 0.32)} Z`, p.accent, undefined, 0, 0.85),
    circle(x, y + s * 0.22, s * 0.06, p.accent2),
  ];
}

function ticket(c: ArtContext, x: number, y: number, s: number, cells: number): string[] {
  const p = c.p;
  const w = s * 1.2;
  const h = s * 0.62;
  const parts = [
    path(`M${n(x - w / 2)} ${n(y - h / 2)} H${n(x + w / 2)} V${n(y + h / 2)} H${n(x - w / 2)} C${n(x - w / 2 + s * 0.12)} ${n(y)} ${n(x - w / 2 + s * 0.12)} ${n(y)} ${n(x - w / 2)} ${n(y - h / 2)} Z`, p.snow),
    path(`M${n(x + w * 0.12)} ${n(y - h / 2)} V${n(y + h / 2)}`, 'none', p.hillFar, s * 0.02, 0.6, `${n(s * 0.07)} ${n(s * 0.06)}`),
  ];
  for (let i = 0; i < cells; i += 1) {
    const cx = x - w * 0.32 + i * (w * 0.62 / Math.max(cells - 1, 1));
    parts.push(rect(cx - s * 0.07, y - s * 0.1, s * 0.14, s * 0.2, s * 0.015, p.sky2, 0.7, p.ink, s * 0.014));
  }
  return parts;
}

function book(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  const w = s * 0.76;
  const h = s * 0.92;
  return [
    rect(x - w / 2, y - h / 2, w, h, s * 0.03, p.accent2, 0.95),
    rect(x - w / 2 + s * 0.08, y - h / 2, w - s * 0.08, h, s * 0.02, p.snow, 0.95),
    path(`M${n(x - w * 0.3)} ${n(y - h * 0.24)} H${n(x + w * 0.24)} M${n(x - w * 0.3)} ${n(y)} H${n(x + w * 0.12)}`, 'none', p.ink, s * 0.016, 0.35),
  ];
}

function jar(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  const w = s * 0.62;
  const h = s * 0.78;
  return [
    rect(x - w / 2, y - h / 2, w, h, s * 0.09, p.snow, 0.92),
    rect(x - w * 0.56, y - h / 2 - s * 0.08, w * 1.12, s * 0.16, s * 0.04, p.accent2),
    circle(x - w * 0.16, y + h * 0.08, s * 0.06, p.accent),
    circle(x + w * 0.14, y + h * 0.18, s * 0.045, p.hillNear),
  ];
}

function scarf(c: ArtContext, x: number, y: number, s: number): string[] {
  return [
    path(`M${n(x - s * 0.55)} ${n(y - s * 0.28)} C${n(x - s * 0.1)} ${n(y + s * 0.34)} ${n(x + s * 0.18)} ${n(y - s * 0.42)} ${n(x + s * 0.58)} ${n(y + s * 0.18)}`, 'none', c.p.accent, s * 0.16, 0.92),
    path(`M${n(x - s * 0.52)} ${n(y - s * 0.3)} l${n(s * 0.1)} ${n(s * 0.16)} M${n(x + s * 0.5)} ${n(y + s * 0.14)} l${n(s * 0.12)} ${n(-s * 0.12)}`, 'none', c.p.accent2, s * 0.05, 0.9),
  ];
}

function bell(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  return [
    path(`M${n(x)} ${n(y - s * 0.46)} C${n(x - s * 0.4)} ${n(y - s * 0.2)} ${n(x - s * 0.34)} ${n(y + s * 0.24)} ${n(x - s * 0.44)} ${n(y + s * 0.34)} H${n(x + s * 0.44)} C${n(x + s * 0.34)} ${n(y + s * 0.24)} ${n(x + s * 0.4)} ${n(y - s * 0.2)} ${n(x)} ${n(y - s * 0.46)} Z`, p.accent2),
    circle(x, y + s * 0.44, s * 0.09, p.accent),
    circle(x, y - s * 0.52, s * 0.07, p.snow),
  ];
}

function wreath(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  const parts = [ring(x, y, s * 0.42, p.hillNear, s * 0.18)];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6;
    parts.push(circle(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.07, i % 2 ? p.accent : p.accent2));
  }
  return parts;
}

function screen(c: ArtContext, x: number, y: number, s: number, rot: number, alpha: number): string[] {
  const w = s * 0.86;
  const h = s * 0.68;
  return [group([
    rect(x - w / 2, y - h / 2, w, h, s * 0.035, c.p.snow, alpha, c.p.hillFar, s * 0.012),
    path(`M${n(x - w * 0.3)} ${n(y - h * 0.16)} H${n(x + w * 0.28)} M${n(x - w * 0.3)} ${n(y + h * 0.06)} H${n(x + w * 0.12)}`, 'none', c.p.ink, s * 0.018, 0.28 * alpha),
  ], `rotate(${n(rot)} ${n(x)} ${n(y)})`)];
}

function pen(c: ArtContext, x: number, y: number, s: number, rot: number): string[] {
  const p = c.p;
  return [group([
    path(`M${n(x - s * 0.5)} ${n(y + s * 0.5)} L${n(x + s * 0.32)} ${n(y - s * 0.32)}`, 'none', p.ink, s * 0.1),
    path(`M${n(x + s * 0.32)} ${n(y - s * 0.32)} L${n(x + s * 0.48)} ${n(y - s * 0.48)} L${n(x + s * 0.4)} ${n(y - s * 0.22)} Z`, p.accent),
  ], `rotate(${n(rot)} ${n(x)} ${n(y)})`)];
}

function arrow(c: ArtContext, x1: number, y1: number, x2: number, y2: number, color?: string): string[] {
  const stroke = color ?? c.p.accent;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = unit(c, 0.028);
  return [
    path(`M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`, 'none', stroke, unit(c, 0.01)),
    path(`M${n(x2 - Math.cos(a - 0.5) * s)} ${n(y2 - Math.sin(a - 0.5) * s)} L${n(x2)} ${n(y2)} L${n(x2 - Math.cos(a + 0.5) * s)} ${n(y2 - Math.sin(a + 0.5) * s)}`, 'none', stroke, unit(c, 0.01)),
  ];
}

function ribbon(c: ArtContext, x1: number, y1: number, x2: number, y2: number, color?: string): string[] {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - unit(c, 0.06);
  return [path(`M${n(x1)} ${n(y1)} Q${n(mx)} ${n(my)} ${n(x2)} ${n(y2)}`, 'none', color ?? c.p.accent, unit(c, 0.011), 0.9)];
}

function portrait(c: ArtContext, x: number, y: number, s: number): string[] {
  const p = c.p;
  const w = s * 0.72;
  const h = s * 0.92;
  return [
    rect(x - w / 2, y - h / 2, w, h, s * 0.03, p.snow, 0.96, p.hillFar, s * 0.02),
    circle(x, y - h * 0.2, s * 0.14, p.hillFar, 0.8),
    path(`M${n(x - s * 0.24)} ${n(y + h * 0.34)} C${n(x - s * 0.2)} ${n(y + h * 0.02)} ${n(x + s * 0.2)} ${n(y + h * 0.02)} ${n(x + s * 0.24)} ${n(y + h * 0.34)} Z`, p.hillFar, undefined, 0, 0.75),
  ];
}

function hookRail(c: ArtContext, y: number, count: number): string[] {
  const p = c.p;
  const parts = [path(`M0 ${n(c.h * y)} H${c.w}`, 'none', p.hillNear, unit(c, 0.018), 0.7)];
  for (let i = 0; i < count; i += 1) {
    const x = c.w * (0.16 + i * (0.68 / Math.max(count - 1, 1)));
    parts.push(path(`M${n(x)} ${n(c.h * y)} v${n(unit(c, 0.05))}`, 'none', p.accent2, unit(c, 0.012), 0.85));
  }
  return parts;
}

/* ---------- one explicit composition per scene ---------- */

export const COMPOSITIONS: Record<SceneId, Composition> = {
  'social-cover': (c) => {
    const a = at(c, 0.66, 0.58, 0.42);
    return [
      ...stripes(c, 5, -1),
      ...sheet(c, 0.24, 0.6, 0.24, 0.38, -8, c.p.hillFar),
      ...card(c, c.w * 0.26, c.h * 0.5, unit(c, 0.19), -9, 2),
      ...gift(c, a.x, a.y, a.s),
      ...star(c, c.w * 0.88, c.h * 0.24, unit(c, 0.08), c.p.accent2),
      ...snowfall(c, 10),
    ];
  },
  'hero-winter-scene': (c) => {
    const a = at(c, 0.68, 0.62, 0.4);
    return [
      ...window(c, 0.5, 0.12, 0.42, 0.45),
      ...table(c, 0.74, c.p.hillFar, 0.95),
      ...gift(c, a.x, a.y, a.s),
      ...card(c, c.w * 0.42, c.h * 0.68, unit(c, 0.2), -14, 2),
      ...mug(c, c.w * 0.9, c.h * 0.63, unit(c, 0.18)),
      ...snowfall(c, 14, 0.6),
    ];
  },
  'rules-fair-draw': (c) => {
    const cx = c.w * 0.58;
    const cy = c.h * 0.55;
    const r = unit(c, 0.26);
    const parts = [...arcs(c, 0.58, 0.55, 3)];
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
      parts.push(...token(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, unit(c, 0.07), i === 2 ? c.p.accent : c.p.snow));
    }
    parts.push(...arrow(c, cx + r * 0.7, cy + r * 0.7, cx + r * 1.05, cy - r * 0.35));
    parts.push(...snowfall(c, 8));
    return parts;
  },
  'testimonials-friends': (c) => [
    ...grid(c, 0.18),
    ...bubble(c, c.w * 0.36, c.h * 0.36, unit(c, 0.28), c.p.snow, 1),
    ...bubble(c, c.w * 0.68, c.h * 0.33, unit(c, 0.24), c.p.hillFar, -1),
    ...bubble(c, c.w * 0.56, c.h * 0.64, unit(c, 0.26), c.p.snow, 1),
    ...gift(c, c.w * 0.24, c.h * 0.7, unit(c, 0.17), c.p.accent2),
    ...gift(c, c.w * 0.84, c.h * 0.72, unit(c, 0.15)),
    ...star(c, c.w * 0.5, c.h * 0.44, unit(c, 0.09), c.p.accent),
  ],
  'faq-help': (c) => [
    ...grid(c, 0.14),
    ...bubble(c, c.w * 0.32, c.h * 0.42, unit(c, 0.32)),
    path(`M${n(c.w * 0.28)} ${n(c.h * 0.4)} C${n(c.w * 0.24)} ${n(c.h * 0.25)} ${n(c.w * 0.41)} ${n(c.w * 0.25)} ${n(c.w * 0.39)} ${n(c.h * 0.4)} C${n(c.w * 0.38)} ${n(c.h * 0.47)} ${n(c.w * 0.3)} ${n(c.h * 0.47)} ${n(c.w * 0.3)} ${n(c.h * 0.55)}`, 'none', c.p.accent, unit(c, 0.035)),
    ...card(c, c.w * 0.7, c.h * 0.54, unit(c, 0.32), 6, 3),
    ...arrow(c, c.w * 0.48, c.h * 0.48, c.w * 0.56, c.h * 0.48),
  ],
  'create-game-head': (c) => [
    ...stripes(c, 4, 1),
    ...sheet(c, 0.56, 0.52, 0.42, 0.72, -3),
    ...calendar(c, c.w * 0.35, c.h * 0.38, unit(c, 0.25)),
    ...pen(c, c.w * 0.65, c.h * 0.62, unit(c, 0.24), -12),
    ...gift(c, c.w * 0.8, c.h * 0.78, unit(c, 0.18)),
  ],
  'join-game-head': (c) => [
    ...window(c, 0.62, 0.16, 0.3, 0.58),
    ...ticket(c, c.w * 0.38, c.h * 0.5, unit(c, 0.34), 4),
    ...arrow(c, c.w * 0.55, c.h * 0.52, c.w * 0.62, c.h * 0.52),
    path(`M${n(c.w * 0.74)} ${n(c.h * 0.28)} L${n(c.w * 0.88)} ${n(c.h * 0.4)} L${n(c.w * 0.74)} ${n(c.h * 0.52)} Z`, c.p.accent2, undefined, 0, 0.55),
    ...snowfall(c, 12, 0.55),
  ],
  'quick-draw-head': (c) => [
    ...stripes(c, 6, -1),
    ...card(c, c.w * 0.44, c.h * 0.48, unit(c, 0.3), -12, 2),
    ...card(c, c.w * 0.58, c.h * 0.55, unit(c, 0.3), 9, 2, c.p.hillFar),
    ...arrow(c, c.w * 0.68, c.h * 0.44, c.w * 0.84, c.h * 0.44),
    ...ribbon(c, c.w * 0.34, c.h * 0.7, c.w * 0.72, c.h * 0.7),
    ...star(c, c.w * 0.86, c.h * 0.7, unit(c, 0.1), c.p.accent2),
  ],
  'privacy-who-sees': (c) => [
    ...sheet(c, 0.62, 0.56, 0.5, 0.64, 0, c.p.hillFar),
    ...screen(c, c.w * 0.42, c.h * 0.56, unit(c, 0.38), -8, 0.75),
    ...screen(c, c.w * 0.58, c.h * 0.5, unit(c, 0.38), 3, 0.9),
    ...screen(c, c.w * 0.74, c.h * 0.45, unit(c, 0.38), 12, 1),
    ...lock(c, c.w * 0.74, c.h * 0.46, unit(c, 0.18)),
  ],
  'gift-ideas': (c) => [
    ...grid(c, 0.16),
    ...sheet(c, 0.58, 0.52, 0.5, 0.68, 4),
    ...book(c, c.w * 0.42, c.h * 0.42, unit(c, 0.22)),
    ...scarf(c, c.w * 0.68, c.h * 0.38, unit(c, 0.22)),
    ...jar(c, c.w * 0.72, c.h * 0.66, unit(c, 0.18)),
    ...mitten(c, c.w * 0.46, c.h * 0.68, unit(c, 0.19)),
    ...pen(c, c.w * 0.6, c.h * 0.78, unit(c, 0.16), 24),
  ],
  'cta-celebration': (c) => [
    ...sun(c, 0.74, 0.3, 0.16),
    ...table(c, 0.78, c.p.hillFar),
    ...gift(c, c.w * 0.7, c.h * 0.5, unit(c, 0.32)),
    ...gift(c, c.w * 0.86, c.h * 0.28, unit(c, 0.16), c.p.accent2),
    ...gift(c, c.w * 0.48, c.h * 0.34, unit(c, 0.13)),
    ...ribbon(c, c.w * 0.3, c.h * 0.3, c.w * 0.52, c.h * 0.46, c.p.accent2),
    ...star(c, c.w * 0.3, c.h * 0.62, unit(c, 0.09)),
  ],
  'quick-draw-success': (c) => [
    ...arcs(c, 0.6, 0.5, 2),
    ...card(c, c.w * 0.42, c.h * 0.52, unit(c, 0.32), -8, 2),
    ...card(c, c.w * 0.7, c.h * 0.52, unit(c, 0.32), 8, 2),
    ...ribbon(c, c.w * 0.42, c.h * 0.68, c.w * 0.7, c.h * 0.68),
    ...gift(c, c.w * 0.56, c.h * 0.76, unit(c, 0.15)),
    ...star(c, c.w * 0.82, c.h * 0.26, unit(c, 0.1), c.p.accent2),
    ...snowfall(c, 6),
  ],
  'mode-online': (c) => {
    const parts = [
      ...window(c, 0.18, 0.12, 0.3, 0.4),
      ...table(c, 0.68, c.p.hillFar),
      ...gift(c, c.w * 0.66, c.h * 0.56, unit(c, 0.26)),
    ];
    for (let i = 0; i < 4; i += 1) {
      parts.push(...card(c, c.w * (0.2 + i * 0.17), c.h * 0.46, unit(c, 0.15), (i - 1.5) * 5, 1));
      parts.push(...ribbon(c, c.w * (0.2 + i * 0.17), c.h * 0.53, c.w * 0.66, c.h * 0.58, c.p.accent2));
    }
    return parts;
  },
  'mode-quick': (c) => [
    ...stripes(c, 5, -1),
    ...card(c, c.w * 0.32, c.h * 0.48, unit(c, 0.3), -4, 2),
    ...card(c, c.w * 0.38, c.h * 0.5, unit(c, 0.3), 3, 2),
    ...card(c, c.w * 0.46, c.h * 0.52, unit(c, 0.3), 0, 2),
    ...arrow(c, c.w * 0.62, c.h * 0.44, c.w * 0.8, c.h * 0.44),
    ...token(c, c.w * 0.84, c.h * 0.44, unit(c, 0.08), c.p.accent),
  ],
  'mode-demo': (c) => [
    ...sun(c, 0.5, 0.26, 0.14),
    ...table(c, 0.74, c.p.hillFar),
    rect(c.w * 0.52, c.h * 0.68, unit(c, 0.5), unit(c, 0.1), unit(c, 0.02), c.p.hillNear, 0.8),
    ...gift(c, c.w * 0.5, c.h * 0.54, unit(c, 0.26), c.p.accent2),
    ...card(c, c.w * 0.26, c.h * 0.6, unit(c, 0.18), -14, 1),
    ...star(c, c.w * 0.76, c.h * 0.36, unit(c, 0.08)),
  ],
  'dashboard-empty': (c) => [
    ...table(c, 0.8, c.p.hillFar, 0.85),
    ...gift(c, c.w * 0.72, c.h * 0.62, unit(c, 0.3)),
    ...card(c, c.w * 0.28, c.h * 0.7, unit(c, 0.16), -6, 1, c.p.hillFar),
    ...snowfall(c, 8, 0.5),
  ],
  'step-create-game': (c) => [
    ...sheet(c, 0.56, 0.5, 0.46, 0.7, -4),
    ...calendar(c, c.w * 0.34, c.h * 0.36, unit(c, 0.22)),
    ...pen(c, c.w * 0.66, c.h * 0.6, unit(c, 0.24), -18),
    path(`M${n(c.w * 0.56)} ${n(c.h * 0.7)} h${n(unit(c, 0.16))}`, 'none', c.p.accent, unit(c, 0.014)),
  ],
  'step-invite-friends': (c) => {
    const parts = [...grid(c, 0.2), path(`M${n(c.w * 0.22)} ${n(c.h * 0.72)} Q${n(c.w * 0.55)} ${n(c.h * 0.9)} ${n(c.w * 0.78)} ${n(c.h * 0.58)}`, 'none', c.p.accent2, unit(c, 0.012), 0.8, `${n(unit(c, 0.03))} ${n(unit(c, 0.03))}`)];
    for (let i = 0; i < 4; i += 1) {
      parts.push(...envelope(c, c.w * (0.36 + i * 0.13), c.h * (0.5 - i * 0.045), unit(c, 0.16), (i - 1.5) * 8));
    }
    return parts;
  },
  'step-draw-gifts': (c) => {
    const parts = [...arcs(c, 0.56, 0.54, 2)];
    for (let i = 0; i < 5; i += 1) {
      const x = c.w * (0.28 + i * 0.14);
      const y = c.h * (0.58 - Math.sin((i / 4) * Math.PI) * 0.12);
      parts.push(...envelope(c, x, y, unit(c, 0.16), (i - 2) * 5));
    }
    parts.push(...token(c, c.w * 0.56, c.h * 0.56, unit(c, 0.08), c.p.accent));
    parts.push(...ribbon(c, c.w * 0.3, c.h * 0.74, c.w * 0.8, c.h * 0.74, c.p.accent2));
    return parts;
  },
  'access-empty': (c) => [
    ...hookRail(c, 0.32, 4),
    ...card(c, c.w * 0.32, c.h * 0.58, unit(c, 0.2), -3, 0),
    ...card(c, c.w * 0.44, c.h * 0.62, unit(c, 0.2), 0, 0),
    ...card(c, c.w * 0.56, c.h * 0.66, unit(c, 0.2), 4, 0),
    ring(c.w * 0.78, c.h * 0.46, unit(c, 0.09), c.p.accent, unit(c, 0.012)),
    ...stripes(c, 3, 1),
  ],
  'activity-empty': (c) => {
    const parts = [...grid(c, 0.16), path(`M${n(c.w * 0.2)} ${n(c.h * 0.52)} H${n(c.w * 0.82)}`, 'none', c.p.hillNear, unit(c, 0.012))];
    for (let i = 0; i < 3; i += 1) {
      parts.push(...token(c, c.w * (0.3 + i * 0.2), c.h * 0.52, unit(c, 0.055), i === 0 ? c.p.accent : c.p.snow));
      parts.push(...card(c, c.w * (0.3 + i * 0.2), c.h * (0.72 + i * 0.02), unit(c, 0.14), 0, 1));
    }
    return parts;
  },
  'audience-remote': (c) => [
    ...window(c, 0.3, 0.12, 0.4, 0.36),
    ...table(c, 0.72, c.p.hillFar),
    path(`M${n(c.w * 0.18)} ${n(c.h * 0.36)} Q${n(c.w * 0.5)} ${n(c.h * 0.56)} ${n(c.w * 0.82)} ${n(c.h * 0.36)}`, 'none', c.p.accent2, unit(c, 0.012)),
    ...mitten(c, c.w * 0.24, c.h * 0.4, unit(c, 0.2)),
    ...mitten(c, c.w * 0.76, c.h * 0.4, unit(c, 0.2), c.p.hillNear),
  ],
  'chat-empty': (c) => [
    ...grid(c, 0.15),
    ...bubble(c, c.w * 0.38, c.h * 0.4, unit(c, 0.3), c.p.snow, 1),
    ...bubble(c, c.w * 0.66, c.h * 0.62, unit(c, 0.26), c.p.hillFar, -1),
    circle(c.w * 0.3, c.h * 0.78, unit(c, 0.06), c.p.accent2, 0.8),
  ],
  'chat-waiting': (c) => [
    ...table(c, 0.72, c.p.hillFar),
    ...envelope(c, c.w * 0.36, c.h * 0.52, unit(c, 0.3)),
    ...mug(c, c.w * 0.7, c.h * 0.55, unit(c, 0.24)),
    ...ribbon(c, c.w * 0.32, c.h * 0.68, c.w * 0.7, c.h * 0.68, c.p.accent2),
    ...hourglass(c, c.w * 0.86, c.h * 0.4, unit(c, 0.14)),
  ],
  'feature-anonymous-chat': (c) => [
    ...sheet(c, 0.5, 0.5, 0.52, 0.62, 0, c.p.hillFar),
    ...bubble(c, c.w * 0.32, c.h * 0.38, unit(c, 0.28), c.p.snow, 1),
    ...bubble(c, c.w * 0.68, c.h * 0.58, unit(c, 0.28), c.p.snow, -1),
    ...envelope(c, c.w * 0.52, c.h * 0.5, unit(c, 0.16), 8, true),
    circle(c.w * 0.52, c.h * 0.49, unit(c, 0.035), c.p.accent),
  ],
  'invite-share': (c) => [
    ...arcs(c, 0.58, 0.46, 2),
    ...card(c, c.w * 0.42, c.h * 0.56, unit(c, 0.34), -4, 2),
    ...arrow(c, c.w * 0.62, c.h * 0.3, c.w * 0.8, c.h * 0.22),
    ...arrow(c, c.w * 0.64, c.h * 0.48, c.w * 0.84, c.h * 0.48),
    ...arrow(c, c.w * 0.62, c.h * 0.66, c.w * 0.8, c.h * 0.74),
  ],
  'profile-empty': (c) => [
    ...stripes(c, 4, 1),
    ...portrait(c, c.w * 0.5, c.h * 0.48, unit(c, 0.42)),
    ...mitten(c, c.w * 0.76, c.h * 0.68, unit(c, 0.18)),
    path(`M${n(c.w * 0.2)} ${n(c.h * 0.8)} h${n(unit(c, 0.18))}`, 'none', c.p.accent, unit(c, 0.012)),
  ],
  'recipient-waiting': (c) => [
    ...snowfall(c, 12, 0.7),
    ...envelope(c, c.w * 0.42, c.h * 0.52, unit(c, 0.36)),
    ...ribbon(c, c.w * 0.3, c.h * 0.42, c.w * 0.54, c.h * 0.64),
    ...hourglass(c, c.w * 0.72, c.h * 0.52, unit(c, 0.22)),
    ring(c.w * 0.72, c.h * 0.52, unit(c, 0.3), c.p.hillFar, unit(c, 0.008)),
  ],
  'wishlist-empty': (c) => [
    ...grid(c, 0.14),
    ...sheet(c, 0.52, 0.52, 0.4, 0.7, 3),
    ...checklist(c, c.w * 0.52, c.h * 0.5, unit(c, 0.34), 0),
    ...pen(c, c.w * 0.76, c.h * 0.72, unit(c, 0.2), 32),
  ],
  'guide-format': (c) => [
    ...card(c, c.w * 0.24, c.h * 0.54, unit(c, 0.32), -6, 0),
    ...clock(c, c.w * 0.24, c.h * 0.46, unit(c, 0.12)),
    ...card(c, c.w * 0.52, c.h * 0.48, unit(c, 0.32), 0, 0),
    ...checklist(c, c.w * 0.52, c.h * 0.48, unit(c, 0.2), 2),
    ...card(c, c.w * 0.8, c.h * 0.58, unit(c, 0.32), 7, 0),
    ...gift(c, c.w * 0.8, c.h * 0.56, unit(c, 0.14)),
  ],
  'guide-prep': (c) => [
    ...stripes(c, 3, -1),
    ...sheet(c, 0.42, 0.5, 0.36, 0.62, -4),
    ...pen(c, c.w * 0.52, c.h * 0.52, unit(c, 0.22), -20),
    ...gift(c, c.w * 0.76, c.h * 0.64, unit(c, 0.2), c.p.accent2),
    ...mug(c, c.w * 0.78, c.h * 0.32, unit(c, 0.16)),
    ...star(c, c.w * 0.3, c.h * 0.28, unit(c, 0.08)),
  ],
  'guide-room-team': (c) => {
    const parts = [...window(c, 0.56, 0.12, 0.36, 0.38), ...table(c, 0.7, c.p.hillFar)];
    for (let i = 0; i < 4; i += 1) {
      parts.push(...card(c, c.w * (0.18 + i * 0.16), c.h * 0.52, unit(c, 0.15), (i - 1.5) * 4, 0));
    }
    parts.push(...envelope(c, c.w * 0.82, c.h * 0.62, unit(c, 0.16), 8));
    return parts;
  },
  'guide-room-wishes': (c) => [
    ...grid(c, 0.17),
    ...sheet(c, 0.48, 0.5, 0.44, 0.66, 2),
    ...checklist(c, c.w * 0.48, c.h * 0.5, unit(c, 0.3), 1),
    ...pen(c, c.w * 0.74, c.h * 0.7, unit(c, 0.18), 28),
    ...star(c, c.w * 0.22, c.h * 0.36, unit(c, 0.08), c.p.accent2),
    ...book(c, c.w * 0.26, c.h * 0.68, unit(c, 0.16)),
  ],
  'guide-room-profile': (c) => [
    ...stripes(c, 4, -1),
    ...portrait(c, c.w * 0.4, c.h * 0.5, unit(c, 0.38)),
    ...mitten(c, c.w * 0.7, c.h * 0.6, unit(c, 0.2), c.p.hillNear),
    ...ribbon(c, c.w * 0.52, c.h * 0.78, c.w * 0.78, c.h * 0.7),
  ],
  'guide-room-draw': (c) => {
    const cx = c.w * 0.54;
    const cy = c.h * 0.5;
    const r = unit(c, 0.28);
    const parts = [...arcs(c, 0.54, 0.5, 2)];
    for (let i = 0; i < 5; i += 1) {
      const a = (Math.PI * 2 * i) / 5;
      parts.push(...envelope(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, unit(c, 0.14), (i - 2) * 8));
    }
    parts.push(...arrow(c, cx + r * 0.8, cy + r * 0.6, cx + r * 1.12, cy - r * 0.2));
    parts.push(...gift(c, c.w * 0.82, c.h * 0.76, unit(c, 0.14)));
    return parts;
  },
  'guide-room-gift': (c) => [
    ...grid(c, 0.2),
    ...gift(c, c.w * 0.42, c.h * 0.56, unit(c, 0.3)),
    ...bubble(c, c.w * 0.72, c.h * 0.34, unit(c, 0.24), c.p.snow, -1),
    path(`M${n(c.w * 0.66)} ${n(c.h * 0.34)} l${n(unit(c, 0.05))} ${n(unit(c, 0.06))} l${n(unit(c, 0.11))} ${n(-unit(c, 0.12))}`, 'none', c.p.accent, unit(c, 0.024)),
    ...card(c, c.w * 0.76, c.h * 0.7, unit(c, 0.16), 8, 1),
  ],
};

function clock(c: ArtContext, x: number, y: number, s: number): string[] {
  return [
    circle(x, y, s, c.p.snow, 0.95),
    ring(x, y, s * 0.82, c.p.ink, s * 0.08),
    path(`M${n(x)} ${n(y)} V${n(y - s * 0.52)} M${n(x)} ${n(y)} L${n(x + s * 0.38)} ${n(y + s * 0.2)}`, 'none', c.p.ink, s * 0.09),
  ];
}

export const DESCRIPTIONS: Record<SceneId, string> = {
  'social-cover': 'Paper cover with a gift box and two greeting cards.',
  'hero-winter-scene': 'Paper desk by a snowy window with a gift, cards and cocoa.',
  'rules-fair-draw': 'Five paper tokens in a circle with one highlighted token.',
  'testimonials-friends': 'Three speech bubbles and two exchanged gift boxes.',
  'faq-help': 'A question bubble pointing to an answer card.',
  'create-game-head': 'A paper form with a calendar, pen and small gift.',
  'join-game-head': 'A code ticket pointing to a door with warm light.',
  'quick-draw-head': 'Overlapping cards, a directional arrow and a ribbon.',
  'privacy-who-sees': 'Layered paper screens hiding a locked panel.',
  'gift-ideas': 'A moodboard with a book, scarf, jar and mitten.',
  'cta-celebration': 'Gift boxes drifting onto a table under a warm glow.',
  'quick-draw-success': 'Two ribbon-joined cards with a small gift and confetti.',
  'mode-online': 'A shared table with four place cards and a central gift.',
  'mode-quick': 'A stepping card stack, arrow and single token.',
  'mode-demo': 'A display pedestal with an open box and folded card.',
  'dashboard-empty': 'A quiet table with one closed gift box.',
  'step-create-game': 'A notebook page with a circled date and pen.',
  'step-invite-friends': 'Fanned envelopes along a dotted invitation path.',
  'step-draw-gifts': 'Envelopes in an arc tied by a ribbon around one token.',
  'access-empty': 'An empty hook rail with a neat stack of blank cards.',
  'activity-empty': 'A paper timeline with three empty markers.',
  'audience-remote': 'Mittens on a string above a shared table.',
  'chat-empty': 'Two staggered blank message bubbles.',
  'chat-waiting': 'A sealed envelope and mug waiting on a table.',
  'feature-anonymous-chat': 'Two paper bubbles around a small sealed envelope.',
  'invite-share': 'An invitation card with three outgoing arrows.',
  'profile-empty': 'A blank portrait frame with a folded mitten.',
  'recipient-waiting': 'A ribbon-tied envelope beside an hourglass.',
  'wishlist-empty': 'A clean sheet with three empty checkboxes and a pencil.',
  'guide-format': 'Three paper cards with clock, list and box cut-outs.',
  'guide-prep': 'An idea sheet with pencil, tags and cocoa.',
  'guide-room-team': 'A shared table with place cards and an invitation.',
  'guide-room-wishes': 'A lined sheet with pencil, star and notebook.',
  'guide-room-profile': 'A portrait frame with a folded mitten and ribbon.',
  'guide-room-draw': 'Envelopes in a circle with a closing arrow and gift.',
  'guide-room-gift': 'A wrapped box with a checkmark and empty speech bubble.',
};
