import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { source: 'BCB_SGS', sourceCode: '1833',  name: 'Base Monetaria Ampliada (BMA)',          unit: 'R$ mil', frequency: 'monthly', area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '17633', name: 'Recolhimentos Compulsorios Totais',       unit: 'R$ mil', frequency: 'monthly', area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '1782',  name: 'Base Monetaria Restrita - saldo diario', unit: 'R$ mil', frequency: 'daily',   area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '27815', name: 'M3 - Meios de Pagamento (novo)',          unit: 'R$ mil', frequency: 'monthly', area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '27813', name: 'M4 - Meios de Pagamento (novo)',          unit: 'R$ mil', frequency: 'monthly', area: 'monetary' },
]

async function main() {
  let inserted = 0, skipped = 0
  for (const s of series) {
    const ex = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta)
      .where(eq(macroSeriesMeta.sourceCode, s.sourceCode)).limit(1)
    if (ex.length > 0) { console.log(`SKIP  ${s.sourceCode} — already exists`); skipped++; continue }
    await db.insert(macroSeriesMeta).values({ ...s, active: true })
    console.log(`OK    ${s.sourceCode} — ${s.name}`)
    inserted++
  }
  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
