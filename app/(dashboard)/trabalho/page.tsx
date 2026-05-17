export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { LaborDashboard } from './_components/labor-dashboard'

const FROM = new Date('2015-01-01')

export default async function TrabalhoPage() {
  const [
    desempregoKv, rendimentoKv, massaKv,
    desempregoH, rendimentoH, massaH,
  ] = await Promise.all([
    getSeriesLatestTwo('24369'),
    getSeriesLatestTwo('24380'),
    getSeriesLatestTwo('28763'),
    getSeriesHistoryFrom('24369', FROM),
    getSeriesHistoryFrom('24380', FROM),
    getSeriesHistoryFrom('28763', FROM),
  ])

  return (
    <LaborDashboard
      data={{
        desempregoKv,
        rendimentoKv,
        massaKv,
        desemprego:    desempregoH?.data ?? [],
        rendimento:    rendimentoH?.data ?? [],
        massaSalarial: massaH?.data      ?? [],
      }}
    />
  )
}
