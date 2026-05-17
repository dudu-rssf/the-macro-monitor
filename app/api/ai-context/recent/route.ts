import { NextResponse } from 'next/server'
import { getSeriesLatestTwo } from '@/db/queries'

export const revalidate = 900

function v(n: number | null | undefined, dec = 2): string {
  return n != null ? n.toFixed(dec) : '—'
}

function delta(latest: number | null | undefined, prev: number | null | undefined, dec = 2): string {
  if (latest == null || prev == null) return 'n.d.'
  const d = latest - prev
  return (d >= 0 ? '+' : '') + d.toFixed(dec)
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
    const url = `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais?${p.toString()}`
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) })
    if (!res.ok) return null
    const json = await res.json()
    return json.value?.[0]?.Mediana ?? null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const [ipca12m, ipcaMensal, selic, desemprego, ibcBr, cambio, embi, inadim, rendimento] =
      await Promise.all([
        getSeriesLatestTwo('13522'),  // IPCA 12m
        getSeriesLatestTwo('433'),    // IPCA mensal
        getSeriesLatestTwo('1178'),   // Selic
        getSeriesLatestTwo('24369'),  // Desemprego PNAD
        getSeriesLatestTwo('22065'),  // IBC-Br 12m
        getSeriesLatestTwo('10813'),  // USD/BRL
        getSeriesLatestTwo('11752'),  // EMBI+
        getSeriesLatestTwo('21082'),  // Inadimplência
        getSeriesLatestTwo('24380'),  // Rendimento real médio
      ])

    // BCB Focus expectation for the latest IPCA month
    let focusIPCA: number | null = null
    if (ipcaMensal?.latest.date) {
      const d = new Date(ipcaMensal.latest.date + 'T12:00:00')
      const refMonth = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      focusIPCA = await fetchFocusIPCA(refMonth)
    }

    const lines = [
      ipcaMensal
        ? `• IPCA mensal (${ipcaMensal.latest.date.slice(0, 7)}): ${v(ipcaMensal.latest.value)}% m/m` +
          (ipcaMensal.previous ? ` | anterior: ${v(ipcaMensal.previous.value)}%` : '') +
          (focusIPCA != null ? ` | expectativa Focus: ${v(focusIPCA)}%` : '')
        : null,

      ipca12m
        ? `• IPCA 12 meses: ${v(ipca12m.latest.value)}%` +
          (ipca12m.previous ? ` | anterior: ${v(ipca12m.previous.value)}% | variação: ${delta(ipca12m.latest.value, ipca12m.previous.value)}pp` : '')
        : null,

      selic
        ? `• Selic: ${v(selic.latest.value)}% a.a.` +
          (selic.previous ? ` | anterior: ${v(selic.previous.value)}%` : '')
        : null,

      desemprego
        ? `• Taxa de desemprego PNAD (${desemprego.latest.date.slice(0, 7)}): ${v(desemprego.latest.value, 1)}%` +
          (desemprego.previous ? ` | anterior: ${v(desemprego.previous.value, 1)}% | variação: ${delta(desemprego.latest.value, desemprego.previous.value, 1)}pp` : '')
        : null,

      ibcBr
        ? `• IBC-Br 12 meses (${ibcBr.latest.date.slice(0, 7)}): ${v(ibcBr.latest.value)}%` +
          (ibcBr.previous ? ` | anterior: ${v(ibcBr.previous.value)}% | variação: ${delta(ibcBr.latest.value, ibcBr.previous.value)}pp` : '')
        : null,

      cambio
        ? `• USD/BRL: R$ ${v(cambio.latest.value)} (${cambio.latest.date.slice(0, 10)})` +
          (cambio.previous ? ` | anterior: R$ ${v(cambio.previous.value)} | variação: ${delta(cambio.latest.value, cambio.previous.value)}` : '')
        : null,

      embi
        ? `• EMBI+ (${embi.latest.date.slice(0, 10)}): ${v(embi.latest.value, 0)} pb` +
          (embi.previous ? ` | anterior: ${v(embi.previous.value, 0)} pb | variação: ${delta(embi.latest.value, embi.previous.value, 0)}pb` : '')
        : null,

      inadim
        ? `• Inadimplência bancária: ${v(inadim.latest.value)}%` +
          (inadim.previous ? ` | anterior: ${v(inadim.previous.value)}% | variação: ${delta(inadim.latest.value, inadim.previous.value)}pp` : '')
        : null,

      rendimento
        ? `• Rendimento médio real: R$ ${v(rendimento.latest.value, 0)}` +
          (rendimento.previous ? ` | anterior: R$ ${v(rendimento.previous.value, 0)}` : '')
        : null,
    ].filter(Boolean).join('\n')

    const prompt = `Você é um economista brasileiro sênior. Analise os dados econômicos recentes abaixo e gere de 5 a 7 bulletpoints em português sobre os desenvolvimentos mais relevantes e surpreendentes.

Foco: destaque variações significativas, dados acima ou abaixo do esperado (use a expectativa Focus quando disponível), inversões de tendência, e o que está mais chamando atenção agora. Seja específico com números e datas.

Regras:
- Português claro, acessível mas preciso
- Mencione os números e datas explicitamente
- Destaque surpresas, outliers e o que mais importa entender no momento
- Comece cada linha com "•" e nada mais antes do texto
- Não inclua título, introdução ou conclusão

Dados mais recentes (latest vs anterior):
${lines}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens:  700,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) return NextResponse.json({ bullets: [], generatedAt: null })

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const bullets = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.startsWith('•'))
      .map((l: string) => l.replace(/^•\s*/, '').trim())

    return NextResponse.json({ bullets, generatedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ bullets: [], generatedAt: null })
  }
}
