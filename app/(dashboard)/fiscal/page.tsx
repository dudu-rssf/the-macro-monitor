export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { FiscalDashboard } from './_components/fiscal-dashboard'

const FROM = new Date('2015-01-01')

export default async function FiscalPage() {
  const [
    dlspKv, dbggKv, primarioKv,
    dlspH, dbggH, primarioCentralH, primarioTotalH, nfspH,
  ] = await Promise.all([
    getSeriesLatestTwo('4513'),
    getSeriesLatestTwo('13762'),
    getSeriesLatestTwo('5727'),
    getSeriesHistoryFrom('4513',  FROM),
    getSeriesHistoryFrom('13762', FROM),
    getSeriesHistoryFrom('5727',  FROM),
    getSeriesHistoryFrom('5793',  FROM),
    getSeriesHistoryFrom('4649',  FROM),
  ])

  return (
    <FiscalDashboard
      data={{
        dlspKv,
        dbggKv,
        primarioKv,
        dlsp:             dlspH?.data             ?? [],
        dbgg:             dbggH?.data             ?? [],
        primarioCentral:  primarioCentralH?.data  ?? [],
        primarioTotal:    primarioTotalH?.data     ?? [],
        nfsp:             nfspH?.data             ?? [],
      }}
    />
  )
}
