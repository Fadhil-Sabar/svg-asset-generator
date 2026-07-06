import type { DesignTokens } from './models'

// ──────────────────────────────────────────────
//  Validation Report
// ──────────────────────────────────────────────

export interface ValidationReport {
  passed: boolean
  errors: string[]
  warnings: string[]
  styleScore: number
  styleFeedback: string
}

const SVG_KEYWORDS = new Set(['none', 'currentColor', 'inherit', 'initial', 'transparent'])

// ──────────────────────────────────────────────
//  Validator
// ──────────────────────────────────────────────

export class Validator {
  check(svg: string, tokens: DesignTokens): [boolean, string[]] {
    const r = this.checkFull(svg, tokens)
    return [r.passed, r.errors]
  }

  checkFull(svg: string, tokens: DesignTokens, strict = true): ValidationReport {
    const report: ValidationReport = {
      passed: true,
      errors: [],
      warnings: [],
      styleScore: 1,
      styleFeedback: '',
    }

    if (!svg || !svg.trim()) {
      report.passed = false
      report.errors.push('Empty SVG content')
      return report
    }

    this.checkStructure(svg, report)
    this.checkColors(svg, tokens, report)
    this.checkStroke(svg, tokens, report)
    this.checkRadius(svg, tokens, report)
    this.checkShadow(svg, tokens, report)

    if (strict && report.warnings.length > 0) {
      report.errors.push(...report.warnings)
      report.warnings = []
    }

    report.passed = report.errors.length === 0
    return report
  }

  private checkStructure(svg: string, r: ValidationReport): void {
    const s = svg.trim()
    if (!s.startsWith('<svg')) {
      r.errors.push('Content does not start with <svg> tag')
      return
    }
    if (!(s.endsWith('</svg>') || s.endsWith('/>'))) {
      r.errors.push('SVG is not properly closed')
    }
    if (!s.includes('viewBox')) {
      r.warnings.push('SVG is missing viewBox attribute')
    }
    if (!s.includes('xmlns="http://www.w3.org/2000/svg"')) {
      r.warnings.push('SVG is missing xmlns attribute')
    }
  }

  private checkColors(svg: string, tokens: DesignTokens, r: ValidationReport): void {
    const palette = Object.values(tokens.colors).map(c => c.toUpperCase())
    const hexRegex = /#(?:[0-9A-Fa-f]{3,8})\b/g
    const found = new Set(svg.match(hexRegex) ?? [])

    for (const color of found) {
      const cu = color.toUpperCase()
      const expanded = cu.length === 4 ? '#' + cu[1].repeat(2) + cu[2].repeat(2) + cu[3].repeat(2) : cu
      const inPalette = palette.some(p => expanded === p || expanded.startsWith(p.slice(0, 5)))
      if (!inPalette && !SVG_KEYWORDS.has(color.toLowerCase()) && !['#000000', '#FFFFFF', '#000', '#FFF'].includes(cu)) {
        r.errors.push(`Color ${color} is not in the palette (allowed: ${palette.join(', ')})`)
      }
    }
  }

  private checkStroke(svg: string, tokens: DesignTokens, r: ValidationReport): void {
    const ew = tokens.stroke.width
    const ec = tokens.stroke.cap
    const ej = tokens.stroke.join

    const widths = svg.match(/stroke-width="([^"]+)"/g) ?? []
    for (const w of widths) {
      const val = parseFloat(w.match(/"([^"]+)"/)![1])
      if (!isNaN(val) && Math.abs(val - ew) > 0.1) {
        r.warnings.push(`Stroke width ${val} differs from expected ${ew}`)
      }
    }

    const caps = svg.match(/stroke-linecap="([^"]+)"/g) ?? []
    for (const c of caps) {
      const val = c.match(/"([^"]+)"/)![1]
      if (val !== ec) r.warnings.push(`Stroke linecap "${val}" differs from expected "${ec}"`)
    }

    const joins = svg.match(/stroke-linejoin="([^"]+)"/g) ?? []
    for (const j of joins) {
      const val = j.match(/"([^"]+)"/)![1]
      if (val !== ej) r.warnings.push(`Stroke linejoin "${val}" differs from expected "${ej}"`)
    }
  }

  private checkRadius(svg: string, tokens: DesignTokens, r: ValidationReport): void {
    const allowed = new Set([tokens.radius.sm, tokens.radius.md, tokens.radius.lg, tokens.radius.full])
    const radii = svg.match(/(?:rx|ry|border-radius)="([^"]+)"/g) ?? []
    for (const rx of radii) {
      const val = parseFloat(rx.match(/"([^"]+)"/)![1].replace('px', ''))
      if (!isNaN(val) && val > 0 && ![...allowed].some(a => Math.abs(val - a) < 0.5)) {
        r.warnings.push(`Radius ${val} doesn't match any preset (sm=${tokens.radius.sm}, md=${tokens.radius.md}, lg=${tokens.radius.lg})`)
      }
    }
  }

  private checkShadow(svg: string, tokens: DesignTokens, r: ValidationReport): void {
    const hasShadow = /<filter|<feDropShadow|<feGaussianBlur/i.test(svg)
    if (tokens.shadow.enabled && !hasShadow) {
      // Template-based SVGs don't include filter elements by design — just note it
      r.styleFeedback += 'Style has shadow enabled but template lacks filter elements. '
    }
    if (!tokens.shadow.enabled && hasShadow) {
      r.styleFeedback += 'Style has shadow disabled but SVG contains shadow/filter elements. '
    }
  }
}
