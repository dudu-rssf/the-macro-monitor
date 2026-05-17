import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { getSeriesLatestTwo } from '@/db/queries'

function v(n: number | null | undefined, dec = 2): string {
  return n != null ? n.toFixed(dec) : '—'
}

type Result = { bullets: string[]; generatedAt: string | null; error?: string }

const compute = unstable_cache(
  async (): Promise<Result> => {
    const [ipca, selic, desemprego, ibcBr, dlsp, dbgg, primario, usdBrl, embi, rendimento] =
      await Promise.all([
        getSeriesLatestTwo('13522'),
        getSeriesLatestTwo('1178'),
        getSeriesLatestTwo('24369'),
        getSeriesLatestTwo('22065'),
        getSeriesLatestTwo('4513'),
        getSeriesLatestTwo('13762'),
        getSeriesLatestTwo('5788'),
        getSeriesLatestTwo('10813'),
        getSeriesLatestTwo('11752'),
        getSeriesLatestTwo('24380'),
      ])

    const selicVal = selic?.latest.value  ?? null
    const ipcaVal  = ipca?.latest.value   ?? null
    const juroReal = selicVal != null && ipcaVal != null ? selicVal - ipcaVal : null
    const primPct  = primario?.latest.value != null ? -primario.latest.value : null

    const contexto = [
      `• IPCA acumulado 12 meses: ${v(ipcaVal)}% (meta BCB 2025: 3,0%; teto: 4,5%)`,
      `• Taxa Selic: ${v(selicVal)}% ao ano; juro real ex-post (Selic − IPCA 12m): ${v(juroReal)}%`,
      `• Atividade econômica: IBC-Br variação 12 meses em ${v(ibcBr?.latest.value)}%`,
      `• Mercado de trabalho: taxa de desocupação (PNAD) em ${v(desemprego?.latest.value, 1)}%; rendimento médio real R$ ${v(rendimento?.latest.value, 0)}`,
      `• Dívida Líquida do Setor Público: ${v(dlsp?.latest.value)}% do PIB; Dívida Bruta: ${v(dbgg?.latest.value)}% do PIB`,
      `• Resultado primário (sem desvalorização cambial, 12m): ${v(primPct)}% do PIB${primPct != null ? (primPct >= 0 ? ' (superávit)' : ' (déficit)') : ''}`,
      `• Câmbio: USD/BRL em R$ ${v(usdBrl?.latest.value)}`,
      `• Risco-Brasil (EMBI+): ${v(embi?.latest.value, 0)} pontos-base`,
    ].join('\n')

    const prompt = `Você é um economista brasileiro sênior especializado em macroeconomia. Com base nos dados abaixo, escreva de 5 a 7 bulletpoints concisos sobre o cenário macroeconômico atual do Brasil.

Regras:
- Escreva em português claro, acessível para um leitor informado mas não especialista
- Cada bullet deve contextualizar o dado e sua implicação prática (não apenas repetir o número)
- Identifique tendências positivas, riscos e pontos de atenção
- Seja direto e objetivo
- Comece cada linha com "•" e nada mais antes do texto
- Não inclua título, introdução ou conclusão

Dados mais recentes:
${contexto}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { bullets: [], generatedAt: null, error: `API error ${res.status}: ${errBody.slice(0, 120)}` }
    }

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const bullets = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 20)
      .map((l: string) => l.replace(/^[•\-\*–]\s*|^\d+[\.\)]\s*/, '').trim())
      .filter((l: string) => l.length > 20)

    return { bullets, generatedAt: new Date().toISOString() }
  },
  ['ai-context-geral'],
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
