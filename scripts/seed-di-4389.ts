import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  // Marca 7806 como inativa (descontinuada em 2019)
  await db.update(macroSeriesMeta).set({ active: false }).where(eq(macroSeriesMeta.sourceCode, '7806'))
  console.log('7806 marcada inativa')

  // Seed 4389
  const ex = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta).where(eq(macroSeriesMeta.sourceCode, '4389')).limit(1)
  if (ex.length > 0) { console.log('4389 já existe'); process.exit(0) }
  await db.insert(macroSeriesMeta).values({
    source: 'BCB_SGS', sourceCode: '4389',
    name: 'DI overnight — acumulada no mês, anualizada (% a.a.)',
    unit: '% a.a.', frequency: 'daily', area: 'monetario', active: true,
  })
  console.log('4389 inserida')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
