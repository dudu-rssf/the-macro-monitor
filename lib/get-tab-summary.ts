import { unstable_cache } from 'next/cache'
import { getSeriesHistory, getSeriesLatestTwo } from '@/db/queries'

interface SeriesSpec { code: string; label: string; unit: string; dec: number }

const TAB_SERIES: Record<string, SeriesSpec[]> = {
  inflacao: [
    { code: '433',   label: 'IPCA mensal',    unit: '% m/m', dec: 2 },
    { code: '13522', label: 'IPCA 12 meses',  unit: '%',     dec: 2 },
    { code: '16121', label: 'Núcleo MS',       unit: '% m/m', dec: 2 },
    { code: '188',   label: 'IGP-M',          unit: '% m/m', dec: 2 },
    { code: '4466',  label: 'INPC',           unit: '% m/m', dec: 2 },
  ],
  'politica-monetaria': [
    { code: '1178',  label: 'Selic',          unit: '% a.a.', dec: 2 },
    { code: '13522', label: 'IPCA 12 meses',  unit: '%',      dec: 2 },
    { code: '11752', label: 'EMBI+',          unit: 'pb',     dec: 0 },
    { code: '10813', label: 'USD/BRL',        unit: 'R$',     dec: 2 },
  ],
  atividade: [
    { code: '22065', label: 'IBC-Br 12 meses',       unit: '%',  dec: 2 },
    { code: '7326',  label: 'PIB (variação trim.)',   unit: '%',  dec: 2 },
    { code: '1620',  label: 'Utilização capacidade', unit: '%',  dec: 1 },
  ],
  trabalho: [
    { code: '24369', label: 'Desemprego PNAD',       unit: '%',     dec: 1 },
    { code: '24380', label: 'Rendimento real médio', unit: 'R$',    dec: 0 },
    { code: '28763', label: 'CAGED saldo',           unit: 'vagas', dec: 0 },
  ],
  fiscal: [
    { code: '4513',  label: 'DLSP % PIB',       unit: '% PIB', dec: 2 },
    { code: '13762', label: 'DBGG % PIB',       unit: '% PIB', dec: 2 },
    { code: '5788',  label: 'Resultado primário', unit: '% PIB', dec: 2 },
  ],
  externo: [
    { code: '10813', label: 'USD/BRL',              unit: 'R$',     dec: 2 },
    { code: '11752', label: 'EMBI+',                unit: 'pb',     dec: 0 },
    { code: '3546',  label: 'Reservas internac.',   unit: 'US$ bi', dec: 0 },
    { code: '22701', label: 'Balança comercial',    unit: 'US$ mi', dec: 0 },
  ],
  credito: [
    { code: '21082', label: 'Inadimplência',       unit: '%',     dec: 2 },
    { code: '20634', label: 'Spread bancário',     unit: 'pp',    dec: 2 },
    { code: '20539', label: 'Crédito total % PIB', unit: '% PIB', dec: 2 },
  ],
  mercados: [
    { code: '10813', label: 'USD/BRL',        unit: 'R$',     dec: 2 },
    { code: '11752', label: 'EMBI+',          unit: 'pb',     dec: 0 },
    { code: '1178',  label: 'Selic',          unit: '% a.a.', dec: 2 },
    { code: '13522', label: 'IPCA 12 meses',  unit: '%',      dec: 2 },
  ],
  visao: [
    { code: '13522', label: 'IPCA 12m',   unit: '%',      dec: 2 },
    { code: '1178',  label: 'Selic',      unit: '% a.a.', dec: 2 },
    { code: '22065', label: 'IBC-Br 12m', unit: '%',      dec: 2 },
    { code: '24369', label: 'Desemprego', unit: '%',      dec: 1 },
    { code: '4513',  label: 'DLSP % PIB', unit: '% PIB',  dec: 2 },
    { code: '11752', label: 'EMBI+',      unit: 'pb',     dec: 0 },
  ],
  quant: [
    { code: '1178',  label: 'Selic',       unit: '% a.a.', dec: 2 },
    { code: '13522', label: 'IPCA 12m',    unit: '%',      dec: 2 },
    { code: '22065', label: 'IBC-Br 12m',  unit: '%',      dec: 2 },
    { code: '4513',  label: 'DLSP % PIB',  unit: '% PIB',  dec: 2 },
    { code: '11752', label: 'EMBI+',       unit: 'pb',     dec: 0 },
    { code: '10813', label: 'USD/BRL',     unit: 'R$',     dec: 2 },
    { code: '20786', label: 'Spread PF',   unit: '% a.a.', dec: 2 },
  ],
}

