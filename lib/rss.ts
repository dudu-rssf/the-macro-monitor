export type NewsCategory =
  | 'macro-brasil'
  | 'macro-global'
  | 'geopolitica-global'
  | 'politica-brasileira'
  | 'negocios-brasil'

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
  // ── Macro Brasil ───────────────────────────────────────────────────────────
  { url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',          source: 'Agência Brasil',       defaultCategory: 'macro-brasil'    },
  { url: 'https://g1.globo.com/rss/g1/economia/',                            source: 'G1 Economia',          defaultCategory: 'macro-brasil'    },
  { url: 'https://www.cnnbrasil.com.br/economia/feed/',                      source: 'CNN Brasil',           defaultCategory: 'macro-brasil'    },
  { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',                source: 'Folha Mercado',        defaultCategory: 'macro-brasil'    },
  { url: 'https://www.estadao.com.br/economia/feed/',                        source: 'Estadão Economia',     defaultCategory: 'macro-brasil'    },
  { url: 'https://www.correiobraziliense.com.br/economia/feed/',             source: 'Correio Econ.',        defaultCategory: 'macro-brasil'    },
  { url: 'https://www.metropoles.com/economia/feed/',                        source: 'Metrópoles Econ.',     defaultCategory: 'macro-brasil'    },
  { url: 'https://oglobo.globo.com/economia/rss.xml',                        source: 'O Globo Economia',     defaultCategory: 'macro-brasil'    },

  // ── Negócios Brasil ────────────────────────────────────────────────────────
  { url: 'https://www.infomoney.com.br/feed/',                               source: 'InfoMoney',            defaultCategory: 'negocios-brasil' },
  { url: 'https://exame.com/feed/',                                          source: 'Exame',                defaultCategory: 'negocios-brasil' },
  { url: 'https://istoedinheiro.com.br/feed/',                               source: 'IstoÉ Dinheiro',       defaultCategory: 'negocios-brasil' },
  { url: 'https://moneytimes.com.br/feed/',                                  source: 'Money Times',          defaultCategory: 'negocios-brasil' },
  { url: 'https://braziljournal.com/feed/',                                  source: 'Brazil Journal',       defaultCategory: 'negocios-brasil' },
  { url: 'https://neofeed.com.br/feed/',                                     source: 'NeoFeed',              defaultCategory: 'negocios-brasil' },
  { url: 'https://www.suno.com.br/noticias/feed/',                           source: 'Suno Notícias',        defaultCategory: 'negocios-brasil' },
  { url: 'https://capitalaberto.com.br/feed/',                               source: 'Capital Aberto',       defaultCategory: 'negocios-brasil' },
  { url: 'https://br.investing.com/rss/news_25.rss',                         source: 'Investing.com BR',     defaultCategory: 'negocios-brasil' },

  // ── Política Brasileira ────────────────────────────────────────────────────
  { url: 'https://www.poder360.com.br/feed/',                                source: 'Poder360',             defaultCategory: 'politica-brasileira' },
  { url: 'https://congressoemfoco.uol.com.br/feed/',                         source: 'Congresso em Foco',    defaultCategory: 'politica-brasileira' },
  { url: 'https://feeds.folha.uol.com.br/poder/rss091.xml',                  source: 'Folha Poder',          defaultCategory: 'politica-brasileira' },

  // ── Macro Global ──────────────────────────────────────────────────────────
  { url: 'https://feeds.reuters.com/reuters/BRTopNews',                      source: 'Reuters Brasil',       defaultCategory: 'macro-global'    },
  { url: 'https://feeds.reuters.com/reuters/businessNews',                   source: 'Reuters Business',     defaultCategory: 'macro-global'    },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',                   source: 'BBC Business',         defaultCategory: 'macro-global'    },
  { url: 'https://www.theguardian.com/business/economics/rss',               source: 'The Guardian Econ.',   defaultCategory: 'macro-global'    },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', source: 'CNBC Economy', defaultCategory: 'macro-global' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',         source: 'NYT Economy',          defaultCategory: 'macro-global'    },

  // ── Geopolítica Global ────────────────────────────────────────────────────
  { url: 'https://feeds.reuters.com/reuters/worldNews',                      source: 'Reuters World',        defaultCategory: 'geopolitica-global' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                      source: 'BBC World',            defaultCategory: 'geopolitica-global' },
  { url: 'https://www.theguardian.com/world/rss',                            source: 'The Guardian World',   defaultCategory: 'geopolitica-global' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',           source: 'NYT World',            defaultCategory: 'geopolitica-global' },
]

// Basic keyword fallback (Groq overrides this in the API route)
const GLOBAL_KW    = ['fed ', 'federal reserve', 'bce', 'china', 'estados unidos', ' eua', 'global', 'mundial', 'fmi', 'petróleo', 'commodities', 'trump', 'powell', 'tarifa']
const NEGOCIOS_KW  = ['empresa', 'ações', 'bolsa', 'ibovespa', 'resultado trimestral', 'lucro', 'prejuízo', 'fusão', 'aquisição', 'ipo', 'dividendo', 'petrobras', 'vale', 'itaú', 'b3']
const SKIP_KW      = ['horóscopo', 'futebol', 'copa do', 'campeonato', 'esporte', ' morto', 'assassinato', 'ataque armado', 'bala perdida', 'acidente de tr']

function categorize(title: string, desc: string, def: NewsCategory): NewsCategory {
  const t = (title + ' ' + desc).toLowerCase()
  if (GLOBAL_KW.some(k => t.includes(k)))   return 'macro-global'
  if (NEGOCIOS_KW.some(k => t.includes(k))) return 'negocios-brasil'
  return def
}

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
      category:    categorize(title, desc, def),
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
