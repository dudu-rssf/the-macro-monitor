export type NewsCategory =
  | 'macro-brasil'
  | 'macro-global'
  | 'geopolitica'
  | 'resultados'

export interface NewsItem {
  id:          string
  title:       string
  url:         string
  description: string
  publishedAt: string
  source:      string
  category:    NewsCategory
  summary:     string
}

const FEEDS: { url: string; source: string; defaultCategory: NewsCategory }[] = [
  // ── Macro Brasil / Negócios BR (Groq vai refinar) ─────────────────────────
  { url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',          source: 'Agência Brasil',     defaultCategory: 'macro-brasil' },
  { url: 'https://g1.globo.com/rss/g1/economia/',                            source: 'G1 Economia',        defaultCategory: 'macro-brasil' },
  { url: 'https://www.cnnbrasil.com.br/economia/feed/',                      source: 'CNN Brasil',         defaultCategory: 'macro-brasil' },
  { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',                source: 'Folha Mercado',      defaultCategory: 'macro-brasil' },
  { url: 'https://www.estadao.com.br/economia/feed/',                        source: 'Estadão Economia',   defaultCategory: 'macro-brasil' },
  { url: 'https://www.correiobraziliense.com.br/economia/feed/',             source: 'Correio Econ.',      defaultCategory: 'macro-brasil' },
  { url: 'https://www.metropoles.com/economia/feed/',                        source: 'Metrópoles Econ.',   defaultCategory: 'macro-brasil' },
  { url: 'https://oglobo.globo.com/economia/rss.xml',                        source: 'O Globo Economia',   defaultCategory: 'macro-brasil' },
  { url: 'https://www.infomoney.com.br/feed/',                               source: 'InfoMoney',          defaultCategory: 'macro-brasil' },
  { url: 'https://exame.com/feed/',                                          source: 'Exame',              defaultCategory: 'macro-brasil' },
  { url: 'https://istoedinheiro.com.br/feed/',                               source: 'IstoÉ Dinheiro',     defaultCategory: 'macro-brasil' },
  { url: 'https://moneytimes.com.br/feed/',                                  source: 'Money Times',        defaultCategory: 'macro-brasil' },
  { url: 'https://braziljournal.com/feed/',                                  source: 'Brazil Journal',     defaultCategory: 'macro-brasil' },
  { url: 'https://neofeed.com.br/feed/',                                     source: 'NeoFeed',            defaultCategory: 'macro-brasil' },
  { url: 'https://www.suno.com.br/noticias/feed/',                           source: 'Suno Notícias',      defaultCategory: 'macro-brasil' },
  { url: 'https://capitalaberto.com.br/feed/',                               source: 'Capital Aberto',     defaultCategory: 'macro-brasil' },
  { url: 'https://br.investing.com/rss/news_25.rss',                         source: 'Investing.com BR',   defaultCategory: 'macro-brasil' },
  { url: 'https://www.seudinheiro.com/feed/',                                source: 'Seu Dinheiro',       defaultCategory: 'macro-brasil' },
  { url: 'https://veja.abril.com.br/feed/',                                  source: 'Veja',               defaultCategory: 'macro-brasil' },
  { url: 'https://www.cartacapital.com.br/feed/',                            source: 'CartaCapital',       defaultCategory: 'macro-brasil' },
  { url: 'https://www.nexojornal.com.br/feed',                               source: 'Nexo Jornal',        defaultCategory: 'macro-brasil' },
  { url: 'https://oantagonista.com.br/feed/',                                source: 'O Antagonista',      defaultCategory: 'macro-brasil' },
  { url: 'https://moneyreport.com.br/feed/',                                 source: 'Money Report',       defaultCategory: 'macro-brasil' },
  { url: 'https://www.levante.com.br/feed/',                                 source: 'Levante',            defaultCategory: 'macro-brasil' },
  { url: 'https://www.sunoresearch.com.br/noticias/feed/',                   source: 'Suno Research',      defaultCategory: 'macro-brasil' },

  // ── Resultados de empresas (Groq vai classificar) ──────────────────────────
  { url: 'https://ri.com.br/feed/',                                          source: 'RI.com.br',          defaultCategory: 'resultados'   },
  { url: 'https://www.mzgroup.com.br/news/feed/',                            source: 'MZ Group',           defaultCategory: 'resultados'   },
  { url: 'https://www.primorico.com.br/feed/',                               source: 'Primo Rico',         defaultCategory: 'resultados'   },

  // ── Política BR (Groq vai classificar como geopolítica) ───────────────────
  { url: 'https://www.poder360.com.br/feed/',                                source: 'Poder360',           defaultCategory: 'geopolitica'  },
  { url: 'https://congressoemfoco.uol.com.br/feed/',                         source: 'Congresso em Foco',  defaultCategory: 'geopolitica'  },
  { url: 'https://feeds.folha.uol.com.br/poder/rss091.xml',                  source: 'Folha Poder',        defaultCategory: 'geopolitica'  },

  // ── Macro Global ──────────────────────────────────────────────────────────
  { url: 'https://feeds.reuters.com/reuters/BRTopNews',                      source: 'Reuters Brasil',     defaultCategory: 'macro-global' },
  { url: 'https://feeds.reuters.com/reuters/businessNews',                   source: 'Reuters Business',   defaultCategory: 'macro-global' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',                   source: 'BBC Business',       defaultCategory: 'macro-global' },
  { url: 'https://www.theguardian.com/business/economics/rss',               source: 'The Guardian Econ.', defaultCategory: 'macro-global' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', source: 'CNBC Economy', defaultCategory: 'macro-global' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', source: 'CNBC Markets', defaultCategory: 'macro-global' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',         source: 'NYT Economy',        defaultCategory: 'macro-global' },
  { url: 'https://www.project-syndicate.org/rss',                            source: 'Project Syndicate',  defaultCategory: 'macro-global' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',                    source: 'WSJ Markets',        defaultCategory: 'macro-global' },
  { url: 'https://feeds.skynews.com/feeds/rss/business.xml',                 source: 'Sky News Business',  defaultCategory: 'macro-global' },
  { url: 'https://www.ft.com/world?format=rss',                              source: 'FT World',           defaultCategory: 'macro-global' },

  // ── Geopolítica ───────────────────────────────────────────────────────────
  { url: 'https://feeds.reuters.com/reuters/worldNews',                      source: 'Reuters World',      defaultCategory: 'geopolitica'  },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                      source: 'BBC World',          defaultCategory: 'geopolitica'  },
  { url: 'https://www.theguardian.com/world/rss',                            source: 'The Guardian World', defaultCategory: 'geopolitica'  },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',           source: 'NYT World',          defaultCategory: 'geopolitica'  },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',                        source: 'Al Jazeera',         defaultCategory: 'geopolitica'  },
  { url: 'https://rss.dw.com/rdf/rss-bra-pol',                               source: 'DW Brasil',          defaultCategory: 'geopolitica'  },
  { url: 'https://foreignpolicy.com/feed/',                                  source: 'Foreign Policy',     defaultCategory: 'geopolitica'  },
]

const SKIP_KW = [
  // Esportes
  'horóscopo', 'futebol', 'copa do', 'campeonato', 'esporte', 'tênis', 'fórmula 1',
  'nba ', 'nfl ', 'transferência de jogador', 'atleta ', 'gol ',
  // Crime / violência
  ' morto', 'assassinato', 'ataque armado', 'bala perdida', 'acidente de tr', 'homicídio',
  // Entretenimento
  'reality show', 'big brother', 'receita de', 'moda ', 'beleza ',
  'série de tv', 'cinema ', 'oscar ', 'grammy', 'netflix ', 'festival de',
  // Ciência / natureza / saúde
  'nova espécie', 'descoberta científica', 'pesquisa científica', 'crosta terrestre',
  'geolog', 'arqueolog', 'paleontolog', 'astronom', 'estudo revela que',
  'temperatura do planeta', 'aquecimento global', 'mudança climática',
  'vacina ', 'remédio ', 'medicamento ', 'tratamento médico',
  // Tech irrelevante
  'novo celular', 'lançamento de app', 'atualização do iphone',
  // Clickbait / quiz / listas virais
  'a cada 10 pessoas', 'em cada 10', 'você consegue', 'consegue resolver',
  'quantas pessoas', 'teste seu', 'quiz:', 'desafio viral', 'só os gênios',
  'tente resolver', 'descubra se você', 'veja se você sabe',
]

function shouldSkip(title: string, desc: string): boolean {
  const t = (title + ' ' + desc).toLowerCase()
  return SKIP_KW.some(k => t.includes(k))
}

function tag(xml: string, name: string): string {
  const re = new RegExp(`<${name}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${name}>`, 'i')
  return xml.match(re)?.[1]?.trim() ?? ''
}

function clean(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function parseItems(xml: string, source: string, def: NewsCategory): NewsItem[] {
  const items: NewsItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const chunk = m[1]
    const title = clean(tag(chunk, 'title'))
    const url   = clean(tag(chunk, 'link') || tag(chunk, 'guid'))
    const desc  = clean(tag(chunk, 'description')).slice(0, 200)
    const pub   = tag(chunk, 'pubDate')
    if (!title || !url) continue
    if (shouldSkip(title, desc)) continue
    items.push({
      id:          url,
      title,
      url,
      description: desc,
      publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      source,
      category:    def,
      summary:     '',
    })
  }
  return items
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const settled = await Promise.allSettled(
    FEEDS.map(async ({ url, source, defaultCategory }) => {
      const res = await fetch(url, {
        next: { revalidate: 900 },
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MacroMonitor/1.0)' },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return [] as NewsItem[]
      return parseItems(await res.text(), source, defaultCategory)
    }),
  )

  const all = settled
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  const seen = new Set<string>()
  return all.filter(n => { if (seen.has(n.url)) return false; seen.add(n.url); return true })
}
