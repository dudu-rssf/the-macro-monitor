export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { fetchFocusAnual } from '@/lib/sources/bcb-focus'
import { MonetaryDashboard } from './_components/monetary-dashboard'

const FROM = new Date('2015-01-01')

// Alinha duas séries mensais por data e computa a diferença (a - b)
function computeDiff(
  a: { date: string; value: number }[],
  b: { date: string; value: number }[]
) {
  const bMap = new Map(b.map((p) => [p.date, p.value]))
  return a
    .filter((p) => bMap.has(p.date))
    .map((p) => ({ date: p.date, value: p.value - bMap.get(p.date)! }))
}

// Pega a mediana mais recente de cada ano de referência
function latestByYear(
  rows: { referencePeriod: string; date: Date; median: number | null }[]
) {
  const map = new Map<string, { date: Date; median: number | null }>()
  for (const r of rows) {
    const existing = map.get(r.referencePeriod)
    if (!existing || r.date > existing.date) {
      map.set(r.referencePeriod, { date: r.date, median: r.median })
    }
  }
  return Array.from(map.entries())
    .map(([year, v]) => ({ year, median: v.median }))
    .sort((a, b) => a.year.localeCompare(b.year))
}

export default async function PoliticaMonetariaPage() {
  const [
    selicKv, ipca12mKv,
    selicH, ipca12mH, diOverH,
    focusIpcaRaw, focusSelicRaw,
  ] = await Promise.all([
    getSeriesLatestTwo('4189'),    // Selic mensal kv
    getSeriesLatestTwo('13522'),   // IPCA 12m kv
    getSeriesHistoryFrom('4189',  FROM),  // Selic mensal
    getSeriesHistoryFrom('13522', FROM),  // IPCA 12m
    getSeriesHistoryFrom('7806',  FROM),  // DI over
    fetchFocusAnual('IPCA',  30).catch(() => []),
    fetchFocusAnual('Selic', 30).catch(() => []),
  ])

  const selicData  = selicH?.data  ?? []
  const ipca12Data = ipca12mH?.data ?? []
  const realRate   = computeDiff(selicData, ipca12Data)

  const currentYear = new Date().getFullYear()
  const focusIpca  = latestByYear(focusIpcaRaw).filter((r) => Number(r.year) >= currentYear)
  const focusSelic = latestByYear(focusSelicRaw).filter((r) => Number(r.year) >= currentYear)

  return (
    <MonetaryDashboard
      data={{
        selicKv,
        ipca12mKv,
        selic:    selicData,
        ipca12m:  ipca12Data,
        realRate,
        diOver:   diOverH?.data ?? [],
        focusIpca,
        focusSelic,
      }}
    />
  )
}
