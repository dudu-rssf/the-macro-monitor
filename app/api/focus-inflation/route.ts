import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FOCUS_BASE = 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata'

interface ODataItem {
  Data:           string
  DataReferencia: string
  Mediana:        number
}

async function fetchOlinda(endpoint: string, params: Record<string, string>): Promise<ODataItem[]> {
  const p = new URLSearchParams(params)
  const res = await fetch(`${FOCUS_BASE}/${endpoint}?${p.toString()}`, {
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return (json.value ?? []) as ODataItem[]
}

export interface FocusYearData {
  ano:    number
  latest: { data: string; mediana: number }
  prev:   { data: string; mediana: number } | null
  trend:  { data: string; mediana: number }[]
}

export interface FocusInflationData {
  anoAtual:    FocusYearData | null
  anoSeguinte: FocusYearData | null
  top5: {
    anoAtual:    { data: string; mediana: number } | null
    anoSeguinte: { data: string; mediana: number } | null
  }
  fetchedAt: string
}

function buildYearData(records: ODataItem[], ano: number): FocusYearData | null {
  const sorted = records
    .filter(r => r.DataReferencia === String(ano) && r.Mediana != null)
    .sort((a, b) => b.Data.localeCompare(a.Data))
  if (sorted.length === 0) return null
  return {
    ano,
    latest: { data: sorted[0].Data.slice(0, 10), mediana: sorted[0].Mediana },
    prev:   sorted[1] ? { data: sorted[1].Data.slice(0, 10), mediana: sorted[1].Mediana } : null,
    trend:  sorted.slice(0, 12).reverse().map(r => ({
      data:    r.Data.slice(0, 10),
      mediana: r.Mediana,
    })),
  }
}

export async function GET() {
  try {
    const currentYear = new Date().getFullYear()
    const nextYear    = currentYear + 1

    const [anualRaw, top5Raw] = await Promise.all([
      fetchOlinda('ExpectativaMercadoAnuais', {
        '$format':  'json',
        '$top':     '120',
        '$orderby': 'Data desc',
        '$select':  'Data,DataReferencia,Mediana',
        '$filter':  `Indicador eq 'IPCA'`,
      }),
      fetchOlinda('ExpectativasMercadoTop5Anuais', {
        '$format':  'json',
        '$top':     '20',
        '$orderby': 'Data desc',
        '$select':  'Data,DataReferencia,Mediana',
        '$filter':  `Indicador eq 'IPCA'`,
      }),
    ])

    const firstByYear = (data: ODataItem[], year: number) => {
      const rec = data.find(r => r.DataReferencia === String(year) && r.Mediana != null)
      return rec ? { data: rec.Data.slice(0, 10), mediana: rec.Mediana } : null
    }

    const result: FocusInflationData = {
      anoAtual:    buildYearData(anualRaw, currentYear),
      anoSeguinte: buildYearData(anualRaw, nextYear),
      top5: {
        anoAtual:    firstByYear(top5Raw, currentYear),
        anoSeguinte: firstByYear(top5Raw, nextYear),
      },
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
