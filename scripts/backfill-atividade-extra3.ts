import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { fetchSeries } from '../lib/sources/bcb-sgs'
import { inArray } from 'drizzle-orm'

// These BCB SGS series do NOT support date range filtering via the API.
// We fetch all data (no start/end params) and filter locally.
const CODES = ['22096', '22097', '22103', '22111', '22114', '20786', '20787']

const START_FILTER = new Date('2001-01-01')

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

async function main() {
  const series = await db
    .select({ id: macroSeriesMeta.id, sourceCode: macroSeriesMeta.sourceCode, name: macroSeriesMeta.name })
    .from(macroSeriesMeta)
    .where(inArray(macroSeriesMeta.sourceCode, CODES))

  console.log(`Backfill de ${series.length} séries (sem filtro de data na API)\n`)

  for (const s of series) {
    process.stdout.write(`${s.sourceCode} ${s.name}... `)
    try {
      // Fetch all data — no start/end params (these series reject date range queries)
      const allPoints = await fetchSeries(Number(s.sourceCode))
      const points = allPoints.filter((p) => p.date >= START_FILTER)
      if (points.length === 0) { console.log('sem dados'); continue }
      const rows = points.map((p) => ({ seriesId: s.id, date: toDateStr(p.date), value: String(p.value) }))
      for (let i = 0; i < rows.length; i += 500)
        await db.insert(macroSeriesData).values(rows.slice(i, i + 500)).onConflictDoNothing()
      console.log(`${points.length} pontos`)
    } catch (err) { console.log(`ERRO: ${(err as Error).message}`) }
  }
  console.log('\nConcluído')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
