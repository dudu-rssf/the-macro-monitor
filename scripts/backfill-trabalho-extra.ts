import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { fetchSeries } from '../lib/sources/bcb-sgs'
import { inArray } from 'drizzle-orm'

// PNAD e índices de emprego: dados desde 2012 (início PNAD Contínua)
// CAGED Novo: dados desde jan/2020
const CODES       = ['24370', '24378', '28544', '28545', '28546', '28554', '28555', '28558', '28559']
const END         = new Date()
const START_PNAD  = new Date('2012-01-01')
const START_CAGED = new Date('2020-01-01')

const CAGED_CODES = new Set(['28544', '28545'])

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

async function main() {
  const series = await db
    .select({ id: macroSeriesMeta.id, sourceCode: macroSeriesMeta.sourceCode, name: macroSeriesMeta.name })
    .from(macroSeriesMeta)
    .where(inArray(macroSeriesMeta.sourceCode, CODES))

  console.log(`Backfill de ${series.length} séries de mercado de trabalho\n`)

  for (const s of series) {
    const start = CAGED_CODES.has(s.sourceCode) ? START_CAGED : START_PNAD
    process.stdout.write(`${s.sourceCode} ${s.name}... `)
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
