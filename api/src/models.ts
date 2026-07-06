// ──────────────────────────────────────────────
//  Design Token Types
// ──────────────────────────────────────────────

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  surface: string
  text: string
  muted: string
}

export interface StrokeConfig {
  width: number
  cap: 'butt' | 'round' | 'square'
  join: 'miter' | 'round' | 'bevel'
  dasharray?: string
}

export interface RadiusConfig {
  sm: number
  md: number
  lg: number
  full: number
}

export interface ShadowConfig {
  enabled: boolean
  offsetX: number
  offsetY: number
  blur: number
  color: string
}

export type EffectType = 'warm-glow' | 'cool-glow' | 'gradient' | 'flat' | 'outline' | 'glass'

export interface EffectsConfig {
  effects: EffectType[]
  gradientStops?: [string, number][]
}

export interface TypographyConfig {
  fontFamily: string
  fontWeight: 'light' | 'regular' | 'medium' | 'bold'
  baseSize: number
}

export interface DesignTokens {
  name: string
  description: string
  colors: ColorPalette
  stroke: StrokeConfig
  radius: RadiusConfig
  shadow: ShadowConfig
  effects: EffectsConfig
  typography: TypographyConfig
  spacing: number
}

// ──────────────────────────────────────────────
//  Defaults
// ──────────────────────────────────────────────

export const defaultStroke = (overrides?: Partial<StrokeConfig>): StrokeConfig => ({
  width: 2,
  cap: 'round',
  join: 'round',
  ...overrides,
})

export const defaultRadius = (overrides?: Partial<RadiusConfig>): RadiusConfig => ({
  sm: 4,
  md: 8,
  lg: 16,
  full: 999,
  ...overrides,
})

export const defaultShadow = (overrides?: Partial<ShadowConfig>): ShadowConfig => ({
  enabled: false,
  offsetX: 0,
  offsetY: 2,
  blur: 4,
  color: '#00000040',
  ...overrides,
})

export const defaultEffects = (effects: EffectType[] = ['flat']): EffectsConfig => ({
  effects,
})

export const defaultTypography = (overrides?: Partial<TypographyConfig>): TypographyConfig => ({
  fontFamily: 'system-ui',
  fontWeight: 'medium',
  baseSize: 14,
  ...overrides,
})

