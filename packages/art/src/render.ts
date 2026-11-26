import { getScene } from './scenes.ts';
import type { SceneId, SceneDescriptor, ThemeName } from './scenes.ts';
import { PALETTES } from './palettes.ts';
import type { Palette } from './palettes.ts';

type Motif =
  | 'gift'
  | 'envelope'
  | 'hearts'
  | 'hands'
  | 'chat'
  | 'checklist'
  | 'question'
  | 'lock'
  | 'star'
  | 'calendar'
  | 'crown';

/** One quiet symbol per scene: the picture reads in a second, without lettering. */
const MOTIFS: Record<SceneId, Motif> = {
  'social-cover': 'gift',
  'hero-winter-scene': 'gift',
  'rules-fair-draw': 'checklist',
  'testimonials-friends': 'hearts',
  'faq-help': 'question',
  'create-game-head': 'calendar',
  'join-game-head': 'envelope',
  'quick-draw-head': 'star',
  'privacy-who-sees': 'lock',
  'gift-ideas': 'gift',
  'cta-celebration': 'gift',
  'quick-draw-success': 'crown',
  'mode-online': 'hands',
  'mode-quick': 'envelope',
  'mode-demo': 'gift',
  'dashboard-empty': 'gift',
  'step-create-game': 'calendar',
  'step-invite-friends': 'envelope',
  'step-draw-gifts': 'checklist',
  'access-empty': 'lock',
  'activity-empty': 'checklist',
  'audience-remote': 'hands',
  'chat-empty': 'chat',
  'chat-waiting': 'chat',
  'feature-anonymous-chat': 'chat',
  'invite-share': 'envelope',
  'profile-empty': 'hands',
  'recipient-waiting': 'envelope',
  'wishlist-empty': 'checklist',
  'guide-format': 'calendar',
  'guide-prep': 'gift',
  'guide-room-team': 'hands',
  'guide-room-wishes': 'star',
  'guide-room-profile': 'lock',
  'guide-room-draw': 'envelope',
  'guide-room-gift': 'gift',
};