const TAB_NAMES: Record<string, string> = {
  inflacao:             'Inflação',
  'politica-monetaria': 'Política Monetária',
  atividade:            'Atividade Econômica',
  trabalho:             'Mercado de Trabalho',
  fiscal:               'Política Fiscal',
  externo:              'Setor Externo',
  credito:              'Crédito',
  mercados:             'Mercados Financeiros',
  visao:                'Cenário Macro Geral',
  quant:                'Análises Quantitativas',
}

function fmt(n: number | null | undefined, dec: number): string {
  return n != null ? n.toFixed(dec) : 'n.d.'
}

async function compute(tab: string): Promise<{ bullets: string[]; generatedAt: string }> {
  const key = new Date().toISOString()

  if (!process.env.GEMINI_API_KEY) return { bullets: [], generatedAt: key }

  const specs   = TAB_SERIES[tab] ?? TAB_SERIES.visao
  const tabName = TAB_NAMES[tab] ?? tab

  const [histories, latests] = await Promise.all([
    Promise.all(specs.map(s => getSeriesHistory(s.code, 12).catch(() => null))),
    Promise.all(specs.map(s => getSeriesLatestTwo(s.code).catch(() => null))),
  ])

  const histLines = specs.map((s, i) => {
    const h = histories[i]
    if (!h || h.data.length === 0) return null
    const vals = h.data.map(p => p.value)
    const avg  = vals.reduce((a, b) => a + b, 0) / vals.length
    return `• ${s.label}: avg 12m=${fmt(avg, s.dec)} ${s.unit} | ${fmt(vals[0], s.dec)} → ${fmt(vals.at(-1), s.dec)}`
  }).filter(Boolean).join('\n')

  const recentLines = specs.map((s, i) => {
    const pair = latests[i]
    if (!pair) return null
    const { latest, previous } = pair
    const d = previous ? latest.value - previous.value : null
    return `• ${s.label}: ${fmt(latest.value, s.dec)} ${s.unit} (${latest.date.slice(0, 7)})` +
      (d != null ? ` | variação: ${d >= 0 ? '+' : ''}${fmt(d, s.dec)}` : '')
  }).filter(Boolean).join('\n')

  const isQuant = tab === 'quant'
  const prompt = isQuant
    ? `Você é um economista quantitativo brasileiro sênior. Com base nos dados abaixo, interprete o que os modelos quantitativos (Regra de Taylor, Hiato do Produto, FCI, Decomposição da Dívida) estão sinalizando sobre o ciclo econômico atual. Escreva 5 a 7 bullets concisos em português. Seja analítico, mencione implicações de política. Comece cada linha com "•". Sem título.

Dados de suporte:
${recentLines}

Histórico 12m:
${histLines}`
    : `Você é um economista brasileiro sênior. Analise os dados de ${tabName} e escreva 5 a 7 bullets em português sobre o cenário atual. Identifique tendências, riscos e pontos de atenção. Seja específico com números e datas. Comece cada linha com "•". Sem título.

Mais recentes:
${recentLines}

Histórico 12m:
${histLines}`

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'gemini-2.0-flash',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens:  700,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) return { bullets: [], generatedAt: key }

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const bullets = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 20)
      .map((l: string) => l.replace(/^[•\-\*–]\s*|^\d+[\.\)]\s*/, '').trim())
      .filter((l: string) => l.length > 20)

    return { bullets, generatedAt: new Date().toISOString() }
  } catch {
    return { bullets: [], generatedAt: key }
  }
}

export const getTabSummary = unstable_cache(
  compute,
  ['tab-ai-summary'],
  { revalidate: 86400 },
)
