export const dynamic = 'force-dynamic'

import { getSeriesLatestTwo, getSeriesMonthly } from '@/db/queries'
import { fetchYahooMonthly, normalizeToBase100 } from '@/lib/sources/yahoo'
import { MarketsDashboard } from './_components/markets-dashboard'

const FROM = new Date('2015-01-01')

const INDICES = [
  { symbol: '^BVSP',     key: 'ibov',    label: 'Ibovespa (Brasil)'      },
  { symbol: '^GSPC',     key: 'sp500',   label: 'S&P 500 (EUA)'         },
  { symbol: '^IXIC',     key: 'nasdaq',  label: 'Nasdaq Composto (EUA)' },
  { symbol: '^STOXX50E', key: 'stoxx',   label: 'Euro Stoxx 50'         },
  { symbol: '^N225',     key: 'nikkei',  label: 'Nikkei 225 (Japão)'    },
  { symbol: '^FTSE',     key: 'ftse',    label: 'FTSE 100 (Reino Unido)' },
]

export default async function MercadosPage() {
  const [
    selicKv, usdBrlKv, embiKv, diOverKv,
    selicH, diOverH, usdBrlH, eurBrlH, embiH,
    ...indicesRaw
  ] = await Promise.all([
    getSeriesLatestTwo('1178'),
    getSeriesLatestTwo('10813'),
    getSeriesLatestTwo('11752'),
    getSeriesLatestTwo('4389'),
    getSeriesMonthly('1178',  FROM),
    getSeriesMonthly('4389',  FROM),
    getSeriesMonthly('10813', FROM),
    getSeriesMonthly('21620', FROM),
    getSeriesMonthly('11752', FROM),
    ...INDICES.map((idx) => fetchYahooMonthly(idx.symbol, 10).catch(() => [])),
  ])

  // Build equity index data: raw values and normalized (base 100 = first point)
  const equityIndices = INDICES.map((idx, i) => {
    const raw = indicesRaw[i] as Awaited<ReturnType<typeof fetchYahooMonthly>>
    return {
      key:        idx.key,
      label:      idx.label,
      symbol:     idx.symbol,
      raw,
      normalized: normalizeToBase100(raw),
      latest:     raw.at(-1) ?? null,
      previous:   raw.at(-2) ?? null,
    }
  })

  return (
    <MarketsDashboard
      data={{
        selicKv, usdBrlKv, embiKv, diOverKv,
        selic:  selicH,
        diOver: diOverH,
        usdBrl: usdBrlH,
        eurBrl: eurBrlH,
        embi:   embiH,
        equityIndices,
      }}
    />
  )
}
