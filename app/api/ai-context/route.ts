import { NextResponse } from 'next/server'
import { getSeriesLatestTwo } from '@/db/queries'

export const dynamic = 'force-dynamic'

function v(n: number | null | undefined, dec = 2): string {
  return n != null ? n.toFixed(dec) : '—'
}

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ bullets: [], generatedAt: null, error: 'GEMINI_API_KEY não configurada no servidor.' })
  }

  try {
    const [ipca, selic, desemprego, ibcBr, dlsp, dbgg, primario, usdBrl, embi, rendimento] =
      await Promise.all([
        getSeriesLatestTwo('13522'),  // IPCA 12m
        getSeriesLatestTwo('1178'),   // Selic
        getSeriesLatestTwo('24369'),  // Desemprego PNAD
        getSeriesLatestTwo('22065'),  // IBC-Br 12m
        getSeriesLatestTwo('4513'),   // DLSP % PIB
        getSeriesLatestTwo('13762'),  // DBGG % PIB
        getSeriesLatestTwo('5788'),   // Primário sem desval % PIB 12m
        getSeriesLatestTwo('10813'),  // USD/BRL
        getSeriesLatestTwo('11752'),  // EMBI+
        getSeriesLatestTwo('24380'),  // Rendimento médio real
      ])

    const selicVal  = selic?.latest.value  ?? null
    const ipcaVal   = ipca?.latest.value   ?? null
    const juroReal  = selicVal != null && ipcaVal != null ? selicVal - ipcaVal : null
    const primPct   = primario?.latest.value != null ? -primario.latest.value : null

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

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return NextResponse.json({ bullets: [], generatedAt: null, error: `API error ${res.status}: ${errBody.slice(0, 120)}` })
    }

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const bullets = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 20)
      .map((l: string) => l.replace(/^[•\-\*–]\s*|^\d+[\.\)]\s*/, '').trim())
      .filter((l: string) => l.length > 20)

    return NextResponse.json({ bullets, generatedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ bullets: [], generatedAt: null, error: String(e).slice(0, 150) })
  }
}
