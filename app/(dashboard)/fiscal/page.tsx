export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { FiscalDashboard } from './_components/fiscal-dashboard'
import { TabAiSummary } from '@/components/macro/tab-ai-summary'

const FROM      = new Date('2003-01-01')
const FROM_2015 = new Date('2015-01-01')

export default async function FiscalPage() {
  const [
    dlspKv, dbggKv, primarioKv,
    dlspH, dbggH,
    primarioCentralH, primarioTotalH,
    nfspH,
    nfspSemDesvalH, primarioSemDesvalH,
  ] = await Promise.all([
    getSeriesLatestTwo('4513'),
    getSeriesLatestTwo('13762'),
    getSeriesLatestTwo('5793'),
    getSeriesHistoryFrom('4513',  FROM),      // DLSP % PIB
    getSeriesHistoryFrom('13762', FROM),      // DBGG % PIB
    getSeriesHistoryFrom('5727',  FROM),      // Primário Gov. Central R$ mi
    getSeriesHistoryFrom('5793',  FROM),      // Primário Setor Público R$ bi
    getSeriesHistoryFrom('4649',  FROM_2015), // NFSP nominal R$ mi
    getSeriesHistoryFrom('5786',  FROM),      // NFSP s/desval cambial nominal % PIB 12m
    getSeriesHistoryFrom('5788',  FROM),      // NFSP s/desval cambial primário % PIB 12m
  ])

  return (
    <>
    <FiscalDashboard
      data={{
        dlspKv,
        dbggKv,
        primarioKv,
        dlsp:              dlspH?.data              ?? [],
        dbgg:              dbggH?.data              ?? [],
        primarioCentral:   primarioCentralH?.data   ?? [],
        primarioTotal:     primarioTotalH?.data      ?? [],
        nfsp:              nfspH?.data              ?? [],
        nfspSemDesval:     nfspSemDesvalH?.data     ?? [],
        primarioSemDesval: primarioSemDesvalH?.data ?? [],
      }}
    />
    <TabAiSummary tab="fiscal" />
  </>
  )
}
