import { NextResponse } from 'next/server'
import { fetchAllNews, type NewsItem, type NewsCategory } from '@/lib/rss'

export const revalidate = 900

type GroqCategory = NewsCategory | 'irrelevante'

interface GroqResult { id: string; category: GroqCategory; summary: string }

const GROQ_SYSTEM = `Você é um classificador e resumidor de notícias para um dashboard macroeconômico brasileiro.

Categorias (escolha a mais precisa):
- macro-brasil: dados macro BR — PIB/IBC-Br, IPCA, emprego, Selic, câmbio BRL, fiscal, BCB, IBGE, balança comercial, dívida pública
- macro-global: dados macro global — Fed, BCE, BoJ, inflação nos EUA/Europa, commodities como fator macro, crescimento mundial
- geopolitica-global: geopolítica — guerras, sanções, acordos internacionais, eleições no exterior, relações diplomáticas
- politica-brasileira: política doméstica BR — Congresso, reformas, governo Lula, orçamento, eleições 2026, STF
- negocios-brasil: empresas BR — resultados, fusões, B3, IPOs, setorial
- irrelevante: crime, esportes, acidentes, clima, impostos PF, moda, saúde individual, curiosidades

Para cada notícia retorne:
- "category": uma das categorias acima
- "summary": 1-2 frases em português com os números/dados essenciais (vazio se irrelevante)

Retorne APENAS um JSON válido no formato: {"items":[{"id":"...","category":"...","summary":"..."}]}`

async function enrichWithGroq(items: NewsItem[]): Promise<NewsItem[]> {
  const payload = items.map(n => ({ id: n.id, title: n.title, description: n.description }))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens:  2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: GROQ_SYSTEM },
        { role: 'user',   content: `Notícias:\n${JSON.stringify(payload)}` },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
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

  const batch = raw.slice(0, 30)

  try {
    const enriched = await enrichWithGroq(batch)
    return NextResponse.json(enriched)
  } catch {
    // Groq failed — return keyword-categorized items without summaries
    return NextResponse.json(batch)
  }
}
