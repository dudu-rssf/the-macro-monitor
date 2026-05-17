import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  // ── PNAD Contínua — força de trabalho ─────────────────────────────────────
  { source: 'BCB_SGS', sourceCode: '24370', name: 'PNAD - PIA (pop. em idade ativa, mil pessoas)',    unit: 'mil', frequency: 'monthly', area: 'trabalho' },
  { source: 'BCB_SGS', sourceCode: '24378', name: 'PNAD - PEA (forca de trabalho, mil pessoas)',     unit: 'mil', frequency: 'monthly', area: 'trabalho' },
  // ── CAGED (Novo CAGED a partir de jan/2020) ────────────────────────────────
  { source: 'BCB_SGS', sourceCode: '28544', name: 'CAGED - Admissoes (Novo CAGED)',                  unit: 'pessoas', frequency: 'monthly', area: 'trabalho' },
  { source: 'BCB_SGS', sourceCode: '28545', name: 'CAGED - Desligamentos (Novo CAGED)',              unit: 'pessoas', frequency: 'monthly', area: 'trabalho' },
  // ── Índices de Emprego Formal por setor (base 2014=100) ───────────────────
  { source: 'BCB_SGS', sourceCode: '28554', name: 'Ind. Emprego Formal - Agropecuaria (2014=100)',            unit: 'indice', frequency: 'monthly', area: 'trabalho' },
  { source: 'BCB_SGS', sourceCode: '28555', name: 'Ind. Emprego Formal - Industria Transformacao (2014=100)', unit: 'indice', frequency: 'monthly', area: 'trabalho' },
  { source: 'BCB_SGS', sourceCode: '28546', name: 'Ind. Emprego Formal - Construcao Civil (2014=100)',        unit: 'indice', frequency: 'monthly', area: 'trabalho' },
  { source: 'BCB_SGS', sourceCode: '28558', name: 'Ind. Emprego Formal - Comercio (2014=100)',                unit: 'indice', frequency: 'monthly', area: 'trabalho' },
  { source: 'BCB_SGS', sourceCode: '28559', name: 'Ind. Emprego Formal - Servicos (2014=100)',                unit: 'indice', frequency: 'monthly', area: 'trabalho' },
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
