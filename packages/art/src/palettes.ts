import type { ThemeName } from './scenes.ts';

export interface Palette {
  sky: string;
  sky2: string;
  hillFar: string;
  hillNear: string;
  snow: string;
  accent: string;
  accent2: string;
  ink: string;
  glow: string;
}

/**
 * Muted, print-friendly palettes. Every accent keeps enough contrast against
 * snow and sky to stay legible at thumbnail size.
 */
export const PALETTES: Record<ThemeName, Palette> = {
  winter: {
    sky: '#EAF5FF',
    sky2: '#A3CEFD',
    hillFar: '#BFD8EA',
    hillNear: '#7FA7C2',
    snow: '#F8FCFF',
    accent: '#E9675F',
    accent2: '#DFA93E',
    ink: '#183B70',
    glow: '#FFF2D2',
  },
  midnight: {
    sky: '#0C1D3B',
    sky2: '#1B4968',
    hillFar: '#275070',
    hillNear: '#12304F',
    snow: '#E7F1F4',
    accent: '#E7C37B',
    accent2: '#63BFAE',
    ink: '#F2F7F7',
    glow: '#F1D69F',
  },
  cozy: {
    sky: '#F8E9D5',
    sky2: '#EBCAA6',
    hillFar: '#D8B49B',
    hillNear: '#A97961',
    snow: '#FFF8EF',
    accent: '#BE5F42',
    accent2: '#D6A03F',
    ink: '#5B382B',
    glow: '#FFE1A8',
  },
};
