import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { source: 'BCB_SGS', sourceCode: '22021', name: 'ICS - Confianca de Servicos FGV',              unit: 'pontos', frequency: 'monthly', area: 'activity' },
  { source: 'BCB_SGS', sourceCode: '1455',  name: 'Volume de vendas no varejo ampliado - IBGE',   unit: 'indice', frequency: 'monthly', area: 'activity' },
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
