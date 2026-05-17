/**
 * Refresh incremental de todas as séries BCB SGS ativas.
 * Busca os últimos DAYS_BACK dias para cada série e faz upsert no banco.
 *
 * Uso local:  npx tsx --env-file=.env.local scripts/refresh-bcb.ts
 * Uso CI:     DATABASE_URL=... npx tsx scripts/refresh-bcb.ts
 */

import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData, jobRuns } from '../db/schema'
import { eq, and } from 'drizzle-orm'

const DAYS_BACK    = 90   // janela de busca (cobre séries mensais com 2-3 meses de atraso)
const BATCH_SIZE   = 200  // linhas por insert (limite seguro com Supabase PgBouncer)
const PAUSE_MS     = 300  // pausa entre chamadas BCB para evitar rate-limit
const TIMEOUT_MS   = 15_000

function fmtBcb(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

async function fetchBCB(code: string, from: Date, to: Date): Promise<{ data: string; valor: string }[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${fmtBcb(from)}&dataFinal=${fmtBcb(to)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json: unknown = await res.json()
  if (!Array.isArray(json)) throw new Error('resposta inesperada da BCB')
  return json as { data: string; valor: string }[]
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function main() {
  const startedAt = new Date()
  const from = new Date(Date.now() - DAYS_BACK * 86_400_000)
  const to   = new Date()

  console.log(`\n=== Refresh BCB SGS — ${to.toISOString().slice(0, 10)} ===`)
  console.log(`Janela: ${fmtBcb(from)} → ${fmtBcb(to)}\n`)

  const series = await db
    .select({ id: macroSeriesMeta.id, code: macroSeriesMeta.sourceCode, name: macroSeriesMeta.name })
    .from(macroSeriesMeta)
    .where(and(eq(macroSeriesMeta.source, 'BCB_SGS'), eq(macroSeriesMeta.active, true)))

  console.log(`Séries ativas: ${series.length}\n`)

  let totalNew  = 0
  let totalFail = 0

  for (const s of series) {
    const label = `${s.code} [${s.name.slice(0, 45)}]`
    process.stdout.write(`  ${label}… `)

    try {
      const raw = await fetchBCB(s.code, from, to)

      const rows = raw
        .filter((r) => r.valor !== '' && r.valor != null)
        .map((r) => {
          const [d, m, y] = r.data.split('/')
          return { seriesId: s.id, date: `${y}-${m}-${d}`, value: r.valor }
        })

      if (rows.length === 0) {
        console.log('sem dados novos')
      } else {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          await db.insert(macroSeriesData).values(rows.slice(i, i + BATCH_SIZE)).onConflictDoNothing()
        }
        totalNew += rows.length
        console.log(`+${rows.length}`)
      }

      await db.update(macroSeriesMeta).set({ lastFetchAt: new Date() }).where(eq(macroSeriesMeta.id, s.id))
    } catch (err) {
      totalFail++
      console.log(`ERRO: ${err instanceof Error ? err.message : String(err)}`)
    }

    await sleep(PAUSE_MS)
  }

  const finishedAt = new Date()
  const elapsed    = ((finishedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)

  await db.insert(jobRuns).values({
    jobName:        'refresh-bcb',
    startedAt,
    finishedAt,
    status:         totalFail === 0 ? 'success' : 'partial',
    itemsProcessed: series.length - totalFail,
    itemsFailed:    totalFail,
    metadata:       { totalNew, daysBack: DAYS_BACK, seriesCount: series.length },
  })

  console.log(`\n✓ Concluído em ${elapsed}s — ${totalNew} pontos novos, ${totalFail} erros`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
