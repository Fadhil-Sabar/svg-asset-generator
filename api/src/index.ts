import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getPreset, listPresets, type DesignTokens } from './models'
import { templateManager } from './templates'
import { Validator } from './validator'
import { Exporter, type ExportFormat } from './exporters'

const app = new Hono()
const validator = new Validator()

// CORS
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true,
}))

// ─── Helper ────────────────────────────────────

function loadStyle(name: string): DesignTokens {
  try { return getPreset(name) } catch {}
  // Try saved styles from styles/ dir
  try {
    const { readFileSync, existsSync } = require('fs')
    const { join } = require('path')
    const p = join(import.meta.dir, '..', '..', 'styles', `${name}.json`)
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'))
  } catch {}
  throw new Error(`Style "${name}" not found. Available: ${listPresets().join(', ')}`)
}

// ─── Routes ─────────────────────────────────────

app.get('/api/health', (c) => c.json({ status: 'ok', engine: 'svg-asset-ts' }))

app.get('/api/styles', (c) => {
  const styles = listPresets().map(name => {
    const t = getPreset(name)
    return { name, description: t.description, type: 'preset', tokens: t }
  })
  return c.json({ success: true, styles })
})

app.get('/api/templates', (c) => {
  const templates = templateManager.list().map(name => ({
    name,
    chars: templateManager.get(name).length,
  }))
  return c.json({ success: true, templates })
})

app.get('/api/styles/:name', (c) => {
  try {
    const t = loadStyle(c.req.param('name'))
    return c.json({ success: true, style: t })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 404)
  }
})

app.post('/api/generate', async (c) => {
  try {
    const { style_name, template, description, count } = await c.req.json() as {
      style_name?: string
      template?: string
      description: string
      count?: number
    }

    if (!description?.trim()) {
      return c.json({ success: false, error: 'Description is required' }, 400)
    }

    const tokens = loadStyle(style_name || 'earth-tone')
    const tmpl = template || 'icon'
    const n = Math.max(1, Math.min(5, count || 1))

    const results = []
    for (let i = 0; i < n; i++) {
      const svg = templateManager.render(tmpl, tokens)
      const [valid, errors] = validator.check(svg, tokens)
      results.push({
        svg,
        name: `${description.toLowerCase().replace(/\s+/g, '-')}-${i + 1}.svg`,
        style: tokens.name,
        template: tmpl,
        valid,
        validation_errors: valid ? [] : errors,
      })
    }

    return c.json({ success: true, results, style_tokens: tokens })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.post('/api/export', async (c) => {
  try {
    const { svg, format, filename } = await c.req.json() as {
      svg: string
      format?: ExportFormat
      filename?: string
    }

    if (!svg) return c.json({ success: false, error: 'SVG content is required' }, 400)

    const exporter = new Exporter('/tmp/svg-export')
    const out = exporter.export(svg, format || 'svg-raw', filename || 'export.svg')
    const { readFileSync } = require('fs')
    const content = readFileSync(out, 'utf-8')

    return c.json({ success: true, content, path: out, format: format || 'svg-raw' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Start
const port = parseInt(process.env.PORT || '3001')
console.log(`🚀 SVG Asset API (TS) running on http://0.0.0.0:${port}`)

export default {
  port,
  fetch: app.fetch,
}
