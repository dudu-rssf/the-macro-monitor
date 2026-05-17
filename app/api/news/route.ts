import { NextResponse } from 'next/server'
import { fetchAllNews, type NewsItem, type NewsCategory } from '@/lib/rss'

export const revalidate = 900

type GroqCategory = NewsCategory | 'irrelevante'
interface GroqResult { id: string; category: GroqCategory; summary: string }

const GROQ_SYSTEM = `Você é um classificador rigoroso de notícias para um dashboard macroeconômico. Existem 4 categorias + irrelevante.

══ REGRA FUNDAMENTAL ══
A categoria é definida pelo SUJEITO PRINCIPAL da notícia — não pela fonte, não por qual país a publicou.
Uma notícia sobre petróleo, Dow Jones ou Zelensky publicada por um site brasileiro continua sendo macro-global ou geopolítica.

══ DEFINIÇÕES ══

macro-brasil — o SUJEITO da notícia é a economia BRASILEIRA:
  O assunto central é um indicador, instituição ou política do Brasil.
  ✓ Indicadores BR: IPCA, IGP-M, PIB, IBC-Br, CAGED, PNAD, câmbio BRL, Selic
  ✓ Política monetária BR: BCB, Copom, Galípolo, comunicados do BCB
  ✓ Fiscal BR: dívida pública, déficit primário, arcabouço fiscal, tesouro nacional
  ✓ Setor externo BR: balança comercial brasileira, exportações BR, reservas internacionais BR
  ✓ Congresso BR discutindo política econômica, BCB ou sistema financeiro: CAE, Comissão de Finanças
  ✗ NUNCA: notícias sobre petróleo (preço global), bolsas internacionais, líderes estrangeiros
  ✗ NUNCA: "X afeta o Brasil" — se o sujeito é externo, é macro-global ou geopolítica

macro-global — o SUJEITO é a economia de outro país ou do mundo:
  ✓ Bancos centrais: Fed, BCE, BoJ, BoE — decisões de juros, política monetária
  ✓ Dados econômicos: inflação, PIB, emprego nos EUA/Europa/China/etc.
  ✓ Commodities: preço do petróleo (Brent, WTI), OPEP, minério de ferro, grãos, ouro
  ✓ Bolsas e mercados globais: Dow Jones, S&P 500, Nasdaq, mercados futuros
  ✓ Comércio global: tarifas Trump, guerra comercial EUA-China, OMC
  ✓ Dólar índice DXY, criptomoedas com impacto sistêmico
  ✗ NUNCA: conflitos militares, eleições, tensões políticas sem dado econômico (→ geopolitica)

geopolitica — eventos políticos, diplomáticos e de segurança:
  ✓ Guerras, conflitos armados, tensões militares (Ucrânia, Irã, Oriente Médio)
  ✓ Eleições (qualquer país), transições de governo, golpes
  ✓ Diplomacia, sanções políticas, acordos de segurança
  ✓ Política interna BR sem impacto econômico direto: STF, partidos, escândalos, CPI
  ✓ Líderes mundiais (Zelensky, Putin, Trump político — não econômico)
  ✓ Tensão EUA-Irã, conflito no Oriente Médio, guerra na Ucrânia

resultados — dados financeiros de empresas específicas:
  ✓ Lucro, prejuízo, EBITDA, receita de uma empresa
  ✓ Dividendos, JCP, IPO, M&A, guidance corporativo

irrelevante — descartar:
  ✓ Esportes, entretenimento, celebridades, cinema
  ✓ Ciência, medicina, saúde, clima sem impacto econômico
  ✓ Quiz, clickbait, conteúdo viral ("X em cada Y pessoas...")
  ✓ Lifestyle, gastronomia, moda, turismo
  ✓ Obituários, cultura, religião, educação

══ EXEMPLOS OBRIGATÓRIOS — leia com atenção ══

MACRO-BRASIL (sujeito = Brasil):
"BCB sobe Selic em 0,5 ponto para 13,75%" → macro-brasil
"IPCA de abril fica em 0,48%, acima do esperado" → macro-brasil
"Balança comercial brasileira registra superávit de US$ 9 bi" → macro-brasil
"CAE confirma audiência com Galípolo sobre Fundo Master" → macro-brasil
"Câmara vota reforma tributária com IVA unificado" → macro-brasil

MACRO-GLOBAL (sujeito = economia global/exterior):
"Petróleo abre semana com maior volume por causa do Trump" → macro-global
"Brent cai 1,10% com tensões entre EUA e Irã" → macro-global
"Dow Jones futuro cai com incerteza geopolítica" → macro-global
"Fed mantém juros em 4,5%" → macro-global
"Trump impõe tarifa de 25% sobre aço" → macro-global
"OPEP reduz produção em 500 mil barris/dia" → macro-global

GEOPOLÍTICA (sujeito = política/segurança):
"Zelensky visita Washington e pede mais armas" → geopolitica
"Tensões entre EUA e Irã aumentam no Estreito de Ormuz" → geopolitica
"Eleições na França: Marine Le Pen lidera pesquisas" → geopolitica
"Lula e Lira discutem composição de ministérios" → geopolitica
"STF retoma julgamento sobre emendas parlamentares" → geopolitica

RESULTADOS:
"Petrobras reporta lucro de R$ 40 bi no 4T24" → resultados
"Itaú anuncia dividendos de R$ 0,85 por ação" → resultados

IRRELEVANTE:
"7 a cada 10 pessoas não conseguem fazer essa conta" → irrelevante
"Cientista espanhol estuda crosta da Península Ibérica" → irrelevante
"Flamengo vence Palmeiras no Maracanã" → irrelevante

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
