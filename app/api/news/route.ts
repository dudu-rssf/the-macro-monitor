import { NextResponse } from 'next/server'
import { fetchAllNews, type NewsItem, type NewsCategory } from '@/lib/rss'

export const revalidate = 900

type GroqCategory = NewsCategory | 'irrelevante'
interface GroqResult { id: string; category: GroqCategory; summary: string }

const GROQ_SYSTEM = `Você é um classificador rigoroso de notícias para um dashboard macroeconômico brasileiro.

══ REGRA DE OURO (leia primeiro) ══
Se a notícia NÃO contém um dado econômico, financeiro, político-econômico ou geopolítico CLARO E DIRETO, classifique como IRRELEVANTE. Em caso de dúvida, sempre escolha irrelevante. É melhor descartar uma notícia borderline do que poluir o feed com conteúdo irrelevante.

══ CATEGORIAS ══

irrelevante — DESCARTAR. Qualquer notícia que não tenha impacto econômico ou geopolítico claro:
  ✓ Ciência, pesquisa acadêmica, geologia, arqueologia, astronomia, biologia, medicina
  ✓ Esportes, futebol, tênis, olimpíadas, fórmula 1, qualquer competição
  ✓ Entretenimento, cinema, séries, música, celebridades, influenciadores
  ✓ Crime comum, violência, polícia, segurança pública sem impacto econômico
  ✓ Clima, tempo, catástrofes naturais (exceto se causar impacto econômico mensurável e explícito)
  ✓ Lifestyle, saúde, medicina, dieta, bem-estar, gastronomia, turismo, moda
  ✓ Educação, ENEM, concursos públicos, universidades
  ✓ Imposto de renda PF, FGTS, benefícios individuais sem impacto macro
  ✓ Obituários, datas comemorativas, eventos culturais, religião
  ✓ Tecnologia sem impacto econômico (novo celular, rede social, app)
  ✓ Fauna, flora, meio ambiente sem dado econômico (ex: nova espécie descoberta)

macro-brasil — economia brasileira com dado explícito:
  ✓ Indicadores: IPCA, IGP-M, PIB, IBC-Br, CAGED, PNAD, Selic, câmbio BRL
  ✓ Política monetária e fiscal: BCB, dívida pública, déficit, reforma tributária
  ✓ Setor externo: balança comercial, exportações, reservas internacionais
  ✓ Produção de commodities com impacto macro (petróleo, soja, minério)
  ✗ NÃO inclui: política sem dado econômico, notícias de outros países, resultados de empresas

resultados — dados financeiros de empresas específicas:
  ✓ Lucro, prejuízo, EBITDA, receita líquida (ex: "Itaú lucra R$ 10 bi")
  ✓ Dividendos, JCP, proventos
  ✓ IPO, follow-on, emissão de debêntures, M&A
  ✓ Guidance e metas de empresas

macro-global — economia internacional com dado explícito:
  ✓ Bancos centrais (Fed, BCE, BoJ): decisões de juros, QE, política monetária
  ✓ Dados econômicos: inflação, PIB, emprego nos EUA/Europa/China
  ✓ Commodities: preço do petróleo, OPEP, minério, grãos
  ✓ Comércio: tarifas, sanções econômicas, acordos comerciais
  ✗ NÃO inclui: conflitos, eleições, diplomacia sem dado econômico

geopolitica — eventos políticos e geopolíticos relevantes:
  ✓ Guerras, conflitos armados, tensões militares
  ✓ Eleições, golpes, transições de governo
  ✓ Diplomacia, sanções políticas
  ✓ Política interna brasileira: Congresso, STF, partidos

══ EXEMPLOS — IRRELEVANTE (atenção especial) ══
"Cientista espanhol estuda crosta e descobre que Península Ibérica afundou" → irrelevante (geologia)
"Pesquisa revela que brasileiros dormem menos que a média global" → irrelevante (saúde)
"Nova espécie de ave descoberta na Amazônia" → irrelevante (biologia)
"Astro da NBA assina contrato milionário" → irrelevante (esporte)
"Festival de Cannes anuncia premiados" → irrelevante (entretenimento)
"Terremoto de magnitude 4 atinge região" → irrelevante (sem dado econômico)
"Governo lança app de serviços digitais" → irrelevante (tecnologia sem impacto macro)

══ EXEMPLOS — CATEGORIAS VÁLIDAS ══
"Petrobras reporta lucro de R$ 40 bi no 4T24" → resultados
"Itaú anuncia dividendos de R$ 0,85 por ação" → resultados
"Petrobras eleva produção de petróleo em 8%" → macro-brasil
"Fed mantém juros em 4,5%" → macro-global
"Países do Golfo aumentam produção de petróleo" → macro-global
"Tensões no Golfo Pérsico ameaçam rotas" → geopolitica
"Reino Unido eleva juros em 0,25 ponto" → macro-global
"Eleições no Reino Unido: trabalhistas vencem" → geopolitica
"Lula sanciona reforma tributária" → macro-brasil
"Trump impõe tarifa de 25% sobre aço" → macro-global

══ FORMATO DE SAÍDA ══
Para cada notícia:
- "category": exatamente uma das 5 opções acima
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
