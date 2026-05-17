export const dynamic = 'force-dynamic'

import { getSeriesLatestTwo, getSeriesMonthly } from '@/db/queries'
import { MarketsDashboard } from './_components/markets-dashboard'

const FROM = new Date('2015-01-01')

export default async function MercadosPage() {
  const [
    selicKv, usdBrlKv, embiKv, diOverKv,
    selicH, diOverH, usdBrlH, eurBrlH, embiH,
  ] = await Promise.all([
    getSeriesLatestTwo('1178'),
    getSeriesLatestTwo('10813'),
    getSeriesLatestTwo('11752'),
    getSeriesLatestTwo('7806'),
    getSeriesMonthly('1178',  FROM),
    getSeriesMonthly('7806',  FROM),
    getSeriesMonthly('10813', FROM),
    getSeriesMonthly('21620', FROM),
    getSeriesMonthly('11752', FROM),
  ])

  return (
    <MarketsDashboard
      data={{
        selicKv, usdBrlKv, embiKv, diOverKv,
        selic:  selicH,
        diOver: diOverH,
        usdBrl: usdBrlH,
        eurBrl: eurBrlH,
        embi:   embiH,
      }}
    />
  )
}
