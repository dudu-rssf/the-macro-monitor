export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo, getSeriesMonthly } from '@/db/queries'
import { ExternalDashboard } from './_components/external-dashboard'

const FROM = new Date('2015-01-01')

export default async function ExternoPage() {
  const [
    balancaKv, reservasKv, embiKv, usdBrlKv,
    balancaH, transCorrH,
    reservasH, embiH,
    usdBrlH, eurBrlH,
  ] = await Promise.all([
    getSeriesLatestTwo('22701'),
    getSeriesLatestTwo('3546'),
    getSeriesLatestTwo('11752'),
    getSeriesLatestTwo('10813'),
    getSeriesHistoryFrom('22701', FROM),   // mensal
    getSeriesHistoryFrom('22707', FROM),   // mensal
    getSeriesMonthly('3546',  FROM),       // diário → mensal
    getSeriesMonthly('11752', FROM),       // diário → mensal
    getSeriesMonthly('10813', FROM),       // diário → mensal
    getSeriesMonthly('21620', FROM),       // diário → mensal
  ])

  return (
    <ExternalDashboard
      data={{
        balancaKv,
        reservasKv,
        embiKv,
        usdBrlKv,
        balanca:   balancaH?.data   ?? [],
        transCorr: transCorrH?.data ?? [],
        reservas:  reservasH,
        embi:      embiH,
        usdBrl:    usdBrlH,
        eurBrl:    eurBrlH,
      }}
    />
  )
}