function n(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function opacity(value: number): string {
  return value.toFixed(2);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** FNV-1a + mulberry32: the same scene always produces the same snowfall. */
function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function renderMotif(motif: Motif, p: Palette): string[] {
  switch (motif) {
    case 'gift':
      return [
        `<rect x="-46" y="-10" width="92" height="60" rx="5" fill="${p.snow}"/>`,
        `<rect x="-46" y="-10" width="92" height="15" rx="4" fill="${p.accent}" opacity="0.92"/>`,
        `<rect x="-8" y="4" width="16" height="46" fill="${p.accent2}" opacity="0.85"/>`,
        `<path d="M0 -10 C-34 -18 -36 -49 -16 -44 C-6 -42 -2 -26 0 -10 C2 -26 6 -42 16 -44 C36 -49 34 -18 0 -10 Z" fill="${p.accent}"/>`,
        `<circle cx="0" cy="-10" r="6" fill="${p.accent2}"/>`,
      ];
    case 'envelope':
      return [
        `<rect x="-52" y="-32" width="104" height="64" rx="6" fill="${p.snow}"/>`,
        `<path d="M-52 -32 L0 7 L52 -32 Z" fill="${p.hillFar}" opacity="0.42"/>`,
        `<path d="M-52 32 L-14 -2 M52 32 L14 -2" fill="none" stroke="${p.ink}" stroke-width="2" opacity="0.26"/>`,
        `<circle cx="0" cy="3" r="8" fill="${p.accent}"/>`,
      ];
    case 'hearts': {
      const heart = 'M0 22 C-34 2 -30 -24 -12 -24 C-4 -24 0 -16 0 -10 C0 -16 4 -24 12 -24 C30 -24 34 2 0 22 Z';
      return [
        `<path d="${heart}" transform="translate(-22 -10) scale(0.62)" fill="${p.accent}"/>`,
        `<path d="${heart}" transform="translate(20 -4) scale(0.72)" fill="${p.accent2}" opacity="0.94"/>`,
        `<path d="M-26 26 C-8 16 10 32 28 18" fill="none" stroke="${p.snow}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>`,
      ];
    }
    case 'hands':
      return [
        `<path d="M-40 10 C-40 -12 -26 -24 -12 -22 C-2 -20 2 -10 -4 -2 L-14 8 L-6 16 C-2 20 -4 28 -12 30 C-26 34 -40 26 -40 10 Z" fill="${p.snow}"/>`,
        `<path d="M40 10 C40 -12 26 -24 12 -22 C2 -20 -2 -10 4 -2 L14 8 L6 16 C2 20 4 28 12 30 C26 34 40 26 40 10 Z" fill="${p.accent2}" opacity="0.9"/>`,
        `<path d="M-7 -5 C-2 -13 2 -13 7 -5" fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>`,
      ];
    case 'chat':
      return [
        `<rect x="-50" y="-32" width="84" height="52" rx="13" fill="${p.snow}"/>`,
        `<path d="M-34 18 L-36 34 L-14 20 Z" fill="${p.snow}"/>`,
        `<rect x="-4" y="-12" width="58" height="44" rx="12" fill="${p.snow}"/>`,
        `<path d="M42 30 L50 42 L26 32 Z" fill="${p.snow}"/>`,
        `<circle cx="-26" cy="-6" r="4" fill="${p.accent}"/>`,
        `<circle cx="-12" cy="-6" r="4" fill="${p.accent2}"/>`,
        `<circle cx="24" cy="10" r="4" fill="${p.accent}"/>`,
      ];
    case 'checklist':
      return [
        `<rect x="-40" y="-46" width="80" height="94" rx="6" fill="${p.snow}"/>`,
        `<rect x="-29" y="-29" width="13" height="13" rx="2" fill="none" stroke="${p.accent}" stroke-width="3"/>`,
        `<path d="M-26 -23 L-23 -20 L-17 -28" fill="none" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>`,
        `<line x1="-8" y1="-23" x2="26" y2="-23" stroke="${p.ink}" stroke-width="2" opacity="0.34"/>`,
        `<rect x="-29" y="-6" width="13" height="13" rx="2" fill="none" stroke="${p.ink}" stroke-width="2" opacity="0.45"/>`,
        `<line x1="-8" y1="0" x2="26" y2="0" stroke="${p.ink}" stroke-width="2" opacity="0.34"/>`,
        `<rect x="-29" y="17" width="13" height="13" rx="2" fill="none" stroke="${p.ink}" stroke-width="2" opacity="0.45"/>`,
        `<line x1="-8" y1="23" x2="20" y2="23" stroke="${p.ink}" stroke-width="2" opacity="0.34"/>`,
      ];
    case 'question':
      return [
        `<path d="M-24 -22 C-24 -48 16 -52 16 -24 C16 -10 -2 -6 -2 8" fill="none" stroke="${p.snow}" stroke-width="12" stroke-linecap="round"/>`,
        `<circle cx="-2" cy="28" r="8" fill="${p.accent}"/>`,
        `<circle cx="36" cy="-30" r="5" fill="${p.accent2}" opacity="0.7"/>`,
      ];
    case 'lock':
      return [
        `<path d="M-22 -6 V-24 C-22 -42 22 -42 22 -24 V-6" fill="none" stroke="${p.snow}" stroke-width="10"/>`,
        `<rect x="-38" y="-6" width="76" height="58" rx="9" fill="${p.snow}"/>`,
        `<circle cx="0" cy="18" r="7" fill="${p.accent}"/>`,
        `<path d="M0 24 V35" fill="none" stroke="${p.accent}" stroke-width="5" stroke-linecap="round"/>`,
      ];
    case 'star':
      return [
        `<polygon points="0,-48 12,-16 46,-16 18,4 28,38 0,18 -28,38 -18,4 -46,-16 -12,-16" fill="${p.accent}"/>`,
        `<circle cx="40" cy="-34" r="5" fill="${p.accent2}"/>`,
        `<circle cx="-38" cy="34" r="4" fill="${p.accent2}" opacity="0.75"/>`,
      ];
    case 'calendar':
      return [
        `<rect x="-46" y="-38" width="92" height="84" rx="8" fill="${p.snow}"/>`,
        `<path d="M-46 -30 A8 8 0 0 1 -38 -38 H38 A8 8 0 0 1 46 -30 V-16 H-46 Z" fill="${p.accent}"/>`,
        `<line x1="-28" y1="-48" x2="-28" y2="-29" stroke="${p.snow}" stroke-width="5" stroke-linecap="round"/>`,
        `<line x1="28" y1="-48" x2="28" y2="-29" stroke="${p.snow}" stroke-width="5" stroke-linecap="round"/>`,
        `<rect x="-9" y="0" width="18" height="20" rx="3" fill="none" stroke="${p.accent2}" stroke-width="3"/>`,
        `<circle cx="-28" cy="9" r="4" fill="${p.hillFar}"/>`,
        `<circle cx="28" cy="9" r="4" fill="${p.hillFar}"/>`,
        `<circle cx="-28" cy="29" r="4" fill="${p.hillFar}"/>`,
        `<circle cx="28" cy="29" r="4" fill="${p.hillFar}"/>`,
      ];
    case 'crown':
      return [
        `<path d="M-48 20 L-40 -30 L-18 -8 L0 -38 L18 -8 L40 -30 L48 20 Z" fill="${p.accent2}"/>`,
        `<rect x="-48" y="18" width="96" height="15" rx="4" fill="${p.accent}"/>`,
        `<circle cx="-40" cy="-32" r="5" fill="${p.glow}"/>`,
        `<circle cx="0" cy="-40" r="5" fill="${p.glow}"/>`,
        `<circle cx="40" cy="-32" r="5" fill="${p.glow}"/>`,
      ];
  }
}

function renderDefs(uid: string, p: Palette): string[] {
  return [
    '<defs>',
    `<linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${p.sky}"/>`,
    `<stop offset="1" stop-color="${p.sky2}"/>`,
    '</linearGradient>',
    `<linearGradient id="${uid}-ground" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${p.snow}"/>`,
    `<stop offset="1" stop-color="${p.snow}" stop-opacity="0.76"/>`,
    '</linearGradient>',
    `<radialGradient id="${uid}-glow">`,
    `<stop offset="0" stop-color="${p.glow}" stop-opacity="0.85"/>`,
    `<stop offset="1" stop-color="${p.glow}" stop-opacity="0"/>`,
    '</radialGradient>',
    '</defs>',
  ];
}

/** Layered paper hills, pines and drifting dots — all from the seeded PRNG. */
function renderLandscape(
  scene: SceneDescriptor,
  p: Palette,
  uid: string,
  theme: ThemeName,
  random: () => number,
): { elements: string[]; farY: number } {
  const { width: w, height: h } = scene;
  const elements: string[] = [];
  const farY = h * (0.55 + random() * 0.03);
  const nearY = h * (0.71 + random() * 0.02);

  const farCurve = `M0 ${n(farY)} C${n(w * 0.18)} ${n(farY - h * 0.07)}, ${n(w * 0.34)} ${n(farY + h * 0.09)}, ${n(w * 0.54)} ${n(farY + h * 0.01)} S${n(w * 0.82)} ${n(farY - h * 0.08)}, ${w} ${n(farY + h * 0.04)}`;
  const nearCurve = `M0 ${n(nearY)} C${n(w * 0.22)} ${n(nearY - h * 0.06)}, ${n(w * 0.38)} ${n(nearY + h * 0.05)}, ${n(w * 0.58)} ${n(nearY - h * 0.01)} S${n(w * 0.84)} ${n(nearY - h * 0.06)}, ${w} ${n(nearY + h * 0.02)}`;

  elements.push(`<path d="${farCurve} L${w} ${h} L0 ${h} Z" fill="${p.hillFar}"/>`);
  elements.push(`<path d="${nearCurve} L${w} ${h} L0 ${h} Z" fill="url(#${uid}-ground)"/>`);
  elements.push(`<path d="${nearCurve}" fill="none" stroke="${p.snow}" stroke-width="${n(h * 0.012)}" opacity="0.5"/>`);

  const dotCount = scene.category === 'guide' ? 14 : 18;
  for (let i = 0; i < dotCount; i += 1) {
    const x = random() * w;
    const y = random() * h * 0.76;
    const radius = (1.2 + random() * 2.6) * (h / 700);
    elements.push(
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius)}" fill="${p.snow}" opacity="${opacity(0.32 + random() * 0.5)}"/>`,
    );
  }

  const treeColor = theme === 'midnight' ? p.hillNear : p.ink;
  const treeCount = scene.category === 'guide' ? 3 : 4;
  const spots = [
    { x: w * 0.08, y: farY + h * 0.03 },
    { x: w * 0.21, y: farY + h * 0.1 },
    { x: w * 0.87, y: farY + h * 0.02 },
    { x: w * 0.96, y: farY + h * 0.1 },
  ];
  for (let i = 0; i < treeCount; i += 1) {
    const { x, y } = spots[i];
    const tw = w * (0.014 + random() * 0.008);
    const th = h * (0.05 + random() * 0.015);
    elements.push(`<rect x="${n(x - 2)}" y="${n(y + th * 1.7)}" width="4" height="${n(th * 0.5)}" fill="${treeColor}"/>`);
    elements.push(
      `<path d="M${n(x)} ${n(y)} L${n(x - tw)} ${n(y + th)} L${n(x - tw * 0.45)} ${n(y + th)} L${n(x - tw * 1.2)} ${n(y + th * 1.75)} L${n(x + tw * 1.2)} ${n(y + th * 1.75)} L${n(x + tw * 0.45)} ${n(y + th)} L${n(x + tw)} ${n(y + th)} Z" fill="${treeColor}" opacity="0.9"/>`,
    );
  }

  return { elements, farY };
}

