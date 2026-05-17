import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

const codes = ['1786', '1788']
const FROM = '2001-01-01'

async function fetchBCB(code: string, from: string): Promise<{ data: string; valor: string }[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${from.split('-').reverse().join('/')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`BCB ${code}: ${res.status}`)
  return res.json()
}

async function main() {
  const metas = await db.select({ id: macroSeriesMeta.id, code: macroSeriesMeta.sourceCode }).from(macroSeriesMeta).where(inArray(macroSeriesMeta.sourceCode, codes))

  for (const meta of metas) {
    console.log(`Fetching ${meta.code}…`)
    const raw = await fetchBCB(meta.code, FROM)
    const rows = raw.map((r) => {
      const [d, m, y] = r.data.split('/')
      return { seriesId: meta.id, date: `${y}-${m}-${d}`, value: r.valor }
    })
    let inserted = 0
    for (const row of rows) {
      await db.insert(macroSeriesData).values(row).onConflictDoNothing()
      inserted++
    }
    console.log(`  ${meta.code}: ${inserted} rows`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
