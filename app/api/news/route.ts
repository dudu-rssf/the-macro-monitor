import { NextResponse } from 'next/server'
import { fetchAllNews, type NewsItem, type NewsCategory } from '@/lib/rss'

export const revalidate = 900

type GroqCategory = NewsCategory | 'irrelevante'
interface GroqResult { id: string; category: GroqCategory; summary: string }

const GROQ_SYSTEM = `Você é um classificador rigoroso de notícias para um dashboard macroeconômico brasileiro. Existem APENAS 3 categorias válidas + irrelevante.

══ DEFINIÇÕES PRECISAS ══

macro-brasil — notícias cujo assunto PRINCIPAL é a economia brasileira:
  ✓ Indicadores: IPCA, IGP-M, INPC, PIB, IBC-Br, CAGED, PNAD, Caged, desemprego BR
  ✓ Política econômica BR: Selic, BCB, juros, câmbio BRL, crédito, spread bancário
  ✓ Fiscal BR: dívida pública, deficit primário, reforma tributária com impacto macro
  ✓ Setor externo BR: balança comercial, exportações, importações, reservas
  ✓ Empresas quando o impacto é macroeconômico (ex: Petrobras eleva produção de petróleo, Vale bate recorde de exportação)
  ✗ NÃO inclui: política partidária, eleições, STF sem impacto econômico direto
  ✗ NÃO inclui: notícias de outros países mesmo que sobre economia

macro-global — notícias cujo assunto PRINCIPAL é a economia de outros países ou global:
  ✓ Bancos centrais: Fed, BCE, BoJ, BoE e suas decisões de juros/política monetária
  ✓ Dados econômicos: inflação EUA/Europa/China, PIB, emprego nos EUA
  ✓ Commodities: petróleo (preço, produção OPEP), minério de ferro, soja, milho, cobre
  ✓ Comércio global: tarifas, guerra comercial EUA-China, OMC com impacto em preços
  ✓ Mercados globais: dólar índice DXY, bolsas globais, risco sistêmico, crise bancária
  ✗ NÃO inclui: conflitos militares, eleições, diplomacia sem dado econômico explícito
  ✗ NÃO inclui: notícias do Reino Unido, Golfo Pérsico, etc. sem dado econômico mensurável

geopolitica — tudo o mais que seja relevante geopoliticamente:
  ✓ Conflitos militares, guerras, tensões entre países
  ✓ Eleições (qualquer país), transições de governo, golpes
  ✓ Diplomacia, sanções políticas, acordos de segurança
  ✓ Política interna brasileira: Congresso, STF, partidos, escândalos sem impacto macro direto
  ✓ Notícias de países (Reino Unido, Golfo Pérsico, etc.) sem dado econômico claro

irrelevante — descartar completamente:
  ✓ Esportes, futebol, entretenimento, celebridades, cinema, séries
  ✓ Crime comum, acidentes, polícia
  ✓ Saúde pessoal, medicina, clima/tempo
  ✓ Lifestyle, moda, gastronomia, turismo
  ✓ Concursos públicos, ENEM, educação
  ✓ Imposto de renda pessoa física, FGTS pessoa física
  ✓ Obituários, aniversários, eventos culturais

══ EXEMPLOS CRÍTICOS ══
"Reino Unido eleva juros em 0,25 ponto" → macro-global (dado econômico explícito)
"Eleições no Reino Unido: trabalhistas vencem" → geopolitica
"Países do Golfo aumentam produção de petróleo" → macro-global (commodity)
"Tensões no Golfo Pérsico ameaçam rotas marítimas" → geopolitica (sem dado econômico)
"Petrobras anuncia lucro de R$ 40 bilhões" → macro-brasil
"Lula sanciona reforma tributária" → macro-brasil (impacto econômico direto)
"Lula e Lira discutem composição do Congresso" → geopolitica
"Fed mantém juros em 4,5%" → macro-global
"Trump impõe tarifa de 25% sobre aço" → macro-global

══ FORMATO DE SAÍDA ══
Para cada notícia:
- "category": exatamente uma das 4 opções acima
- "summary": 2-3 frases em português com dados, números e impactos concretos (vazio se irrelevante)

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
      temperature:     0.0,
      max_tokens:      6000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: GROQ_SYSTEM },
        { role: 'user',   content: `Classifique e resuma as notícias abaixo:\n${JSON.stringify(payload)}` },
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
