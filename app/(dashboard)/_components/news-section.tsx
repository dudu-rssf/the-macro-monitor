'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewsItem, NewsCategory } from '@/lib/rss'

type Filter = 'tudo' | NewsCategory

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'tudo',            label: 'Tudo'           },
  { key: 'macro-brasil',    label: 'Macro Brasil'   },
  { key: 'macro-global',    label: 'Macro Global'   },
  { key: 'geopolitica',     label: 'Geopolítica'    },
  { key: 'politica-brasil', label: 'Política BR'    },
  { key: 'negocios-brasil', label: 'Negócios BR'    },
  { key: 'resultados',      label: 'Resultados'     },
]

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  'macro-brasil':    'bg-blue-500/15 text-blue-400',
  'macro-global':    'bg-amber-500/15 text-amber-400',
  'geopolitica':     'bg-red-500/15 text-red-400',
  'politica-brasil': 'bg-yellow-500/15 text-yellow-400',
  'negocios-brasil': 'bg-cyan-500/15 text-cyan-400',
  'resultados':      'bg-emerald-500/15 text-emerald-400',
}

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  'macro-brasil':    'Macro BR',
  'macro-global':    'Global',
  'geopolitica':     'Geopolítica',
  'politica-brasil': 'Política BR',
  'negocios-brasil': 'Negócios BR',
  'resultados':      'Resultados',
}

function todayBRT(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).split('/').reverse().join('-') // YYYY-MM-DD
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function NewsSection() {
  const [allNews, setAllNews]  = useState<NewsItem[]>([])
  const [filter,  setFilter]   = useState<Filter>('tudo')
  const [loading, setLoading]  = useState(true)
  const [lastAt,  setLastAt]   = useState<Date | null>(null)
  const [today,   setToday]    = useState('')

  // today string recomputed at render (resets at BRT midnight)
  useEffect(() => { setToday(todayBRT()) }, [])

  const load = useCallback(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then((data: NewsItem[]) => {
        setAllNews(data)
        setLastAt(new Date())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 15 * 60 * 1000)
    window.addEventListener('macro:refresh', load)
    return () => {
      clearInterval(id)
      window.removeEventListener('macro:refresh', load)
    }
  }, [load])

  // Filter to today's news in BRT, fallback to all if nothing today
  const todayNews = today
    ? allNews.filter(n => {
        const itemDate = new Date(n.publishedAt)
        const itemBRT  = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(itemDate).split('/').reverse().join('-')
        return itemBRT === today
      })
    : allNews

  const displayNews = todayNews.length >= 3 ? todayNews : allNews.slice(0, 60)
  const filtered    = (filter === 'tudo' ? displayNews : displayNews.filter(n => n.category === filter)).slice(0, 25)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Notícias</h2>
        <div className="flex flex-col items-end gap-0.5">
          {today && (
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {today.split('-').reverse().join('/')}
            </span>
          )}
          {lastAt && (
            <span className="text-[10px] text-muted-foreground font-mono">
              atualizado {timeAgo(lastAt.toISOString())}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
              filter === f.key
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[540px] pr-1">
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-md bg-muted/40 animate-pulse" />
        ))}

        {!loading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground py-6 text-center">
            {filter === 'tudo'
              ? 'Aguardando divulgações do dia...'
              : 'Nenhuma notícia nesta categoria hoje.'}
          </p>
        )}

        {!loading && filtered.map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1.5 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_COLOR[item.category]}`}>
                {CATEGORY_LABEL[item.category]}
              </span>
              <span className="text-[10px] text-muted-foreground/70 truncate flex-1">
                {item.source}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                {timeAgo(item.publishedAt)}
              </span>
            </div>

            <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground/90 group-hover:text-foreground">
              {item.title}
            </p>

            {item.summary ? (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                {item.summary}
              </p>
            ) : item.description ? (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {item.description}
              </p>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  )
}
