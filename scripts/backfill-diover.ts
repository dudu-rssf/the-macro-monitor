import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { eq } from 'drizzle-orm'

async function fetchBCB(code: string, from: string, to: string): Promise<{ data: string; valor: string }[]> {
  const fmt = (d: string) => d.split('-').reverse().join('/')
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${fmt(from)}&dataFinal=${fmt(to)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`BCB ${code}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function main() {
  const [meta] = await db.select({ id: macroSeriesMeta.id }).from(macroSeriesMeta).where(eq(macroSeriesMeta.sourceCode, '7806')).limit(1)
  if (!meta) { console.log('Series 7806 not found'); process.exit(1) }

  // Busca de 2019-10-01 até hoje em dois blocos (limite de 10 anos BCB)
  const segments = [
    { from: '2019-10-01', to: '2025-05-17' },
  ]

  let total = 0
  for (const seg of segments) {
    console.log(`Fetching 7806 from ${seg.from} to ${seg.to}…`)
    const raw = await fetchBCB('7806', seg.from, seg.to)
    for (const r of raw) {
      const [d, m, y] = r.data.split('/')
      await db.insert(macroSeriesData).values({ seriesId: meta.id, date: `${y}-${m}-${d}`, value: r.valor }).onConflictDoNothing()
      total++
    }
    console.log(`  ${raw.length} rows fetched`)
  }
  console.log(`Total: ${total} rows inserted`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
