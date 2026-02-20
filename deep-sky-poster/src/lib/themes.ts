export interface PosterTheme {
  id: string;
  name: string;
  label: string;           // UI display name
  bg1: string;             // gradient top
  bg2: string;             // gradient bottom
  nebulaGlow: string;      // background nebulosity behind hero
  heroGlow1: string;       // inner glow (RGBA)
  heroGlow2: string;       // outer glow (RGBA)
  borderColor: string;
  nameColor: string;
  coordsColor: string;
  titleColor: string;
  accentColor: string;     // divider lines
  labelColor: string;      // info section labels (dim)
  valueColor: string;      // info section values
  cardRingColor: string;   // card thumbnail ring
  footerColor: string;
  starColor1: string;      // most stars
  starColor2: string;      // blue-white accent stars
}

export const THEMES: PosterTheme[] = [
  {
    id: 'cosmos',
    name: 'Cosmos',
    label: '✦ Cosmos',
    bg1: '#05081C',
    bg2: '#020410',
    nebulaGlow: 'rgba(60,30,120,0.18)',
    heroGlow1: 'rgba(110,50,220,0.28)',
    heroGlow2: 'rgba(60,20,160,0.12)',
    borderColor: 'rgba(255,255,255,0.65)',
    nameColor: '#FFFFFF',
    coordsColor: '#D4C5A9',
    titleColor: '#F5C518',
    accentColor: 'rgba(245,197,24,0.65)',
    labelColor: 'rgba(255,255,255,0.42)',
    valueColor: 'rgba(255,255,255,0.88)',
    cardRingColor: 'rgba(255,255,255,0.22)',
    footerColor: 'rgba(255,255,255,0.16)',
    starColor1: 'rgba(255,255,255,{a})',
    starColor2: 'rgba(180,200,255,{a})',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    label: '◈ Aurora',
    bg1: '#010d10',
    bg2: '#000508',
    nebulaGlow: 'rgba(0,200,140,0.12)',
    heroGlow1: 'rgba(0,220,150,0.25)',
    heroGlow2: 'rgba(0,160,120,0.10)',
    borderColor: 'rgba(0,240,180,0.55)',
    nameColor: '#E0FFF8',
    coordsColor: '#80FFD0',
    titleColor: '#00FFBB',
    accentColor: 'rgba(0,255,190,0.60)',
    labelColor: 'rgba(0,240,180,0.42)',
    valueColor: 'rgba(224,255,248,0.88)',
    cardRingColor: 'rgba(0,240,180,0.25)',
    footerColor: 'rgba(0,255,190,0.18)',
    starColor1: 'rgba(200,255,240,{a})',
    starColor2: 'rgba(100,255,200,{a})',
  },
  {
    id: 'nebula-rose',
    name: 'Nebula Rose',
    label: '✿ Nebula Rose',
    bg1: '#120416',
    bg2: '#060108',
    nebulaGlow: 'rgba(200,50,150,0.12)',
    heroGlow1: 'rgba(220,60,160,0.28)',
    heroGlow2: 'rgba(160,30,120,0.12)',
    borderColor: 'rgba(255,140,200,0.55)',
    nameColor: '#FFF0F8',
    coordsColor: '#FFB0D8',
    titleColor: '#FF7EC0',
    accentColor: 'rgba(255,120,190,0.65)',
    labelColor: 'rgba(255,150,200,0.42)',
    valueColor: 'rgba(255,240,248,0.88)',
    cardRingColor: 'rgba(255,140,200,0.22)',
    footerColor: 'rgba(255,120,190,0.18)',
    starColor1: 'rgba(255,220,240,{a})',
    starColor2: 'rgba(255,160,210,{a})',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    label: '☀ Solar Flare',
    bg1: '#160600',
    bg2: '#080200',
    nebulaGlow: 'rgba(255,100,0,0.12)',
    heroGlow1: 'rgba(255,110,10,0.28)',
    heroGlow2: 'rgba(200,60,0,0.10)',
    borderColor: 'rgba(255,180,50,0.55)',
    nameColor: '#FFF8E8',
    coordsColor: '#FFCC80',
    titleColor: '#FF9020',
    accentColor: 'rgba(255,150,30,0.65)',
    labelColor: 'rgba(255,180,60,0.42)',
    valueColor: 'rgba(255,248,232,0.88)',
    cardRingColor: 'rgba(255,180,50,0.22)',
    footerColor: 'rgba(255,150,30,0.18)',
    starColor1: 'rgba(255,240,200,{a})',
    starColor2: 'rgba(255,200,100,{a})',
  },
  {
    id: 'starlight',
    name: 'Starlight',
    label: '◎ Starlight',
    bg1: '#000000',
    bg2: '#030303',
    nebulaGlow: 'rgba(200,200,255,0.06)',
    heroGlow1: 'rgba(220,220,255,0.18)',
    heroGlow2: 'rgba(180,180,255,0.07)',
    borderColor: 'rgba(255,255,255,0.80)',
    nameColor: '#FFFFFF',
    coordsColor: 'rgba(255,255,255,0.58)',
    titleColor: '#FFFFFF',
    accentColor: 'rgba(255,255,255,0.55)',
    labelColor: 'rgba(255,255,255,0.32)',
    valueColor: 'rgba(255,255,255,0.82)',
    cardRingColor: 'rgba(255,255,255,0.22)',
    footerColor: 'rgba(255,255,255,0.15)',
    starColor1: 'rgba(255,255,255,{a})',
    starColor2: 'rgba(230,240,255,{a})',
  },
];

export function getTheme(id: string): PosterTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Replace {a} placeholder with an actual opacity value. */
export function themeStarColor(template: string, alpha: number): string {
  return template.replace('{a}', alpha.toFixed(2));
}
