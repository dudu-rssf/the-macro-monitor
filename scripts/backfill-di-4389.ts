import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { eq } from 'drizzle-orm'

const END = new Date()
const START = new Date(END)
START.setFullYear(START.getFullYear() - 10)
START.setDate(START.getDate() + 2)

async function fetchBCB(code: string, from: Date, to: Date): Promise<{ data: string; valor: string }[]> {
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g, '/')
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${fmt(from)}&dataFinal=${fmt(to)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${code}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function main() {
  const [meta] = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta).where(eq(macroSeriesMeta.sourceCode, '4389')).limit(1)
  if (!meta) { console.log('Seed 4389 first'); process.exit(1) }

  console.log(`Fetching 4389 from ${START.toISOString().slice(0,10)} to ${END.toISOString().slice(0,10)}…`)
  const raw = await fetchBCB('4389', START, END)
  const rows = raw.map((r) => {
    const [d, m, y] = r.data.split('/')
    return { seriesId: meta.id, date: `${y}-${m}-${d}`, value: r.valor }
  })

  // Batch insert em grupos de 200 para evitar timeout
  const BATCH = 200
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await db.insert(macroSeriesData).values(batch).onConflictDoNothing()
    inserted += batch.length
    process.stdout.write(`\r  ${inserted}/${rows.length}`)
  }
  console.log(`\nDone: ${inserted} rows`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
