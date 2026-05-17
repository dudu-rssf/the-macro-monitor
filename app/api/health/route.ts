import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export interface ServiceStatus {
  name:      string
  group:     string
  ok:        boolean
  latencyMs: number | null
  detail?:   string
}

async function check(name: string, group: string, fn: () => Promise<void>): Promise<ServiceStatus> {
  const t0 = Date.now()
  try {
    await fn()
    return { name, group, ok: true, latencyMs: Date.now() - t0 }
  } catch (e) {
    return { name, group, ok: false, latencyMs: Date.now() - t0, detail: String(e).slice(0, 120) }
  }
}

export async function GET() {
  const results = await Promise.all([

    // ── Banco de dados ─────────────────────────────────────────────────
    check('Supabase (DB)', 'Banco de Dados', async () => {
      await db.execute(sql`SELECT 1`)
    }),

    // ── APIs de dados ─────────────────────────────────────────────────
    check('BCB SGS API', 'APIs de Dados', async () => {
      const res = await fetch(
        'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json',
        { signal: AbortSignal.timeout(8_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    check('BCB Focus (Olinda)', 'APIs de Dados', async () => {
      const p = new URLSearchParams({
        '$format': 'json',
        '$top':    '1',
        '$select': 'Indicador,Data,Mediana',
        '$filter': "Indicador eq 'IPCA'",
      })
      const res = await fetch(
        `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?${p.toString()}`,
        { signal: AbortSignal.timeout(10_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    check('Groq API', 'APIs de IA', async () => {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurada')
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // ── Feeds RSS ──────────────────────────────────────────────────────
    check('Agência Brasil (RSS)', 'Feeds RSS', async () => {
      const res = await fetch(
        'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
        { method: 'HEAD', signal: AbortSignal.timeout(8_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    check('G1 Economia (RSS)', 'Feeds RSS', async () => {
      const res = await fetch(
        'https://g1.globo.com/rss/g1/economia/',
        { method: 'HEAD', signal: AbortSignal.timeout(8_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    check('InfoMoney (RSS)', 'Feeds RSS', async () => {
      const res = await fetch(
        'https://www.infomoney.com.br/feed/',
        { method: 'HEAD', signal: AbortSignal.timeout(8_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    check('Exame (RSS)', 'Feeds RSS', async () => {
      const res = await fetch(
        'https://exame.com/feed/',
        { method: 'HEAD', signal: AbortSignal.timeout(8_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    check('CNN Brasil (RSS)', 'Feeds RSS', async () => {
      const res = await fetch(
        'https://www.cnnbrasil.com.br/economia/feed/',
        { method: 'HEAD', signal: AbortSignal.timeout(8_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    check('Reuters Brasil (RSS)', 'Feeds RSS', async () => {
      const res = await fetch(
        'https://feeds.reuters.com/reuters/BRTopNews',
        { method: 'HEAD', signal: AbortSignal.timeout(8_000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // ── Infraestrutura ─────────────────────────────────────────────────
    check('GitHub API', 'Infraestrutura', async () => {
      const res = await fetch('https://api.github.com', {
        headers: { 'User-Agent': 'MacroMonitor/1.0' },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

  ])

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services:  results,
  })
}
