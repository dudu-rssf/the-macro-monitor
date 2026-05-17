import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { fetchSeries } from '../lib/sources/bcb-sgs'
import { inArray } from 'drizzle-orm'

const CODES = [
  '22063', '22064', '22065',          // IBC-Br variation % (monthly)
  '22109', '22110',                   // PIB quarterly index (quarterly)
  '22113', '22115',                   // PIB demand components (quarterly)
  '4380',                             // PIB nominal 12m (monthly)
  '21861', '21862', '21863', '21864', // PIM segments (monthly)
  '1408', '1409', '1411', '1412', '1413', '1416', // PMC retail (monthly)
]

const END           = new Date()
const START_MONTHLY = new Date('2001-01-01')

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

async function main() {
  const series = await db
    .select({ id: macroSeriesMeta.id, sourceCode: macroSeriesMeta.sourceCode, name: macroSeriesMeta.name, frequency: macroSeriesMeta.frequency })
    .from(macroSeriesMeta)
    .where(inArray(macroSeriesMeta.sourceCode, CODES))

  console.log(`Backfill de ${series.length} séries de atividade\n`)

  for (const s of series) {
    process.stdout.write(`${s.sourceCode} ${s.name}... `)
    try {
      const points = await fetchSeries(Number(s.sourceCode), START_MONTHLY, END)
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
