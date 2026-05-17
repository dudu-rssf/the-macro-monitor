import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { fetchSeries } from '../lib/sources/bcb-sgs'
import { inArray } from 'drizzle-orm'

const CODES = ['22021', '1455']
const START = new Date('2015-01-01')
const END   = new Date()

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

async function main() {
  const series = await db
    .select({ id: macroSeriesMeta.id, sourceCode: macroSeriesMeta.sourceCode, name: macroSeriesMeta.name })
    .from(macroSeriesMeta).where(inArray(macroSeriesMeta.sourceCode, CODES))

  for (const s of series) {
    process.stdout.write(`${s.sourceCode} ${s.name}... `)
    try {
      const points = await fetchSeries(Number(s.sourceCode), START, END)
      if (points.length === 0) { console.log('sem dados'); continue }
      const rows = points.map((p) => ({ seriesId: s.id, date: toDateStr(p.date), value: String(p.value) }))
      for (let i = 0; i < rows.length; i += 500)
        await db.insert(macroSeriesData).values(rows.slice(i, i + 500)).onConflictDoNothing()
      console.log(`${points.length} pontos`)
    } catch (err) { console.log(`ERRO: ${(err as Error).message}`) }
  }
  console.log('\nConcluido'); process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
