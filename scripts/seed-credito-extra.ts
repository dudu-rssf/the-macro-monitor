import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { sourceCode: '20714', name: 'Taxa de Juros — Total do crédito (% a.a.)',            unit: '% a.a.', frequency: 'monthly', area: 'credito' },
  { sourceCode: '20751', name: 'Taxa de Juros — Crédito Pessoa Física (% a.a.)',        unit: '% a.a.', frequency: 'monthly', area: 'credito' },
  { sourceCode: '20787', name: 'Spread Médio — Crédito Pessoa Física (p.p.)',           unit: 'p.p.',   frequency: 'monthly', area: 'credito' },
  { sourceCode: '29037', name: 'Endividamento das Famílias — % da Renda Bruta (12m)',  unit: '%',      frequency: 'monthly', area: 'credito' },
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
