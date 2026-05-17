import { NextResponse } from 'next/server'
import { fetchAllNews, type NewsItem, type NewsCategory } from '@/lib/rss'

export const revalidate = 900

type GroqCategory = NewsCategory | 'irrelevante'
interface GroqResult { id: string; category: GroqCategory; summary: string }

// Categorias propositalmente amplas — Groq deve preferir macro quando em dúvida
const GROQ_SYSTEM = `Você é um classificador e resumidor de notícias para um dashboard macroeconômico brasileiro.

Categorias (seja INCLUSIVO — prefira macro-brasil ou macro-global quando houver dúvida):
- macro-brasil: qualquer notícia sobre a economia brasileira — inflação (IPCA/IGP/INPC), crescimento/PIB/IBC-Br, emprego/CAGED/PNAD, câmbio BRL, Selic/juros/BCB, crédito, setor externo, dívida pública, deficit fiscal, exportações, importações, atividade econômica, renda, commodities com efeito no Brasil, decisões do governo com impacto econômico
- macro-global: qualquer notícia com impacto econômico global — Fed/BCE/BoJ e outros bancos centrais, inflação nos EUA/Europa/China, crescimento/recessão global, petróleo, minério de ferro, soja e demais commodities, tarifas/guerra comercial, dados econômicos de EUA/China/Europa, risco global, dólar índice
- geopolitica-global: geopolítica sem foco econômico primário — conflitos armados, sanções políticas, eleições no exterior, diplomacia
- politica-brasileira: política doméstica sem foco macro — Congresso, eleições 2026, STF, partidos, escândalos políticos, reformas políticas
- negocios-brasil: empresas específicas — resultados trimestrais, fusões, IPOs, estratégia corporativa, demissões em empresa específica
- irrelevante: crime, esportes, acidentes, clima, saúde individual, moda, entretenimento, horóscopo, concursos, impostos pessoa física, receitas

REGRA: em caso de dúvida entre macro-brasil e politica-brasileira, escolha macro-brasil. Entre macro-global e geopolitica-global, escolha macro-global se houver qualquer dado econômico.

Para cada notícia retorne:
- "category": uma das categorias acima
- "summary": 2-3 frases em português com os dados, números e impactos essenciais (string vazia se irrelevante)

Retorne APENAS JSON válido: {"items":[{"id":"...","category":"...","summary":"..."}]}`

async function enrichWithGroq(items: NewsItem[]): Promise<NewsItem[]> {
  const payload = items.map(n => ({ id: n.id, title: n.title, description: n.description }))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'llama-3.3-70b-versatile',
      temperature:     0.1,
      max_tokens:      6000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: GROQ_SYSTEM },
        { role: 'user',   content: `Notícias:\n${JSON.stringify(payload)}` },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!res.ok) throw new Error(`Groq ${res.status}`)

  const json   = await res.json()
  const text   = json.choices?.[0]?.message?.content ?? ''
  const parsed = JSON.parse(text) as { items: GroqResult[] }
  const byId   = new Map(parsed.items.map((r: GroqResult) => [r.id, r]))

  return items
    .map(n => {
      const groq = byId.get(n.id)
      if (!groq || groq.category === 'irrelevante') return null
      return { ...n, category: groq.category as NewsCategory, summary: groq.summary ?? '' }
    })
    .filter((n): n is NewsItem => n !== null)
}

export async function GET() {
  let raw: NewsItem[] = []
  try {
    raw = await fetchAllNews()
  } catch {
    return NextResponse.json([])
  }

  const batch = raw.slice(0, 60)

  try {
    const enriched = await enrichWithGroq(batch)
    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json(batch)
  }
}
