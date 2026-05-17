import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { source: 'BCB_SGS', sourceCode: '1786', name: 'M1 — Meios de pagamento restritos (R$ mil)', unit: 'R$ mil', frequency: 'monthly', area: 'monetario' },
  { source: 'BCB_SGS', sourceCode: '1788', name: 'M2 — Meios de pagamento amplos (R$ mil)',     unit: 'R$ mil', frequency: 'monthly', area: 'monetario' },
]

async function main() {
  for (const s of series) {
    const ex = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta).where(eq(macroSeriesMeta.sourceCode, s.sourceCode)).limit(1)
    if (ex.length > 0) { console.log(`SKIP  ${s.sourceCode} — already exists`); continue }
    await db.insert(macroSeriesMeta).values({ ...s, active: true })
    console.log(`OK    ${s.sourceCode} — ${s.name}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
