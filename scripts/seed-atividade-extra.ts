import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

// Séries diárias: BCB limita janela a 10 anos.
// Séries mensais/trimestrais: sem restrição de janela.
const series = [
  // ── PIB variação % (IBC-Br proxy) ─────────────────────────────────────────
  { source: 'BCB_SGS', sourceCode: '22063', name: 'IBC-Br - Variacao % mensal',               unit: '%',   frequency: 'monthly',   area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '22064', name: 'IBC-Br - Variacao % acumulada no ano',      unit: '%',   frequency: 'monthly',   area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '22065', name: 'IBC-Br - Variacao % acumulada 12 meses',   unit: '%',   frequency: 'monthly',   area: 'atividade' },
  // ── PIB nível trimestral (indice encadeado, base 1995=100) ─────────────────
  { source: 'BCB_SGS', sourceCode: '22109', name: 'PIB - Indice encadeado s/ ajuste sazonal',  unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '22110', name: 'PIB - Indice encadeado c/ ajuste sazonal',  unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  // ── PIB lado da demanda — componentes trimestrais ─────────────────────────
  { source: 'BCB_SGS', sourceCode: '22113', name: 'PIB - Consumo das Familias (indice encadeado)', unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '22115', name: 'PIB - Exportacoes bens e servicos (indice)',    unit: 'indice', frequency: 'quarterly', area: 'atividade' },
  // ── PIB nominal acumulado 12 meses ────────────────────────────────────────
  { source: 'BCB_SGS', sourceCode: '4380',  name: 'PIB nominal acumulado 12 meses (R$ milhoes)', unit: 'R$ mi', frequency: 'monthly', area: 'atividade' },
  // ── Indústria — PIM segmentos (base 2012=100) ─────────────────────────────
  { source: 'BCB_SGS', sourceCode: '21861', name: 'PIM - Industria de Transformacao',           unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '21862', name: 'PIM - Bens de Capital',                      unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '21863', name: 'PIM - Bens Intermediarios',                  unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '21864', name: 'PIM - Bens de Consumo Duraveis',             unit: 'indice', frequency: 'monthly', area: 'atividade' },
  // ── Comércio varejista — segmentos PMC ────────────────────────────────────
  { source: 'BCB_SGS', sourceCode: '1411',  name: 'PMC - Moveis e Eletrodomesticos',            unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '1412',  name: 'PMC - Artigos Farmaceuticos e Perfumaria',   unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '1413',  name: 'PMC - Equipamentos Informatica e Comunicacao', unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '1416',  name: 'PMC - Veiculos Motos Partes e Pecas',        unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '1408',  name: 'PMC - Combustiveis e Lubrificantes',         unit: 'indice', frequency: 'monthly', area: 'atividade' },
  { source: 'BCB_SGS', sourceCode: '1409',  name: 'PMC - Hipermercados Supermercados e Alimentos', unit: 'indice', frequency: 'monthly', area: 'atividade' },
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