export function renderSceneSvg(id: SceneId, theme: ThemeName): string {
  const scene = getScene(id);
  const p = PALETTES[theme];
  const random = makeRandom(seedFrom(`${id}|${theme}`));
  const { width: w, height: h } = scene;
  const uid = `art-${id}-${theme}`;
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${titleId} ${descId}">`,
    `<title id="${titleId}">${escapeXml(scene.titleRu)}</title>`,
    `<desc id="${descId}">${escapeXml(scene.titleEn)}. Matte paper cut-out winter illustration.</desc>`,
    ...renderDefs(uid, p),
    `<rect width="${w}" height="${h}" fill="url(#${uid}-sky)"/>`,
  ];

  const glowX = w * (0.7 + random() * 0.08);
  const glowY = h * (0.2 + random() * 0.06);
  const glowR = h * (0.2 + random() * 0.04);
  parts.push(`<circle cx="${n(glowX)}" cy="${n(glowY)}" r="${n(glowR * 2.2)}" fill="url(#${uid}-glow)"/>`);
  parts.push(`<circle cx="${n(glowX)}" cy="${n(glowY)}" r="${n(glowR * 0.38)}" fill="${p.glow}" opacity="${theme === 'midnight' ? '0.9' : '0.6'}"/>`);

  const landscape = renderLandscape(scene, p, uid, theme, random);
  parts.push(...landscape.elements);

  const isGuide = scene.category === 'guide';
  const anchorX = w * (isGuide ? 0.56 : scene.category === 'state' ? 0.63 : 0.68);
  const anchorY = h * (isGuide ? 0.6 : scene.category === 'state' ? 0.6 : 0.63);
  const scale = Math.min(w * (isGuide ? 0.19 : 0.17), h * 0.3) * (0.96 + random() * 0.08);

  parts.push(
    `<ellipse cx="${n(anchorX)}" cy="${n(anchorY + scale * 0.52)}" rx="${n(scale * 0.55)}" ry="${n(scale * 0.1)}" fill="${p.ink}" opacity="0.12"/>`,
  );

  for (let i = 0; i < 3; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = scale * (0.75 + random() * 0.3);
    parts.push(
      `<circle cx="${n(anchorX + Math.cos(angle) * radius)}" cy="${n(anchorY + Math.sin(angle) * radius * 0.7)}" r="${n(scale * (0.018 + random() * 0.018))}" fill="${i === 1 ? p.accent2 : p.accent}" opacity="0.65"/>`,
    );
  }

  parts.push(`<g transform="translate(${n(anchorX)} ${n(anchorY)}) scale(${n(scale / 100)})">`);
  parts.push(...renderMotif(MOTIFS[id], p));
  parts.push('</g>');
  parts.push('</svg>');
  return parts.join('\n');
}
