import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  // ── VAB setorial trimestral (índice encadeado, base 1995=100) ──────────────
  { source: 'BCB_SGS', sourceCode: '22096', name: 'VAB - Industria (indice encadeado)',       unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '22097', name: 'VAB - Servicos (indice encadeado)',         unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '22103', name: 'VAB - Agropecuaria (indice encadeado)',     unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  // ── PIB componentes da demanda trimestral ─────────────────────────────────
  { source: 'BCB_SGS', sourceCode: '22111', name: 'PIB - FBCF (indice encadeado)',             unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '22114', name: 'PIB - Consumo do Governo (indice encadeado)', unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  // ── Spread bancário (condições financeiras) ───────────────────────────────
  { source: 'BCB_SGS', sourceCode: '20786', name: 'Spread bancario - Pessoas Fisicas (% a.a.)',   unit: '% a.a.', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '20787', name: 'Spread bancario - Pessoas Juridicas (% a.a.)', unit: '% a.a.', frequency: 'monthly', area: 'atividade' },
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
