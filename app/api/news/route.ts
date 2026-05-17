import { NextResponse } from 'next/server'
import { fetchAllNews, type NewsItem, type NewsCategory } from '@/lib/rss'

export const revalidate = 900

type AiCategory = NewsCategory | 'irrelevante'
interface AiResult { id: string; category: AiCategory; summary: string }

const CLASSIFIER_SYSTEM = `Você é um classificador de notícias para um dashboard macroeconômico. Existem 6 categorias + irrelevante.

══ REGRA FUNDAMENTAL ══
A categoria é definida pelo ASSUNTO CENTRAL da notícia — não pela fonte, não pelo país de publicação.

══════════════════════════════════════════════
MACRO BRASIL — economia brasileira, indicadores e política econômica do Brasil
══════════════════════════════════════════════
SUJEITO: indicador econômico, dado, ou decisão de política econômica DO BRASIL.

✓ IPCA, IGP-M, IPC-Fipe, núcleos de inflação — valores mensais ou acumulados
✓ Selic, Copom, Banco Central do Brasil — decisões, comunicados, atas
✓ PIB, IBC-Br, produção industrial, varejo (PMC), serviços (PMS)
✓ CAGED, PNAD, taxa de desemprego, rendimento médio
✓ Câmbio BRL especificamente — intervenção BCB, reservas internacionais
✓ Dívida pública, déficit/superávit primário, arcabouço fiscal, LOA/LDO
✓ Balança comercial, exportações BR, importações BR
✓ Ministério da Fazenda, STN, Receita Federal — anúncios de política econômica
✓ Congresso aprovando/rejeitando reforma ECONÔMICA específica (tributária, trabalhista, previdenciária)

✗ NUNCA: notícias de petróleo/commodities (→ macro-global)
✗ NUNCA: declarações políticas gerais sem dado econômico (→ politica-brasil)
✗ NUNCA: sujeito externo "afeta o Brasil" (→ macro-global ou geopolitica)

══════════════════════════════════════════════
MACRO GLOBAL — economia mundial, outros países, commodities, mercados globais
══════════════════════════════════════════════
SUJEITO: dado ou decisão econômica de outro país, ou mercado/commodity global.

✓ Fed, BCE, BoJ, BoE — decisões de juros, dot plot, Powell, Lagarde
✓ Inflação, PIB, emprego, PMI, CPI de EUA/Europa/China/qualquer outro país
✓ Petróleo (Brent, WTI, OPEP) — SEMPRE macro-global, mesmo em site brasileiro
✓ Minério de ferro, cobre, soja, milho, café, ouro — preços de commodities
✓ Dow Jones, S&P 500, Nasdaq, mercados futuros, VIX — bolsas internacionais
✓ Dólar (DXY), euro, iene — câmbio internacional
✓ Tarifas Trump, guerra comercial EUA-China, OMC, acordos de livre comércio
✓ Bitcoin, criptomoedas

✗ NUNCA: conflitos militares, guerras, eleições (→ geopolitica)
✗ NUNCA: política interna de outro país sem dado econômico (→ geopolitica)

══════════════════════════════════════════════
GEOPOLÍTICA — conflitos, guerras, diplomacia, eleições globais
══════════════════════════════════════════════
SUJEITO: segurança, conflito armado, diplomacia, ou política externa internacional.

✓ Guerras, conflitos armados — Ucrânia, Rússia, Gaza, Oriente Médio, qualquer
✓ Tensões militares, ataques, escaramuças (EUA-Irã, China-Taiwan, qualquer)
✓ Eleições em qualquer país fora do Brasil (EUA, França, Alemanha, etc.)
✓ Líderes: Zelensky, Putin, Trump EM CONTEXTO POLÍTICO/MILITAR (não econômico)
✓ Diplomacia: visitas, tratados, sanções internacionais, OTAN, ONU
✓ Refugiados, crises humanitárias, acordos de paz

✗ NUNCA: política interna brasileira (→ politica-brasil)
✗ NUNCA: dados econômicos de outros países (→ macro-global)
✗ NUNCA: Trump anunciando tarifas = econômico (→ macro-global)

══════════════════════════════════════════════
POLÍTICA BRASIL — política interna brasileira (sem conteúdo econômico direto)
══════════════════════════════════════════════
SUJEITO: política, judiciário ou governo brasileiro, sem ser sobre dados/política econômica.

✓ Lula: discursos, agenda presidencial, viagens, declarações não-econômicas
✓ Nomeações e exonerações de ministros (qualquer pasta)
✓ STF, STJ, TCU, PGR, AGU — julgamentos, decisões judiciais, investigações
✓ Congresso (Câmara/Senado) debatendo pautas NÃO econômicas: segurança, educação, saúde, meio ambiente
✓ Partidos políticos, eleições municipais/estaduais, convenções
✓ Escândalos, CPIs, operações policiais, Polícia Federal
✓ Programas sociais (Bolsa Família, Minha Casa) como política social
✓ Relações Executivo-Legislativo sem matéria econômica em votação

✗ NUNCA: quando o tema é um dado ou meta econômica (→ macro-brasil)
✗ NUNCA: quando a Fazenda anuncia política fiscal (→ macro-brasil)

══════════════════════════════════════════════
NEGÓCIOS BRASIL — empresas brasileiras: estratégia e operações (SEM resultado financeiro)
══════════════════════════════════════════════
SUJEITO: empresa ou setor brasileiro em movimento estratégico ou operacional.

✓ Fusões e aquisições anunciadas (deal anunciado, não resultado)
✓ Planos de expansão, novas fábricas, fechamento de plantas
✓ Contratos assinados, parcerias, joint ventures
✓ Lançamento de produtos ou serviços, abertura de filiais
✓ Mudanças de liderança: novo CEO, diretores, conselho
✓ IPO ou follow-on anunciados (não resultado)
✓ Aprovações regulatórias: Anatel, Anvisa, CADE, ANP — licenças, multas
✓ Demissões em massa, greves, reestruturações

✗ NUNCA: lucro, receita, EBITDA, resultado trimestral (→ resultados)
✗ NUNCA: dividendos ou JCP declarados (→ resultados)
✗ NUNCA: empresas estrangeiras sem operação no Brasil (→ macro-global)

══════════════════════════════════════════════
RESULTADOS — dados financeiros quantificados de empresas específicas
══════════════════════════════════════════════
SUJEITO: resultado financeiro numérico de uma empresa.

✓ Lucro líquido, prejuízo (qualquer valor, qualquer empresa)
✓ Receita, EBITDA, ROE, NIM, resultado operacional
✓ Dividendos declarados, JCP, payout ratio
✓ Guidance (projeções de receita/lucro da própria empresa)
✓ Resultados trimestrais: 1T, 2T, 3T, 4T — qualquer empresa

✗ NUNCA: plano estratégico sem números de resultado (→ negocios-brasil)

══════════════════════════════════════════════
IRRELEVANTE — descartar
══════════════════════════════════════════════
✓ Esportes, entretenimento, celebridades, cinema
✓ Saúde, medicina, ciência (sem impacto econômico direto)
✓ Quiz, clickbait: "X em cada Y pessoas", "você consegue", "só os gênios"
✓ Gastronomia, turismo, moda, lifestyle
✓ Cultura, religião, obituários, educação

══════════════════════════════════════════════
EXEMPLOS — decisivos para calibrar o modelo
══════════════════════════════════════════════

macro-brasil:
"IPCA de abril fica em 0,48%, acima do esperado" → macro-brasil
"Copom decide manter Selic em 13,75%" → macro-brasil
"Câmara aprova reforma tributária com IVA dual" → macro-brasil
"Governo revê meta fiscal para 2025 após revisão do PIB" → macro-brasil
"BCB intervém no câmbio com venda de US$ 2 bi" → macro-brasil
"CAGED cria 250 mil vagas em março" → macro-brasil

macro-global:
"Petróleo Brent cai 2% com dados de estoques nos EUA" → macro-global
"Fed mantém juros em 4,5%" → macro-global
"Trump anuncia tarifa de 25% sobre importações do México" → macro-global
"Dow Jones fecha em alta com resultados das Big Techs" → macro-global
"China anuncia PIB de 5,2% no 1T25" → macro-global
"OPEP+ reduz produção em 500 mil barris" → macro-global
"Minério de ferro sobe 3% em Singapura" → macro-global
"Bitcoin supera US$ 90 mil pela primeira vez" → macro-global

geopolitica:
"Zelensky pede mais apoio militar à Europa" → geopolitica
"Israel e Hamas chegam a cessar-fogo em Gaza" → geopolitica
"Trump vence eleição americana — vitória histórica" → geopolitica
"Tensões no Estreito de Taiwan preocupam OTAN" → geopolitica
"Putin anuncia mobilização parcial" → geopolitica

politica-brasil:
"Lula assina decreto ambiental no Dia da Terra" → politica-brasil
"STF retoma julgamento de emendas parlamentares" → politica-brasil
"Congresso debate PEC da segurança pública" → politica-brasil
"Ministro de Minas e Energia é substituído" → politica-brasil
"Lula e Lira discutem composição de comissões" → politica-brasil
"PGR abre inquérito contra senador por corrupção" → politica-brasil

negocios-brasil:
"Petrobras anuncia plano de investimentos de US$ 111 bi para 2025-2029" → negocios-brasil
"Embraer fecha contrato para fornecer 40 jatos à Air France" → negocios-brasil
"Ambev anuncia aquisição de cervejaria artesanal por R$ 500 mi" → negocios-brasil
"Vale inicia operações em nova mina no Pará" → negocios-brasil
"Nubank nomeia novo CFO após saída de diretor" → negocios-brasil

resultados:
"Petrobras reporta lucro de R$ 40 bi no 4T24" → resultados
"Itaú anuncia JCP de R$ 0,85 por ação" → resultados
"Magazine Luiza registra prejuízo de R$ 200 mi" → resultados
"Nubank divulga receita de US$ 2,3 bi no trimestre" → resultados

irrelevante:
"7 a cada 10 pessoas não conseguem resolver essa conta" → irrelevante
"Flamengo vence Palmeiras no Maracanã" → irrelevante
"Cientista descobre nova espécie na Amazônia" → irrelevante

══ FORMATO DE SAÍDA ══
Para cada notícia:
- "category": exatamente uma das 7 opções: macro-brasil, macro-global, geopolitica, politica-brasil, negocios-brasil, resultados, irrelevante
- "summary": 2-3 frases em português com dados, números e impactos (vazio se irrelevante)

Retorne APENAS JSON válido: {"items":[{"id":"...","category":"...","summary":"..."}]}`

