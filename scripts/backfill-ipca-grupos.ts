import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { inArray, eq } from 'drizzle-orm'

const codes = ['1635','1636','1637','1638','1639','1640','1641','1642','1643']
const FROM = '01/01/2015'

async function fetchBCB(code: string): Promise<{ data: string; valor: string }[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${FROM}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${code}: ${res.status}`)
  return res.json()
}

async function main() {
  const metas = await db.select({ id: macroSeriesMeta.id, code: macroSeriesMeta.sourceCode })
    .from(macroSeriesMeta).where(inArray(macroSeriesMeta.sourceCode, codes))

  for (const meta of metas) {
    process.stdout.write(`${meta.code}… `)
    const raw = await fetchBCB(meta.code)
    let n = 0
    for (const r of raw) {
      const [d, m, y] = r.data.split('/')
      await db.insert(macroSeriesData).values({ seriesId: meta.id, date: `${y}-${m}-${d}`, value: r.valor }).onConflictDoNothing()
      n++
    }
    console.log(`${n} rows`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
