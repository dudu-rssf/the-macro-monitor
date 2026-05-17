import { NextResponse } from 'next/server'
import { fetchAllNews, type NewsItem, type NewsCategory } from '@/lib/rss'

export const revalidate = 900

type GroqCategory = NewsCategory | 'irrelevante'
interface GroqResult { id: string; category: GroqCategory; summary: string }

const GROQ_SYSTEM = `Você é um classificador rigoroso de notícias para um dashboard macroeconômico brasileiro.

══ REGRA DE OURO (leia primeiro) ══
Se a notícia NÃO contém um dado econômico, financeiro, político-econômico ou geopolítico CLARO E DIRETO, classifique como IRRELEVANTE. Em caso de dúvida, sempre escolha irrelevante. É melhor descartar uma notícia borderline do que poluir o feed com conteúdo irrelevante.

══ CATEGORIAS ══

irrelevante — DESCARTAR. Qualquer notícia sem impacto econômico ou geopolítico claro:
  ✓ Ciência, pesquisa acadêmica, geologia, arqueologia, astronomia, biologia, medicina
  ✓ Esportes, futebol, tênis, olimpíadas, fórmula 1, qualquer competição
  ✓ Entretenimento, cinema, séries, música, celebridades, influenciadores
  ✓ Crime comum, violência, polícia, segurança pública sem impacto econômico
  ✓ Clima, tempo, catástrofes naturais sem dado econômico explícito
  ✓ Lifestyle, saúde, medicina, dieta, bem-estar, gastronomia, turismo, moda
  ✓ Educação, ENEM, concursos públicos, universidades
  ✓ Obituários, datas comemorativas, eventos culturais, religião
  ✓ Tecnologia sem impacto econômico (novo celular, rede social, app)
  ✓ Quiz, desafio, curiosidade, conteúdo viral ("X em cada Y pessoas não conseguem...", "Teste se você sabe...", "Só os gênios...")
  ✓ Listas de dicas pessoais, tutoriais, "como fazer"

macro-brasil — economia brasileira com conteúdo econômico direto:
  ✓ Indicadores: IPCA, IGP-M, PIB, IBC-Br, CAGED, PNAD, Selic, câmbio BRL
  ✓ Política monetária: BCB, Copom, Galípolo, decisões de juros, comunicados
  ✓ Fiscal: dívida pública, resultado primário, arcabouço fiscal, reforma tributária
  ✓ Setor externo: balança comercial, exportações, reservas internacionais
  ✓ ATENÇÃO: audiências e reuniões do Congresso SOBRE política econômica, sistema financeiro ou BCB → macro-brasil (não geopolítica!)
  ✓ Ex.: CAE, CMO, Comissão de Finanças discutindo Selic, crédito, regulação bancária → macro-brasil
  ✗ NÃO inclui: resultados de empresas, notícias de outros países

resultados — dados financeiros de empresas específicas:
  ✓ Lucro, prejuízo, EBITDA, receita líquida (ex: "Itaú lucra R$ 10 bi")
  ✓ Dividendos, JCP, proventos, IPO, M&A, guidance

macro-global — economia internacional com dado explícito:
  ✓ Bancos centrais (Fed, BCE, BoJ): decisões de juros, política monetária
  ✓ Dados econômicos: inflação, PIB, emprego nos EUA/Europa/China
  ✓ Commodities: preço do petróleo, OPEP, minério, grãos
  ✓ Comércio: tarifas, sanções econômicas, acordos comerciais
  ✗ NÃO inclui: conflitos, eleições, diplomacia sem dado econômico

geopolitica — eventos políticos e geopolíticos:
  ✓ Guerras, conflitos armados, tensões militares
  ✓ Eleições, golpes, transições de governo
  ✓ Diplomacia, sanções políticas
  ✓ Política interna brasileira SEM impacto econômico direto: escândalos, partidos, ética
  ✗ NÃO inclui: Congresso discutindo política econômica, BCB, sistema financeiro (→ macro-brasil)

══ EXEMPLOS — IRRELEVANTE ══
"7 a cada 10 pessoas não conseguem fazer essa conta de matemática" → irrelevante (quiz viral)
"Descubra se você tem QI acima da média resolvendo esse desafio" → irrelevante (clickbait)
"Cientista espanhol estuda crosta e descobre que Península Ibérica afundou" → irrelevante (geologia)
"Pesquisa revela que brasileiros dormem menos que a média global" → irrelevante (saúde)
"Astro da NBA assina contrato milionário" → irrelevante (esporte)
"Festival de Cannes anuncia premiados" → irrelevante (entretenimento)

══ EXEMPLOS — A DISTINÇÃO CRÍTICA: CONGRESSO ECONÔMICO vs POLÍTICO ══
"CAE confirma audiência com Galípolo sobre Fundo Master" → macro-brasil (BCB/regulação financeira)
"Senado aprova regulamentação do mercado de capitais" → macro-brasil (regulação financeira)
"Câmara vota reforma tributária — IVA unificado" → macro-brasil (impacto econômico direto)
"Lula e Lira discutem composição de ministérios" → geopolitica (política partidária)
"STF julga ação sobre emendas parlamentares" → geopolitica (sem impacto econômico direto)
"CPI do MST: depoimento de ministro" → geopolitica (político, sem dado macro)

══ EXEMPLOS — CATEGORIAS VÁLIDAS ══
"Petrobras reporta lucro de R$ 40 bi no 4T24" → resultados
"Itaú anuncia dividendos de R$ 0,85 por ação" → resultados
"Petrobras eleva produção de petróleo em 8%" → macro-brasil
"BCB sobe Selic em 0,5 ponto para 13,75%" → macro-brasil
"Fed mantém juros em 4,5%" → macro-global
"Trump impõe tarifa de 25% sobre aço" → macro-global
"Tensões no Golfo Pérsico ameaçam rotas" → geopolitica
"Eleições no Reino Unido: trabalhistas vencem" → geopolitica

══ FORMATO DE SAÍDA ══
Para cada notícia:
- "category": exatamente uma das 5 opções acima
- "summary": 2-3 frases em português com dados, números e impactos concretos (vazio se irrelevante)

Retorne APENAS JSON válido: {"items":[{"id":"...","category":"...","summary":"..."}]}`

async function enrichWithGroq(items: NewsItem[]): Promise<NewsItem[]> {
  const payload = items.map(n => ({ id: n.id, title: n.title, description: n.description }))

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'gemini-2.0-flash',
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

  if (!res.ok) throw new Error(`Gemini ${res.status}`)

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
