import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const series = [
  { sourceCode: '22702', name: 'Balanço de Pagamentos — Serviços — Saldo (US$ milhões)',              unit: 'US$ mi', frequency: 'monthly', area: 'externo' },
  { sourceCode: '22703', name: 'Balanço de Pagamentos — Renda Primária — Saldo (US$ milhões)',        unit: 'US$ mi', frequency: 'monthly', area: 'externo' },
  { sourceCode: '22704', name: 'Balanço de Pagamentos — Renda Secundária — Saldo (US$ milhões)',      unit: 'US$ mi', frequency: 'monthly', area: 'externo' },
  { sourceCode: '22706', name: 'Balanço de Pagamentos — Conta Financeira — Saldo (US$ milhões)',      unit: 'US$ mi', frequency: 'monthly', area: 'externo' },
  { sourceCode: '11753', name: 'Taxa de Câmbio Real Efetiva — Brasil (IPCA) — Índice (média 2010=100)', unit: 'índice', frequency: 'monthly', area: 'externo' },
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
