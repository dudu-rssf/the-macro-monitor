'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewsItem } from '@/lib/rss'

const SOURCE_COLOR: Record<string, string> = {
  'InfoMoney Negócios': 'bg-amber-500/15 text-amber-400',
  'InfoMoney Empresas': 'bg-amber-500/15 text-amber-400',
  'NeoFeed':            'bg-cyan-500/15 text-cyan-400',
  'Brazil Journal':     'bg-blue-500/15 text-blue-400',
  'Capital Aberto':     'bg-violet-500/15 text-violet-400',
  'BBC Business':       'bg-red-500/15 text-red-400',
  'FT Companies':       'bg-rose-500/15 text-rose-400',
  'WSJ Markets':        'bg-slate-500/15 text-slate-400',
  'CNBC Markets':       'bg-emerald-500/15 text-emerald-400',
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

export function NegociosSection() {
  const [news,    setNews]    = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastAt,  setLastAt]  = useState<Date | null>(null)

  const load = useCallback(() => {
    fetch('/api/negocios')
      .then(r => r.json())
      .then((data: NewsItem[]) => {
        setNews(data)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Negócios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            InfoMoney · NeoFeed · Brazil Journal · Capital Aberto · BBC Business · FT · WSJ · CNBC
          </p>
        </div>
        {lastAt && (
          <span className="text-[10px] text-muted-foreground font-mono">
            atualizado {timeAgo(lastAt.toISOString())}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
        ))}

        {!loading && news.length === 0 && (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Nenhuma notícia disponível no momento.
          </p>
        )}

        {!loading && news.slice(0, 40).map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1.5 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${SOURCE_COLOR[item.source] ?? 'bg-muted text-muted-foreground'}`}>
                {item.source}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0 ml-auto">
                {timeAgo(item.publishedAt)}
              </span>
            </div>

            <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground/90 group-hover:text-foreground">
              {item.title}
            </p>

            {item.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {item.description}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
