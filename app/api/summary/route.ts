import { NextResponse } from 'next/server'
import { getSeriesHistory, getSeriesLatestTwo } from '@/db/queries'

export const dynamic = 'force-dynamic'

function v(n: number | null | undefined, dec = 2): string {
  return n != null ? n.toFixed(dec) : '—'
}

function delta(latest: number | null | undefined, prev: number | null | undefined, dec = 2): string {
  if (latest == null || prev == null) return 'n.d.'
  const d = latest - prev
  return (d >= 0 ? '+' : '') + d.toFixed(dec)
}

interface SeriesSpec { code: string; label: string; unit: string; decimals: number }

const TAB_SERIES: Record<string, SeriesSpec[]> = {
  inflacao: [
    { code: '433',   label: 'IPCA mensal',          unit: '% m/m', decimals: 2 },
    { code: '13522', label: 'IPCA 12 meses',        unit: '%',     decimals: 2 },
    { code: '16121', label: 'Núcleo MS',             unit: '% m/m', decimals: 2 },
    { code: '188',   label: 'IGP-M',                unit: '% m/m', decimals: 2 },
    { code: '4466',  label: 'INPC',                 unit: '% m/m', decimals: 2 },
  ],
  'politica-monetaria': [
    { code: '1178',  label: 'Selic',                unit: '% a.a.', decimals: 2 },
    { code: '13522', label: 'IPCA 12 meses',        unit: '%',      decimals: 2 },
    { code: '11752', label: 'EMBI+',               unit: 'pb',     decimals: 0 },
    { code: '10813', label: 'USD/BRL',              unit: 'R$',     decimals: 2 },
  ],
  atividade: [
    { code: '22065', label: 'IBC-Br 12 meses',     unit: '%',     decimals: 2 },
    { code: '7326',  label: 'PIB (variação trim.)', unit: '%',     decimals: 2 },
    { code: '1620',  label: 'Utilização da capacidade (NUCI)', unit: '%', decimals: 1 },
  ],
  trabalho: [
    { code: '24369', label: 'Desemprego PNAD',      unit: '%',     decimals: 1 },
    { code: '24380', label: 'Rendimento real médio', unit: 'R$',   decimals: 0 },
    { code: '28763', label: 'CAGED saldo',          unit: 'vagas', decimals: 0 },
  ],
  fiscal: [
    { code: '4513',  label: 'DLSP % PIB',           unit: '% PIB', decimals: 2 },
    { code: '13762', label: 'DBGG % PIB',           unit: '% PIB', decimals: 2 },
    { code: '5788',  label: 'Resultado primário',   unit: '% PIB', decimals: 2 },
  ],
  externo: [
    { code: '10813', label: 'USD/BRL',              unit: 'R$',    decimals: 2 },
    { code: '11752', label: 'EMBI+',               unit: 'pb',    decimals: 0 },
    { code: '3546',  label: 'Reservas internacionais', unit: 'US$ bi', decimals: 0 },
    { code: '22701', label: 'Balança comercial',    unit: 'US$ mi', decimals: 0 },
  ],
  credito: [
    { code: '21082', label: 'Inadimplência',        unit: '%',     decimals: 2 },
    { code: '20634', label: 'Spread bancário',      unit: 'pp',    decimals: 2 },
    { code: '20539', label: 'Crédito total % PIB', unit: '% PIB', decimals: 2 },
  ],
  mercados: [
    { code: '10813', label: 'USD/BRL',              unit: 'R$',    decimals: 2 },
    { code: '11752', label: 'EMBI+',               unit: 'pb',    decimals: 0 },
    { code: '1178',  label: 'Selic',               unit: '% a.a.', decimals: 2 },
    { code: '13522', label: 'IPCA 12 meses',        unit: '%',     decimals: 2 },
  ],
  visao: [
    { code: '13522', label: 'IPCA 12m',            unit: '%',     decimals: 2 },
    { code: '1178',  label: 'Selic',               unit: '% a.a.', decimals: 2 },
    { code: '22065', label: 'IBC-Br 12m',          unit: '%',     decimals: 2 },
    { code: '24369', label: 'Desemprego',           unit: '%',     decimals: 1 },
    { code: '4513',  label: 'DLSP % PIB',          unit: '% PIB', decimals: 2 },
    { code: '11752', label: 'EMBI+',              unit: 'pb',    decimals: 0 },
  ],
}

