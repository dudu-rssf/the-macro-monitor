export interface NewsItem {
  id:          string
  title:       string
  url:         string
  description: string
  publishedAt: string
  source:      string
}

const FEEDS_ECONOMIA: { url: string; source: string }[] = [
  { url: 'https://www.valor.com.br/rss',                                 source: 'Valor Econômico'  },
  { url: 'https://braziljournal.com/feed/',                              source: 'Brazil Journal'   },
  { url: 'https://neofeed.com.br/feed/',                                 source: 'NeoFeed'          },
  { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',            source: 'Folha Mercado'    },
  { url: 'https://www.infomoney.com.br/mercados/feed/',                  source: 'InfoMoney'        },
  { url: 'https://www.infomoney.com.br/economia/feed/',                  source: 'InfoMoney'        },
  { url: 'https://www.cnnbrasil.com.br/feed/',                           source: 'CNN Brasil'       },
]

const FEEDS_GEOPOLITICA: { url: string; source: string }[] = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',      source: 'BBC World'          },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World'    },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',         source: 'Al Jazeera'        },
  { url: 'https://www.theguardian.com/world/rss',             source: 'The Guardian'      },
  { url: 'https://foreignpolicy.com/feed/',                   source: 'Foreign Policy'    },
  { url: 'https://rss.dw.com/rdf/rss-bra-pol',               source: 'DW Brasil'         },
]

const SKIP_KW = [
  // Esportes
  'futebol', 'copa do', 'campeonato', 'nba ', 'nfl ', 'fórmula 1', 'tênis',
  // Entretenimento / cultura
  'reality show', 'big brother', 'série de tv', 'oscar ', 'grammy', 'netflix',
  'cinema ', 'festival de', 'moda ', 'beleza ', 'gastronomia', 'receita de',
  // Crime / violência
  ' morreu', ' morre ', 'assassinato', 'acidente de tr', 'homicídio', 'bala perdida',
  // Saúde / ciência sem impacto econômico
  'vacina ', 'remédio ', 'nova espécie', 'descoberta científica', 'clima ', 'aquecimento global',
  // Clickbait / quiz
  'você consegue', 'só os gênios', 'quiz:', 'desafio viral', 'tente resolver',
  'a cada 10 pessoas', 'em cada 10',
  // Política sem conteúdo econômico (para CNN que tem feed geral)
  'stf julga', 'plenário do', 'julgamento do', 'ministro do stf',
  'operação policial', 'polícia federal preso',
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

function parseItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const chunk = m[1]
    const title = clean(tag(chunk, 'title'))
    const url   = clean(tag(chunk, 'link') || tag(chunk, 'guid'))
    const desc  = clean(tag(chunk, 'description')).slice(0, 300)
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
    })
  }
  return items
}

async function fetchFromFeeds(feeds: { url: string; source: string }[]): Promise<NewsItem[]> {
  const settled = await Promise.allSettled(
    feeds.map(async ({ url, source }) => {
      const res = await fetch(url, {
        next: { revalidate: 900 },
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MacroMonitor/1.0)' },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return [] as NewsItem[]
      return parseItems(await res.text(), source)
    }),
  )

  const all = settled
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  const seen = new Set<string>()
  return all.filter(n => { if (seen.has(n.url)) return false; seen.add(n.url); return true })
}

export function fetchAllNews():        Promise<NewsItem[]> { return fetchFromFeeds(FEEDS_ECONOMIA)    }
export function fetchGeopoliticsNews(): Promise<NewsItem[]> { return fetchFromFeeds(FEEDS_GEOPOLITICA) }
