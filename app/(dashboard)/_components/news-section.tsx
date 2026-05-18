'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewsItem } from '@/lib/rss'

const SOURCE_COLOR: Record<string, string> = {
  'Valor Econômico':    'bg-violet-500/15 text-violet-400',
  'Brazil Journal':     'bg-blue-500/15 text-blue-400',
  'NeoFeed':            'bg-cyan-500/15 text-cyan-400',
  'Folha Mercado':      'bg-emerald-500/15 text-emerald-400',
  'InfoMoney':          'bg-amber-500/15 text-amber-400',
  'CNN Brasil':         'bg-red-500/15 text-red-400',
  'BBC World':          'bg-red-500/15 text-red-400',
  'NYT World':          'bg-slate-500/15 text-slate-400',
  'Al Jazeera':         'bg-yellow-500/15 text-yellow-400',
  'The Guardian':       'bg-blue-500/15 text-blue-400',
  'Foreign Policy':     'bg-indigo-500/15 text-indigo-400',
  'DW Brasil':          'bg-teal-500/15 text-teal-400',
  'InfoMoney Negócios': 'bg-amber-500/15 text-amber-400',
  'InfoMoney Empresas': 'bg-amber-500/15 text-amber-400',
  'Capital Aberto':     'bg-violet-500/15 text-violet-400',
  'BBC Business':       'bg-red-500/15 text-red-400',
  'FT Companies':       'bg-rose-500/15 text-rose-400',
  'WSJ Markets':        'bg-slate-500/15 text-slate-400',
  'CNBC Markets':       'bg-emerald-500/15 text-emerald-400',
}

const TABS = [
  { id: 'economia',    label: 'Economia',    api: '/api/news'        },
  { id: 'geopolitica', label: 'Geopolítica', api: '/api/geopolitics' },
  { id: 'negocios',    label: 'Negócios',    api: '/api/negocios'    },
] as const

type TabId = typeof TABS[number]['id']

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
  const [tab,     setTab]     = useState<TabId>('economia')
  const [cache,   setCache]   = useState<Partial<Record<TabId, NewsItem[]>>>({})
  const [loading, setLoading] = useState<Partial<Record<TabId, boolean>>>({ economia: true })
  const [lastAt,  setLastAt]  = useState<Date | null>(null)

  const loadTab = useCallback((t: TabId) => {
    const api = TABS.find(x => x.id === t)!.api
    setLoading(prev => ({ ...prev, [t]: true }))
    fetch(api)
      .then(r => r.json())
      .then((data: NewsItem[]) => {
        setCache(prev  => ({ ...prev,  [t]: data  }))
        setLoading(prev => ({ ...prev, [t]: false }))
        setLastAt(new Date())
      })
      .catch(() => setLoading(prev => ({ ...prev, [t]: false })))
  }, [])

  useEffect(() => {
    TABS.forEach(t => loadTab(t.id))
    const id = setInterval(() => TABS.forEach(t => loadTab(t.id)), 15 * 60 * 1000)
    const handler = () => TABS.forEach(t => loadTab(t.id))
    window.addEventListener('macro:refresh', handler)
    return () => { clearInterval(id); window.removeEventListener('macro:refresh', handler) }
  }, [loadTab])

  const news      = cache[tab]   ?? []
  const isLoading = loading[tab] ?? false

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                tab === t.id
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {lastAt && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {timeAgo(lastAt.toISOString())}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[540px] pr-1">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
        ))}

        {!isLoading && news.length === 0 && (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Nenhuma notícia disponível no momento.
          </p>
        )}

        {!isLoading && news.slice(0, 30).map(item => (
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
