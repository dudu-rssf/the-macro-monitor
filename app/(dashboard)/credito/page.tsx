export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { CreditDashboard } from './_components/credit-dashboard'

const FROM = new Date('2015-01-01')

export default async function CreditoPage() {
  const [
    totalKv, inadimKv, spreadKv, compRendaKv,
    totalH, pfH, pjH, inadimTotalH, inadimPfH, inadimPjH, spreadH, compRendaH,
  ] = await Promise.all([
    getSeriesLatestTwo('20631'),
    getSeriesLatestTwo('21082'),
    getSeriesLatestTwo('20786'),
    getSeriesLatestTwo('19882'),
    getSeriesHistoryFrom('20631', FROM),
    getSeriesHistoryFrom('20622', FROM),
    getSeriesHistoryFrom('20623', FROM),
    getSeriesHistoryFrom('21082', FROM),
    getSeriesHistoryFrom('21084', FROM),
    getSeriesHistoryFrom('21086', FROM),
    getSeriesHistoryFrom('20786', FROM),
    getSeriesHistoryFrom('19882', FROM),
  ])

  return (
    <CreditDashboard
      data={{
        totalKv, inadimKv, spreadKv, compRendaKv,
        total:       totalH?.data       ?? [],
        pf:          pfH?.data          ?? [],
        pj:          pjH?.data          ?? [],
        inadimTotal: inadimTotalH?.data ?? [],
        inadimPf:    inadimPfH?.data    ?? [],
        inadimPj:    inadimPjH?.data    ?? [],
        spread:      spreadH?.data      ?? [],
        compRenda:   compRendaH?.data   ?? [],
      }}
    />
  )
}
