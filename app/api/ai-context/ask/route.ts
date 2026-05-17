import { NextRequest, NextResponse } from 'next/server'
import { getSeriesLatestTwo } from '@/db/queries'

export const dynamic = 'force-dynamic'

function v(n: number | null | undefined, dec = 2): string {
  return n != null ? n.toFixed(dec) : '—'
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ answer: '', error: 'GROQ_API_KEY não configurada no servidor.' })
  }

  const body = await req.json().catch(() => ({}))
  const question: string = (body.question ?? '').trim()
  if (!question) return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 })

  try {
    const [ipca, selic, desemprego, ibcBr, dlsp, primario, usdBrl, embi, rendimento] =
      await Promise.all([
        getSeriesLatestTwo('13522'),
        getSeriesLatestTwo('1178'),
        getSeriesLatestTwo('24369'),
        getSeriesLatestTwo('22065'),
        getSeriesLatestTwo('4513'),
        getSeriesLatestTwo('5788'),
        getSeriesLatestTwo('10813'),
        getSeriesLatestTwo('11752'),
        getSeriesLatestTwo('24380'),
      ])

    const selicVal = selic?.latest.value ?? null
    const ipcaVal  = ipca?.latest.value  ?? null
    const juroReal = selicVal != null && ipcaVal != null ? selicVal - ipcaVal : null

    const contexto = [
      `IPCA 12m: ${v(ipcaVal)}%`,
      `Selic: ${v(selicVal)}% a.a.`,
      `Juro real (Selic − IPCA): ${v(juroReal)}%`,
      `IBC-Br 12m: ${v(ibcBr?.latest.value)}%`,
      `Desemprego PNAD: ${v(desemprego?.latest.value, 1)}%`,
      `Rendimento médio real: R$ ${v(rendimento?.latest.value, 0)}`,
      `DLSP % PIB: ${v(dlsp?.latest.value)}%`,
      `Resultado primário 12m: ${v(primario?.latest.value)}% PIB`,
      `USD/BRL: R$ ${v(usdBrl?.latest.value)}`,
      `EMBI+: ${v(embi?.latest.value, 0)} pb`,
    ].join(' | ')

    const prompt = `Você é um economista brasileiro sênior especializado em macroeconomia. Responda a pergunta abaixo de forma clara, precisa e direta — como um economista explicaria a um gestor bem informado. Use os dados atuais quando relevante. Escreva em português.

Dados macroeconômicos atuais do Brasil: ${contexto}

Pergunta: ${question}`

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
        max_tokens:  900,
      }),
      signal: AbortSignal.timeout(25_000),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return NextResponse.json({ answer: '', error: `Groq HTTP ${res.status}: ${errBody.slice(0, 120)}` })
    }

    const data   = await res.json()
    const answer = (data.choices?.[0]?.message?.content ?? '').trim()

    return NextResponse.json({ answer, generatedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ answer: '', error: String(e).slice(0, 150) })
  }
}
