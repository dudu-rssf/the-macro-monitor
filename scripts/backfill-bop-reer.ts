import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { inArray } from 'drizzle-orm'

const codes = ['22702', '22703', '22704', '22706', '11753']

async function fetchBCB(code: string): Promise<{ data: string; valor: string }[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=01/01/2003`
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
    const rows = raw.map((r) => {
      const [d, m, y] = r.data.split('/')
      return { seriesId: meta.id, date: `${y}-${m}-${d}`, value: r.valor }
    })
    for (let i = 0; i < rows.length; i += 200) {
      await db.insert(macroSeriesData).values(rows.slice(i, i + 200)).onConflictDoNothing()
    }
    console.log(`${rows.length} rows`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
