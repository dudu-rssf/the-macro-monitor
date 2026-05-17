import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { getSeriesHistory } from '@/db/queries'

// Todas as séries do site — quanto mais, melhor a detecção de outliers
const SERIES = [
  // Inflação
  { code: '433',   label: 'IPCA mensal',           unit: '% m/m',  dec: 2 },
  { code: '13522', label: 'IPCA acum. 12 meses',   unit: '%',      dec: 2 },
  { code: '4449',  label: 'IPCA-15 mensal',        unit: '% m/m',  dec: 2 },
  { code: '16121', label: 'Núcleo IPCA médias simples', unit: '% m/m', dec: 2 },
  { code: '27838', label: 'Núcleo IPCA médias aparadas', unit: '% m/m', dec: 2 },
  { code: '27839', label: 'Núcleo IPCA EX',        unit: '% m/m',  dec: 2 },
  { code: '11427', label: 'Núcleo IPCA DP',        unit: '% m/m',  dec: 2 },
  { code: '28750', label: 'Núcleo IPCA P55',       unit: '% m/m',  dec: 2 },
  { code: '188',   label: 'IGP-M mensal',          unit: '% m/m',  dec: 2 },
  { code: '4466',  label: 'INPC mensal',           unit: '% m/m',  dec: 2 },
  // Atividade
  { code: '22065', label: 'IBC-Br acum. 12m',      unit: '%',      dec: 2 },
  { code: '7326',  label: 'PIB var. trimestral',   unit: '%',      dec: 2 },
  // Trabalho
  { code: '24369', label: 'Desemprego PNAD',       unit: '%',      dec: 1 },
  { code: '24380', label: 'Rendimento real médio', unit: 'R$',     dec: 0 },
  { code: '28763', label: 'CAGED saldo',           unit: 'vagas',  dec: 0 },
  // Política monetária / fiscal
  { code: '1178',  label: 'Selic',                unit: '% a.a.', dec: 2 },
  { code: '4513',  label: 'DLSP % PIB',           unit: '% PIB',  dec: 2 },
  { code: '5788',  label: 'Resultado primário',   unit: '% PIB',  dec: 2 },
  // Setor externo / crédito
  { code: '10813', label: 'USD/BRL',              unit: 'R$',     dec: 2 },
  { code: '11752', label: 'EMBI+',               unit: 'pb',     dec: 0 },
  { code: '3546',  label: 'Reservas internacionais', unit: 'US$ bi', dec: 0 },
  { code: '22701', label: 'Balança comercial',    unit: 'US$ mi', dec: 0 },
  { code: '21082', label: 'Inadimplência',        unit: '%',      dec: 2 },
  { code: '20634', label: 'Spread bancário',      unit: 'pp',     dec: 2 },
]

function stats(values: number[]): { mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const std  = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
  return { mean, std }
}

async function fetchFocusIPCA(refMonth: string): Promise<number | null> {
  try {
    const p = new URLSearchParams({
      '$format':  'json',
      '$top':     '5',
      '$orderby': 'Data desc',
      '$select':  'Mediana',
      '$filter':  `Indicador eq 'IPCA' and DataReferencia eq '${refMonth}' and baseCalculo eq 0`,
    })
    const res = await fetch(
      `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais?${p.toString()}`,
      { signal: AbortSignal.timeout(6_000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.value?.[0]?.Mediana ?? null
  } catch {
    return null
  }
}

type Result = { bullets: string[]; generatedAt: string | null; error?: string }

const compute = unstable_cache(
  async (): Promise<Result> => {
    const histories = await Promise.all(
      SERIES.map(s => getSeriesHistory(s.code, 13).catch(() => null))
    )

    const ipcaIdx = SERIES.findIndex(s => s.code === '433')
    let focusIPCA: number | null = null
    if (histories[ipcaIdx]?.data?.length) {
      const latestDate = histories[ipcaIdx]!.data.at(-1)!.date
      const d = new Date(latestDate + 'T12:00:00')
      const refMonth = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      focusIPCA = await fetchFocusIPCA(refMonth)
    }

    const lines: string[] = []
    for (let i = 0; i < SERIES.length; i++) {
      const spec = SERIES[i]
      const h    = histories[i]
      if (!h || h.data.length < 2) continue

      const sorted  = [...h.data].sort((a, b) => a.date.localeCompare(b.date))
      const latest  = sorted.at(-1)!
      const hist12  = sorted.slice(-13, -1)
      if (hist12.length === 0) continue

      const histVals = hist12.map(p => p.value)
      const { mean, std } = stats(histVals)
      const dev   = latest.value - mean
      const zRaw  = std > 0 ? dev / std : 0
      const z     = parseFloat(zRaw.toFixed(2))
      const devSign = dev >= 0 ? '+' : ''

      let line = `• ${spec.label} (${latest.date.slice(0, 7)}): ${latest.value.toFixed(spec.dec)} ${spec.unit}`
      line += ` | média 12m: ${mean.toFixed(spec.dec)} | desvio: ${devSign}${dev.toFixed(spec.dec)} | z-score: ${z}`

      if (spec.code === '433' && focusIPCA !== null) {
        const surprise = latest.value - focusIPCA
        line += ` | expectativa Focus: ${focusIPCA.toFixed(spec.dec)} | surpresa: ${surprise >= 0 ? '+' : ''}${surprise.toFixed(spec.dec)}`
      }

      lines.push(line)
    }

    const prompt = `Você é um economista brasileiro sênior. Analise os dados abaixo de TODOS os indicadores do site e identifique os outliers mais relevantes — ou seja, os dados que vieram significativamente acima ou abaixo da média recente.

Critério de outlier: z-score acima de 1,5 ou abaixo de -1,5 em magnitude. Quando disponível, priorize também surpresas em relação à expectativa Focus do IPCA.

Escreva de 5 a 7 bullets em português, focados nos destaques mais relevantes agora. Seja específico: mencione o dado, o valor atual, a média histórica e o que isso significa na prática. Se não houver outlier significativo em alguma área, foque nos dados que mais se distanciam do padrão.

Cada linha começa com "•". Sem título ou introdução.

Dados (latest | média 12m | desvio | z-score):
${lines.join('\n')}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens:  800,
      }),
      signal: AbortSignal.timeout(25_000),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { bullets: [], generatedAt: null, error: `API error ${res.status}: ${errBody.slice(0, 120)}` }
    }

    const data    = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const bullets = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 20)
      .map((l: string) => l.replace(/^[•\-\*–]\s*|^\d+[\.\)]\s*/, '').trim())
      .filter((l: string) => l.length > 20)

    return { bullets, generatedAt: new Date().toISOString() }
  },
  ['ai-context-recent-v2'],
  { revalidate: 86400, tags: ['ai-context'] },
)

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ bullets: [], generatedAt: null, error: 'GROQ_API_KEY não configurada no servidor.' })
  }
  try {
    const result = await compute()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ bullets: [], generatedAt: null, error: String(e).slice(0, 150) })
  }
}
