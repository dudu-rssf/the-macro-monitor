import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { fetchSeries } from '../lib/sources/bcb-sgs'
import { inArray } from 'drizzle-orm'

const CODES   = ['1833', '17633', '1782', '27815', '27813']
const END     = new Date()
// Série diária (1782): BCB limita a 10 anos
const START_DAILY   = new Date(END); START_DAILY.setFullYear(START_DAILY.getFullYear() - 10); START_DAILY.setDate(START_DAILY.getDate() + 2)
const START_MONTHLY = new Date('2001-01-01')   // BMA disponível desde 2001

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

async function main() {
  const series = await db
    .select({ id: macroSeriesMeta.id, sourceCode: macroSeriesMeta.sourceCode, name: macroSeriesMeta.name, frequency: macroSeriesMeta.frequency })
    .from(macroSeriesMeta)
    .where(inArray(macroSeriesMeta.sourceCode, CODES))

  console.log(`Backfill de ${series.length} séries monetárias\n`)

  for (const s of series) {
    const isDaily = s.frequency === 'daily'
    const start   = isDaily ? START_DAILY : START_MONTHLY
    process.stdout.write(`${s.sourceCode} ${s.name} (${isDaily ? 'diária' : 'mensal'})... `)
    try {
      const points = await fetchSeries(Number(s.sourceCode), start, END)
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
