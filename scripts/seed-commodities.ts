import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { source: 'BCB_SGS', sourceCode: '27574', name: 'IC-Br - Indice de Commodities Brasil (geral)', unit: 'indice', frequency: 'monthly', area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '27575', name: 'IC-Br - Agropecuario',                         unit: 'indice', frequency: 'monthly', area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '27576', name: 'IC-Br - Metal',                                unit: 'indice', frequency: 'monthly', area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '27577', name: 'IC-Br - Energia',                              unit: 'indice', frequency: 'monthly', area: 'inflation' },
]

async function main() {
  let inserted = 0, skipped = 0
  for (const s of series) {
    const ex = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta)
      .where(eq(macroSeriesMeta.sourceCode, s.sourceCode)).limit(1)
    if (ex.length > 0) { console.log(`SKIP  ${s.sourceCode}`); skipped++; continue }
    await db.insert(macroSeriesMeta).values({ ...s, active: true })
    console.log(`OK    ${s.sourceCode} — ${s.name}`)
    inserted++
  }
  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
