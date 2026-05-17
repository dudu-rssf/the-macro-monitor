const OLINDA_BASE = 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata'

export interface FocusExpectation {
  indicator: string
  referencePeriod: string
  date: Date
  median: number | null
  mean: number | null
  stdDev: number | null
  minValue: number | null
  maxValue: number | null
  numResponses: number | null
}

interface OlindaAnnualRaw {
  Indicador: string
  Data: string          // YYYY-MM-DD
  DataReferencia: string // '2025', '2026'
  Mediana: number | null
  Media: number | null
  DesvioPadrao: number | null
  Minimo: number | null
  Maximo: number | null
  numeroRespondentes: number | null
}

function parseOlindaDate(yyyymmdd: string): Date {
  return new Date(yyyymmdd + 'T00:00:00Z')
}

async function fetchOlinda<T>(endpoint: string, filter?: string, top = 500): Promise<T[]> {
  const params = new URLSearchParams({ '$format': 'json', '$top': String(top) })
  if (filter) params.set('$filter', filter)

  const url = `${OLINDA_BASE}/${endpoint}?${params.toString()}`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Focus API erro ${res.status}: ${await res.text()}`)
  }

  const json = await res.json()
  return json.value as T[]
}

// Expectativas anuais (IPCA, Selic, PIB, Cambio, IGP-M)
export async function fetchFocusAnual(
  indicator: string,
  daysBack = 5
): Promise<FocusExpectation[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const raw = await fetchOlinda<OlindaAnnualRaw>(
    'ExpectativasMercadoAnuais',
    `Indicador eq '${indicator}' and Data ge '${cutoffStr}'`
  )

  return raw.map((r) => ({
    indicator: r.Indicador.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    referencePeriod: r.DataReferencia,
    date: parseOlindaDate(r.Data),
    median: r.Mediana,
    mean: r.Media,
    stdDev: r.DesvioPadrao,
    minValue: r.Minimo,
    maxValue: r.Maximo,
    numResponses: r.numeroRespondentes,
  }))
}

// Busca as principais expectativas anuais de uma vez
export async function fetchAllFocusAnual(daysBack = 5): Promise<FocusExpectation[]> {
  const indicators = ['IPCA', 'Selic', 'PIB Total', 'Câmbio', 'IGP-M']
  const results: FocusExpectation[] = []

  for (const ind of indicators) {
    const data = await fetchFocusAnual(ind, daysBack)
    results.push(...data)
  }

  return results
}
