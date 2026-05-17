import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { sourceCode: '1635', name: 'IPCA — Alimentação e bebidas (% mensal)' },
  { sourceCode: '1636', name: 'IPCA — Habitação (% mensal)' },
  { sourceCode: '1637', name: 'IPCA — Artigos de residência (% mensal)' },
  { sourceCode: '1638', name: 'IPCA — Vestuário (% mensal)' },
  { sourceCode: '1639', name: 'IPCA — Transportes (% mensal)' },
  { sourceCode: '1640', name: 'IPCA — Saúde e cuidados pessoais (% mensal)' },
  { sourceCode: '1641', name: 'IPCA — Despesas pessoais (% mensal)' },
  { sourceCode: '1642', name: 'IPCA — Educação (% mensal)' },
  { sourceCode: '1643', name: 'IPCA — Comunicação (% mensal)' },
]

async function main() {
  let ins = 0, skip = 0
  for (const s of series) {
    const ex = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta).where(eq(macroSeriesMeta.sourceCode, s.sourceCode)).limit(1)
    if (ex.length > 0) { skip++; continue }
    await db.insert(macroSeriesMeta).values({ source: 'BCB_SGS', ...s, unit: '%', frequency: 'monthly', area: 'inflacao', active: true })
    console.log(`OK  ${s.sourceCode}`)
    ins++
  }
  console.log(`Done: ${ins} inseridas, ${skip} já existiam`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
