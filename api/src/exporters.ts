import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, basename, extname } from 'path'

// ──────────────────────────────────────────────
//  Exporters
// ──────────────────────────────────────────────

export type ExportFormat = 'svg-raw' | 'svg-optimized' | 'react' | 'react-tsx' | 'png'

function normalizeFormat(fmt: ExportFormat): ExportFormat {
  return fmt === 'react-tsx' ? 'react' : fmt
}

export class Exporter {
  constructor(private outputDir: string) {}

  export(svg: string, fmt: ExportFormat, filename: string): string {
    fmt = normalizeFormat(fmt)
    mkdirSync(this.outputDir, { recursive: true })
    const outPath = join(this.outputDir, this.outputName(filename, fmt))
    const content = this.convert(svg, fmt, filename)
    writeFileSync(outPath, content)
    return outPath
  }

  private outputName(filename: string, fmt: ExportFormat): string {
    const base = basename(filename, extname(filename))
    switch (fmt) {
      case 'svg-raw':    return `${base}.svg`
      case 'svg-optimized': return `${base}.min.svg`
      case 'react':      return `${this.toPascal(base)}.tsx`
      case 'png':        return `${base}.png`
    }
  }

  private convert(svg: string, fmt: ExportFormat, filename: string): string {
    switch (fmt) {
      case 'svg-raw': return this.raw(svg)
      case 'svg-optimized': return this.optimize(svg)
      case 'react': return this.toReact(svg, filename)
      case 'png': return svg // Will need cairosvg/rsvg — return raw for now
    }
  }

  private raw(svg: string): string {
    return svg.trim() + '\n'
  }

  private optimize(svg: string): string {
    return svg
      .replace(/<\?xml[^>]*\?>/g, '')
      .replace(/<!--(?!\[).*?-->/gs, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .trim()
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private toReact(svg: string, filename: string): string {
    const name = this.toPascal(basename(filename, extname(filename)))
    const size = this.extractSize(svg)
    const color = this.extractColor(svg)

    let jsx = svg
      .replace(/\bclass="/g, 'className="')
      .replace(/\bstroke-width/g, 'strokeWidth')
      .replace(/\bstroke-linecap/g, 'strokeLinecap')
      .replace(/\bstroke-linejoin/g, 'strokeLinejoin')
      .replace(/\bstroke-dasharray/g, 'strokeDasharray')
      .replace(/\bfill-opacity/g, 'fillOpacity')
      .replace(/\bstroke-opacity/g, 'strokeOpacity')
      .replace(/\bclip-path/g, 'clipPath')
      .replace(/\bclip-rule/g, 'clipRule')
      .replace(/\bstop-color/g, 'stopColor')
      .replace(/\bstop-opacity/g, 'stopOpacity')
      .replace(/<(\w+)([^>]*)><\/\1>/g, '<$1$2 />')

    // Inject size + color props
    jsx = jsx.replace('<svg', `<svg width={size} height={size}`)
    const escaped = this.escapeRegex(color)
    if (color) {
      jsx = jsx.replace(new RegExp(`stroke="${escaped}"`, 'g'), 'stroke={color}')
      jsx = jsx.replace(new RegExp(`fill="${escaped}"`, 'g'), 'fill={color}')
    }

    return `import React from 'react';\n\ninterface ${name}Props {\n  size?: number;\n  color?: string;\n  className?: string;\n}\n\nconst ${name}: React.FC<${name}Props> = ({ size = ${size}, color = '${color}', className = '' }) => (\n  ${jsx}\n);\n\nexport default ${name};\n`
  }

  private toPascal(s: string): string {
    return s.split(/[-_\s]+/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
  }

  private extractSize(svg: string): number {
    const m = svg.match(/viewBox="[^"]*?\s(\d+)"/) ?? svg.match(/width="(\d+)"/)
    return m ? parseInt(m[1]) : 24
  }

  private extractColor(svg: string): string {
    const m = svg.match(/stroke="#([0-9A-Fa-f]{3,8})"/) ?? svg.match(/fill="#([0-9A-Fa-f]{3,8})"/)
    return m ? `#${m[1]}` : '#000000'
  }
}
