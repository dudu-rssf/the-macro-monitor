'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewsItem, NewsCategory } from '@/lib/rss'

type Filter = 'tudo' | NewsCategory

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'tudo',            label: 'Tudo' },
  { key: 'macro-brasil',    label: 'Macro Brasil' },
  { key: 'macro-global',    label: 'Macro Global' },
  { key: 'negocios-brasil', label: 'Negócios Brasil' },
]

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  'macro-brasil':    'bg-blue-500/15 text-blue-400',
  'macro-global':    'bg-amber-500/15 text-amber-400',
  'negocios-brasil': 'bg-emerald-500/15 text-emerald-400',
}

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  'macro-brasil':    'Macro BR',
  'macro-global':    'Global',
  'negocios-brasil': 'Negócios',
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
  const [news,    setNews]    = useState<NewsItem[]>([])
  const [filter,  setFilter]  = useState<Filter>('tudo')
  const [loading, setLoading] = useState(true)
  const [lastAt,  setLastAt]  = useState<Date | null>(null)

  const load = useCallback(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then((data: NewsItem[]) => { setNews(data); setLastAt(new Date()); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  const filtered = filter === 'tudo' ? news : news.filter(n => n.category === filter)

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Notícias</h2>
        {lastAt && (
          <span className="text-[10px] text-muted-foreground font-mono">
            atualizado {timeAgo(lastAt.toISOString())}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              filter === f.key
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[480px] pr-1">
        {loading && (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-muted/40 animate-pulse" />
          ))
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma notícia disponível no momento.
          </p>
        )}

        {!loading && filtered.map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-0.5 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${CATEGORY_COLOR[item.category]}`}>
                {CATEGORY_LABEL[item.category]}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto shrink-0">
                {timeAgo(item.publishedAt)}
              </span>
            </div>
            <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-foreground text-foreground/90">
              {item.title}
            </p>
            {item.description && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                {item.description}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
