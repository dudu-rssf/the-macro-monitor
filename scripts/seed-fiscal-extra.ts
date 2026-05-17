import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { sourceCode: '5786', name: 'NFSP sem desvalorização cambial — resultado nominal acumulado 12 meses (% PIB)', unit: '% PIB', frequency: 'monthly', area: 'fiscal' },
  { sourceCode: '5788', name: 'NFSP sem desvalorização cambial — resultado primário acumulado 12 meses (% PIB)',  unit: '% PIB', frequency: 'monthly', area: 'fiscal' },
]

async function main() {
  for (const s of series) {
    const ex = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta).where(eq(macroSeriesMeta.sourceCode, s.sourceCode)).limit(1)
    if (ex.length > 0) { console.log(`SKIP ${s.sourceCode}`); continue }
    await db.insert(macroSeriesMeta).values({ source: 'BCB_SGS', ...s, active: true })
    console.log(`OK   ${s.sourceCode}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