async function enrichWithAI(items: NewsItem[]): Promise<NewsItem[]> {
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
        { role: 'system', content: CLASSIFIER_SYSTEM },
        { role: 'user',   content: `Classifique e resuma as notícias abaixo:\n${JSON.stringify(payload)}` },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!res.ok) throw new Error(`Gemini ${res.status}`)

  const json   = await res.json()
  const text   = json.choices?.[0]?.message?.content ?? ''
  const parsed = JSON.parse(text) as { items: AiResult[] }
  const byId   = new Map(parsed.items.map((r: AiResult) => [r.id, r]))

  return items
    .map(n => {
      const ai = byId.get(n.id)
      if (!ai || ai.category === 'irrelevante') return null
      return { ...n, category: ai.category as NewsCategory, summary: ai.summary ?? '' }
    })
    .filter((n): n is NewsItem => n !== null)
}

// Keywords para filtrar fallback quando IA falha — aceita notícia br genérica só se for claramente econômica
const ECON_KW = [
  'ipca', 'selic', 'pib', 'inflação', 'copom', 'banco central', 'caged', 'pnad',
  'fiscal', 'câmbio', 'dólar', 'juros', 'taxa', 'mercado', 'bolsa', 'ação ',
  'resultado', 'lucro', 'receita', 'dividendo', 'exportação', 'importação',
  'balança comercial', 'petróleo', 'commodit', 'brent', 'fed ', 'federal reserve',
  'juro', 'emprego', 'desemprego', 'rendimento', 'salário', 'recessão',
]

function hasEconKeyword(title: string, desc: string): boolean {
  const t = (title + ' ' + desc).toLowerCase()
  return ECON_KW.some(k => t.includes(k))
}

export async function GET() {
  let raw: NewsItem[] = []
  try {
    raw = await fetchAllNews()
  } catch {
    return NextResponse.json([])
  }

  const batch = raw.slice(0, 40)

  try {
    const enriched = await enrichWithAI(batch)
    return NextResponse.json(enriched)
  } catch {
    // IA falhou — retorna fallback com defaultCategory, mas filtra fontes genéricas brasileiras
    // (geopolitica / macro-global / resultados passam direto; macro-brasil só se tiver conteúdo econômico)
    const fallback = batch.filter(n =>
      n.category !== 'macro-brasil' || hasEconKeyword(n.title, n.description)
    )
    return NextResponse.json(fallback)
  }
}
