import 'dotenv/config'
import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { fetchSeries } from '../lib/sources/bcb-sgs'
import { eq, inArray } from 'drizzle-orm'

const END   = new Date()
// Séries diárias: BCB limita janela a exatamente 10 anos
const START_DAILY   = new Date(END)
START_DAILY.setFullYear(START_DAILY.getFullYear() - 10)
START_DAILY.setDate(START_DAILY.getDate() + 2) // margem de segurança
// Séries mensais/trimestrais: 10+ anos sem restrição
const START_MONTHLY = new Date('2015-01-01')

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

async function main() {
  // Séries com código SGS descontinuado (retornam XML em vez de JSON)
  const DISCONTINUED = ['16121', '20402', '22689']

  const allSeries = await db
    .select({ id: macroSeriesMeta.id, sourceCode: macroSeriesMeta.sourceCode, name: macroSeriesMeta.name, frequency: macroSeriesMeta.frequency })
    .from(macroSeriesMeta)
    .where(eq(macroSeriesMeta.source, 'BCB_SGS'))

  // Desativa séries descontinuadas
  if (DISCONTINUED.length > 0) {
    await db
      .update(macroSeriesMeta)
      .set({ active: false })
      .where(inArray(macroSeriesMeta.sourceCode, DISCONTINUED))
    console.log(`Marcadas como inativas: ${DISCONTINUED.join(', ')}`)
  }

  console.log(`Backfill de ${allSeries.length} series (diarias: ${toDateStr(START_DAILY)}, mensais: ${toDateStr(START_MONTHLY)} — ate ${toDateStr(END)})`)
  console.log('Estimativa: ~5-10 minutos\n')

  let ok = 0
  let failed = 0

  for (const serie of allSeries) {
    try {
      process.stdout.write(`[${String(ok + failed + 1).padStart(2)}/${allSeries.length}] ${serie.sourceCode} ${serie.name}... `)

      const isDaily = serie.frequency === 'daily' || serie.frequency === 'irregular'
      const start = isDaily ? START_DAILY : START_MONTHLY
      const points = await fetchSeries(Number(serie.sourceCode), start, END)

      if (points.length === 0) {
        console.log('sem dados')
        ok++
        continue
      }

      const rows = points.map((p) => ({
        seriesId: serie.id,
        date: toDateStr(p.date),
        value: String(p.value),
      }))

      // Insere em lotes de 500 para nao sobrecarregar o Postgres
      const BATCH = 500
      for (let i = 0; i < rows.length; i += BATCH) {
        await db
          .insert(macroSeriesData)
          .values(rows.slice(i, i + BATCH))
          .onConflictDoNothing()
      }

      console.log(`${points.length} pontos`)
      ok++
    } catch (err) {
      console.log(`ERRO: ${(err as Error).message}`)
      failed++
    }
  }

  console.log(`\nConcluido: ${ok} ok, ${failed} com erro`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