export function createTokens(overrides: Partial<DesignTokens> & { colors: ColorPalette }): DesignTokens {
  return {
    name: 'untitled',
    description: '',
    stroke: defaultStroke(),
    radius: defaultRadius(),
    shadow: defaultShadow(),
    effects: defaultEffects(),
    typography: defaultTypography(),
    spacing: 4,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
//  Presets
// ──────────────────────────────────────────────

export const PRESETS: Record<string, DesignTokens> = {
  'minimal': createTokens({
    name: 'minimal',
    description: 'Clean black-and-white minimal style. Sharp strokes, simple.',
    colors: { primary: '#000000', secondary: '#333333', accent: '#666666', surface: '#FFFFFF', text: '#000000', muted: '#999999' },
    stroke: defaultStroke({ width: 1.5, cap: 'butt', join: 'miter' }),
    effects: defaultEffects(['flat']),
  }),

  'earth-tone': createTokens({
    name: 'earth-tone',
    description: 'Warm earthy palette with rounded friendly shapes.',
    colors: { primary: '#8B7355', secondary: '#C4A882', accent: '#D2691E', surface: '#F5F0E8', text: '#4A3728', muted: '#A89880' },
    stroke: defaultStroke({ width: 2 }),
    radius: defaultRadius({ sm: 4, md: 8, lg: 16 }),
    effects: defaultEffects(['warm-glow']),
  }),

  'corporate-blue': createTokens({
    name: 'corporate-blue',
    description: 'Professional blue gradient style with subtle shadows.',
    colors: { primary: '#2563EB', secondary: '#3B82F6', accent: '#F59E0B', surface: '#F8FAFC', text: '#1E293B', muted: '#94A3B8' },
    stroke: defaultStroke({ width: 1.5 }),
    radius: defaultRadius({ sm: 2, md: 4, lg: 8 }),
    shadow: defaultShadow({ enabled: true, blur: 4, color: '#00000020' }),
    effects: defaultEffects(['gradient']),
  }),

  'retro-8bit': createTokens({
    name: 'retro-8bit',
    description: 'Limited 8-color pixel-art palette. Blocky, no curves, no shadows.',
    colors: { primary: '#E01010', secondary: '#FFD700', accent: '#00AA00', surface: '#000000', text: '#FFFFFF', muted: '#888888' },
    stroke: defaultStroke({ width: 2, cap: 'square', join: 'miter' }),
    radius: defaultRadius({ sm: 0, md: 0, lg: 0, full: 0 }),
    effects: defaultEffects(['flat']),
  }),

  'ocean': createTokens({
    name: 'ocean',
    description: 'Cool oceanic blues with a smooth, flowing feel.',
    colors: { primary: '#0077B6', secondary: '#00B4D8', accent: '#90E0EF', surface: '#CAF0F8', text: '#03045E', muted: '#48CAE4' },
    stroke: defaultStroke({ width: 1.5 }),
    radius: defaultRadius({ sm: 4, md: 8, lg: 16 }),
    shadow: defaultShadow({ enabled: true, offsetY: 1, blur: 3, color: '#0077B620' }),
    effects: defaultEffects(['cool-glow']),
  }),

  'sunset': createTokens({
    name: 'sunset',
    description: 'Warm sunset gradient with orange, pink, and purple tones.',
    colors: { primary: '#FF6B35', secondary: '#F7C59F', accent: '#EFEFD0', surface: '#1A1A2E', text: '#FFFFFF', muted: '#4A4E69' },
    stroke: defaultStroke({ width: 2 }),
    radius: defaultRadius({ sm: 6, md: 12, lg: 20 }),
    effects: defaultEffects(['warm-glow', 'gradient']),
  }),

  'forest': createTokens({
    name: 'forest',
    description: 'Deep natural greens, earthy and grounded.',
    colors: { primary: '#2D6A4F', secondary: '#40916C', accent: '#95D5B2', surface: '#F0FFF0', text: '#1B4332', muted: '#52B788' },
    stroke: defaultStroke({ width: 2 }),
    radius: defaultRadius({ sm: 2, md: 6, lg: 12 }),
    effects: defaultEffects(['flat']),
  }),

  'nord': createTokens({
    name: 'nord',
    description: 'Nord theme — arctic, bluish, clean. Inspired by nordtheme.com.',
    colors: { primary: '#5E81AC', secondary: '#81A1C1', accent: '#88C0D0', surface: '#ECEFF4', text: '#2E3440', muted: '#D8DEE9' },
    stroke: defaultStroke({ width: 1.5 }),
    radius: defaultRadius({ sm: 2, md: 4, lg: 8 }),
    effects: defaultEffects(['flat']),
  }),

  'tokyo-night': createTokens({
    name: 'tokyo-night',
    description: 'Tokyo Night — dark, vibrant neon on deep navy.',
    colors: { primary: '#7AA2F7', secondary: '#BB9AF7', accent: '#F7768E', surface: '#1A1B26', text: '#A9B1D6', muted: '#565F89' },
    stroke: defaultStroke({ width: 1.5 }),
    radius: defaultRadius({ sm: 2, md: 4, lg: 8 }),
    shadow: defaultShadow({ enabled: true, offsetY: 2, blur: 6, color: '#00000040' }),
    effects: defaultEffects(['cool-glow']),
  }),
}

export function listPresets(): string[] {
  return Object.keys(PRESETS)
}

export function getPreset(name: string): DesignTokens {
  const t = PRESETS[name]
  if (!t) throw new Error(`Unknown preset: ${name}. Available: ${listPresets().join(', ')}`)
  return structuredClone(t)
}
