export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { ActivityDashboard } from './_components/activity-dashboard'

const FROM = new Date('2015-01-01')

export default async function AtividadePage() {
  const [
    ibcBrKv, prodIndKv, iccKv, varejoKv,
    ibcBrSaH, ibcBrNsaH, prodIndH, varejoH,
    iccH, iciH, icsH, pibH,
  ] = await Promise.all([
    getSeriesLatestTwo('24364'),   // IBC-Br c/ ajuste kv
    getSeriesLatestTwo('21859'),   // Prod. industrial kv
    getSeriesLatestTwo('22099'),   // ICC kv
    getSeriesLatestTwo('1455'),    // Varejo kv
    getSeriesHistoryFrom('24364', FROM),  // IBC-Br c/ ajuste
    getSeriesHistoryFrom('24363', FROM),  // IBC-Br s/ ajuste
    getSeriesHistoryFrom('21859', FROM),  // Prod. industrial
    getSeriesHistoryFrom('1455',  FROM),  // Varejo ampliado
    getSeriesHistoryFrom('22099', FROM),  // ICC consumidor
    getSeriesHistoryFrom('22023', FROM),  // ICI industria
    getSeriesHistoryFrom('22021', FROM),  // ICS servicos
    getSeriesHistoryFrom('28503', FROM),  // PIB trimestral
  ])

  return (
    <ActivityDashboard
      data={{
        ibcBrKv,
        prodIndKv,
        iccKv,
        varejoKv,
        ibcBrSa:  ibcBrSaH?.data  ?? [],
        ibcBrNsa: ibcBrNsaH?.data ?? [],
        prodInd:  prodIndH?.data  ?? [],
        varejo:   varejoH?.data   ?? [],
        icc:      iccH?.data      ?? [],
        ici:      iciH?.data      ?? [],
        ics:      icsH?.data      ?? [],
        pib:      pibH?.data      ?? [],
      }}
    />
  )
}
