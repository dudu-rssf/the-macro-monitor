export interface YahooPoint {
  date: string   // YYYY-MM-DD (first day of month)
  close: number
}

interface YahooChartResult {
  timestamp: number[]
  indicators: { quote: [{ close: (number | null)[] }] }
}

interface YahooResponse {
  chart: { result: YahooChartResult[] | null; error: { code: string; description: string } | null }
}

export async function fetchYahooMonthly(symbol: string, rangeYears = 10): Promise<YahooPoint[]> {
  const encoded = encodeURIComponent(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=${rangeYears}y&interval=1mo&includePrePost=false`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MacroMonitor/1.0)' },
    next: { revalidate: 3600 },  // cache 1h on Vercel
  })

  if (!res.ok) throw new Error(`Yahoo ${symbol}: HTTP ${res.status}`)

  const json: YahooResponse = await res.json()
  const result = json.chart.result?.[0]
  if (!result) throw new Error(`Yahoo ${symbol}: no data`)

  const timestamps = result.timestamp
  const closes     = result.indicators.quote[0].close

  return timestamps
    .map((ts, i) => {
      const close = closes[i]
      if (close == null) return null
      const d = new Date(ts * 1000)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      return { date, close: Math.round(close * 100) / 100 }
    })
    .filter((p): p is YahooPoint => p !== null)
}

export function normalizeToBase100(points: YahooPoint[]): { date: string; value: number }[] {
  if (points.length === 0) return []
  const base = points[0].close
  return points.map((p) => ({ date: p.date, value: parseFloat(((p.close / base) * 100).toFixed(2)) }))
}
