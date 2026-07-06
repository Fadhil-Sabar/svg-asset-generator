import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import type { DesignTokens } from './models'

// ──────────────────────────────────────────────
//  Template system
// ──────────────────────────────────────────────

const TEMPLATES_DIR = join(import.meta.dir, '..', '..', 'src', 'templates')

const FALLBACKS: Record<string, string> = {
  'icon': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="{{STROKE_COLOR}}" stroke-width="{{STROKE_WIDTH}}" stroke-linecap="{{STROKE_CAP}}" stroke-linejoin="{{STROKE_JOIN}}">
  <!-- ICON CONTENT -->
  {{CONTENT}}
</svg>`,
  'icon-solid': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="{{PRIMARY_COLOR}}">{{CONTENT}}</svg>`,
  'illustration': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" fill="none" stroke="{{STROKE_COLOR}}" stroke-width="{{STROKE_WIDTH}}">
  <rect width="400" height="300" fill="{{SURFACE_COLOR}}" rx="{{RADIUS_MD}}"/>
  <g transform="translate(20, 20)">{{CONTENT}}</g>
</svg>`,
  'badge': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32" fill="none">
  <rect width="120" height="32" rx="{{RADIUS_FULL}}" fill="{{PRIMARY_COLOR}}"/>
  <g transform="translate(8, 16)">{{CONTENT}}</g>
  <text x="36" y="20" font-family="{{FONT_FAMILY}}" font-size="12" font-weight="{{FONT_WEIGHT}}" fill="{{SURFACE_COLOR}}">{{BADGE_TEXT}}</text>
</svg>`,
  'card': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" fill="none">
  {{SHADOW_DEFS}}
  <rect width="320" height="180" rx="{{RADIUS_MD}}" fill="{{SURFACE_COLOR}}" {{SHADOW_ATTR}}/>
  <g transform="translate(16, 16)">{{CONTENT}}</g>
</svg>`,
  'chart-bar': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240" fill="none">
  <rect width="400" height="240" rx="{{RADIUS_MD}}" fill="{{SURFACE_COLOR}}"/>
  <g transform="translate(40, 20)">{{CONTENT}}</g>
</svg>`,
}

const ALIASES: Record<string, string> = {
  ic: 'icon',
  'ic-solid': 'icon-solid',
  ill: 'illustration',
  illust: 'illustration',
}

// ──────────────────────────────────────────────
//  Template Manager
// ──────────────────────────────────────────────

export class TemplateManager {
  private custom: Map<string, string> = new Map()

  list(): string[] {
    const names = new Set(Object.keys(FALLBACKS))
    // Try to read from FS
    try {
      const dir = join(import.meta.dir, '..', '..', 'templates')
      if (existsSync(dir)) {
        for (const f of readdirSync(dir)) {
          if (f.endsWith('.svg')) names.add(f.replace('.svg', ''))
        }
      }
    } catch { /* ignore */ }
    for (const k of this.custom.keys()) names.add(k)
    return [...names].sort()
  }

  get(name: string): string {
    const resolved = ALIASES[name] ?? name
    // Custom first
    const c = this.custom.get(resolved)
    if (c) return c
    // Fallback
    const f = FALLBACKS[resolved]
    if (f) return f
    throw new Error(`Unknown template: "${name}". Available: ${this.list().join(', ')}`)
  }

  register(name: string, svg: string): void {
    this.custom.set(name, svg)
  }

  render(name: string, tokens: DesignTokens, content = '<!-- CONTENT -->', extra: Record<string, string> = {}): string {
    const tpl = this.get(name)
    const vars = this.tokensToVars(tokens)
    // Merge extras
    for (const [k, v] of Object.entries(extra)) vars[k] = v
    vars['CONTENT'] = content
    // Replace all {{VARS}}
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
  }

  private tokensToVars(t: DesignTokens): Record<string, string> {
    return {
      PRIMARY_COLOR: t.colors.primary,
      SECONDARY_COLOR: t.colors.secondary,
      ACCENT_COLOR: t.colors.accent,
      SURFACE_COLOR: t.colors.surface,
      TEXT_COLOR: t.colors.text,
      MUTED_COLOR: t.colors.muted,
      STROKE_COLOR: t.colors.primary,
      STROKE_WIDTH: String(t.stroke.width),
      STROKE_CAP: t.stroke.cap,
      STROKE_JOIN: t.stroke.join,
      RADIUS_SM: String(t.radius.sm),
      RADIUS_MD: String(t.radius.md),
      RADIUS_LG: String(t.radius.lg),
      RADIUS_FULL: String(t.radius.full),
      FONT_FAMILY: t.typography.fontFamily,
      FONT_WEIGHT: t.typography.fontWeight,
      SPACING: String(t.spacing),
      SHADOW_DEFS: t.shadow.enabled
        ? `<filter id="ds"><feDropShadow dx="${t.shadow.offsetX}" dy="${t.shadow.offsetY}" stdDeviation="${t.shadow.blur}" flood-color="${t.shadow.color}"/></filter>`
        : '',
      SHADOW_ATTR: t.shadow.enabled ? 'filter="url(#ds)"' : '',
      BADGE_TEXT: 'LABEL',
    }
  }
}

function readdirSync(path: string): string[] {
  const { readdirSync: r } = require('fs')
  return r(path)
}

// Singleton
export const templateManager = new TemplateManager()
