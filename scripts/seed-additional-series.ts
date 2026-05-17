import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const additionalSeries = [
  // Nuclei BCB (remaining two)
  { source: 'BCB-SGS', sourceCode: '11427', name: 'Nucleo IPCA DP (dupla ponderacao)',        unit: '%', frequency: 'monthly', area: 'inflacao' },
  { source: 'BCB-SGS', sourceCode: '28750', name: 'Nucleo IPCA P55',                          unit: '%', frequency: 'monthly', area: 'inflacao' },
  // IGP-M components
  { source: 'BCB-SGS', sourceCode: '225',   name: 'IPA-M (Indice de Precos por Atacado - Mercado)', unit: '%', frequency: 'monthly', area: 'inflacao' },
  { source: 'BCB-SGS', sourceCode: '191',   name: 'IPC-M (Indice de Precos ao Consumidor - Mercado)', unit: '%', frequency: 'monthly', area: 'inflacao' },
  { source: 'BCB-SGS', sourceCode: '192',   name: 'INCC-M (Indice Nacional do Custo da Construcao - Mercado)', unit: '%', frequency: 'monthly', area: 'inflacao' },
]

async function main() {
  let inserted = 0
  let skipped = 0

  for (const s of additionalSeries) {
    const existing = await db
      .select({ id: macroSeriesMeta.id })
      .from(macroSeriesMeta)
      .where(eq(macroSeriesMeta.sourceCode, s.sourceCode))
      .limit(1)

    if (existing.length > 0) {
      console.log(`SKIP  ${s.sourceCode} — already exists`)
      skipped++
      continue
    }

    await db.insert(macroSeriesMeta).values({ ...s, active: true })
    console.log(`OK    ${s.sourceCode} — ${s.name}`)
    inserted++
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