const TAB_NAMES: Record<string, string> = {
  inflacao:            'Inflação',
  'politica-monetaria': 'Política Monetária',
  atividade:           'Atividade Econômica',
  trabalho:            'Mercado de Trabalho',
  fiscal:              'Política Fiscal',
  externo:             'Setor Externo',
  credito:             'Crédito',
  mercados:            'Mercados',
  visao:               'Visão Geral',
}

async function callGroq(prompt: string): Promise<string[]> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       'gemini-2.0-flash',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.35,
      max_tokens:  600,
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) return []
  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''
  return text
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 20)
    .map((l: string) => l.replace(/^[•\-\*–]\s*|^\d+[\.\)]\s*/, '').trim())
    .filter((l: string) => l.length > 20)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'visao'

  const specs = TAB_SERIES[tab] ?? TAB_SERIES.visao
  const tabName = TAB_NAMES[tab] ?? 'Macro'

  // Fetch historical (12 months) and latest (2 points) in parallel
  const [historicals, latests] = await Promise.all([
    Promise.all(specs.map(s => getSeriesHistory(s.code, 12))),
    Promise.all(specs.map(s => getSeriesLatestTwo(s.code))),
  ])

  // Build historical context (summarized)
  const histLines = specs.map((spec, i) => {
    const h = historicals[i]
    if (!h || h.data.length === 0) return null
    const values = h.data.map(p => p.value)
    const first  = values[0]
    const last   = values[values.length - 1]
    const min    = Math.min(...values)
    const max    = Math.max(...values)
    const avg    = values.reduce((a, b) => a + b, 0) / values.length
    return `• ${spec.label}: mín ${v(min, spec.decimals)} / máx ${v(max, spec.decimals)} / média ${v(avg, spec.decimals)} ${spec.unit} | variação 12m: ${v(first, spec.decimals)} → ${v(last, spec.decimals)}`
  }).filter(Boolean).join('\n')

  // Build recent context (latest vs previous)
  const recentLines = specs.map((spec, i) => {
    const pair = latests[i]
    if (!pair) return null
    const { latest, previous } = pair
    return `• ${spec.label}: ${v(latest.value, spec.decimals)} ${spec.unit} (${latest.date.slice(0, 7)})` +
      (previous ? ` | anterior: ${v(previous.value, spec.decimals)} | variação: ${delta(latest.value, previous.value, spec.decimals)}` : '')
  }).filter(Boolean).join('\n')

  const [historicalBullets, recentBullets] = await Promise.all([
    callGroq(`Você é um economista brasileiro sênior. Analise os dados históricos dos últimos 12 meses de ${tabName} e escreva de 4 a 6 bullets em português sobre as tendências e o contexto geral. Foco: qual a trajetória dos indicadores, quais os níveis atuais vs histórico, o que o período revela sobre a economia.

Regras: português claro, contextualizar cada número, começar cada linha com "•", sem título ou introdução.

Dados históricos (12 meses):
${histLines}`),

    callGroq(`Você é um economista brasileiro sênior. Analise os dados mais recentes de ${tabName} e escreva de 4 a 6 bullets em português sobre os desenvolvimentos atuais. Foco: o que mudou agora (comparado ao período anterior), surpresas, outliers, inversões de tendência — o que é mais importante entender sobre o momento presente.

Regras: português claro, mencionar números e datas, começar cada linha com "•", sem título ou introdução.

Dados recentes (último vs anterior):
${recentLines}`),
  ])

  return NextResponse.json({
    tab,
    tabName,
    historical: historicalBullets,
    recent:     recentBullets,
    generatedAt: new Date().toISOString(),
  })
}
