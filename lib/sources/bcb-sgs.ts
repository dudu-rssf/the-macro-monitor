const BASE_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'

export interface SgsDataPoint {
  date: Date
  value: number
}

interface SgsRawPoint {
  data: string   // DD/MM/YYYY
  valor: string  // número como string, pode ser vazio
}

function parseBcbDate(ddmmyyyy: string): Date {
  const [dd, mm, yyyy] = ddmmyyyy.split('/')
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd))
}

function formatBcbDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchSeries(
  code: number,
  start?: Date,
  end?: Date,
  maxRetries = 5
): Promise<SgsDataPoint[]> {
  const params = new URLSearchParams({ formato: 'json' })
  if (start) params.set('dataInicial', formatBcbDate(start))
  if (end) params.set('dataFinal', formatBcbDate(end))

  const url = `${BASE_URL}.${code}/dados?${params.toString()}`

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url)

    if (res.ok) {
      const raw: SgsRawPoint[] = await res.json()
      return raw
        .filter((p) => p.valor !== '' && p.valor != null)
        .map((p) => ({
          date: parseBcbDate(p.data),
          value: Number(p.valor),
        }))
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt === maxRetries) break
      // backoff exponencial: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * 2 ** attempt, 30_000)
      await sleep(delay)
      continue
    }

    throw new Error(`BCB SGS erro ${res.status} para série ${code}: ${await res.text()}`)
  }

  throw new Error(`BCB SGS série ${code}: falhou após ${maxRetries} tentativas`)
}

// Busca múltiplas séries respeitando rate limit (~10 req/s sem auth)
export async function fetchMultipleSeries(
  codes: number[],
  start?: Date,
  end?: Date
): Promise<Map<number, SgsDataPoint[]>> {
  const results = new Map<number, SgsDataPoint[]>()
  for (const code of codes) {
    results.set(code, await fetchSeries(code, start, end))
    await sleep(120) // ~8 req/s, dentro do limite
  }
  return results
}
