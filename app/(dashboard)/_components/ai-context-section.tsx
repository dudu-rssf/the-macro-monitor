'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

type Tab = 'geral' | 'recente'

interface AiData {
  bullets: string[]
  generatedAt: string | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  return `${h}h atrás`
}

function BulletPanel({ data, loading, error }: {
  data: AiData | null
  loading: boolean
  error: boolean
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted/40 animate-pulse"
            style={{ width: `${65 + (i * 7) % 30}%` }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Não foi possível gerar a análise. Tente novamente.
      </p>
    )
  }

  if (!data?.bullets || data.bullets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Nenhuma análise disponível no momento.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.bullets.map((bullet, i) => (
        <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
          <span className="text-violet-400/70 shrink-0 mt-0.5 font-semibold">•</span>
          <span className="text-foreground/90">{bullet}</span>
        </li>
      ))}
    </ul>
  )
}

export function AiContextSection() {
  const [tab, setTab] = useState<Tab>('geral')

  const [geralData,    setGeralData]    = useState<AiData | null>(null)
  const [geralLoading, setGeralLoading] = useState(true)
  const [geralError,   setGeralError]   = useState(false)

  const [recentData,    setRecentData]    = useState<AiData | null>(null)
  const [recentLoading, setRecentLoading] = useState(false)
  const [recentError,   setRecentError]   = useState(false)
  const recentFetched = useRef(false)

  function loadGeral() {
    setGeralLoading(true)
    setGeralError(false)
    fetch('/api/ai-context')
      .then(r => r.json())
      .then((d: AiData) => { setGeralData(d); setGeralLoading(false) })
      .catch(() => { setGeralError(true); setGeralLoading(false) })
  }

  function loadRecente() {
    setRecentLoading(true)
    setRecentError(false)
    fetch('/api/ai-context/recent')
      .then(r => r.json())
      .then((d: AiData) => { setRecentData(d); setRecentLoading(false); recentFetched.current = true })
      .catch(() => { setRecentError(true); setRecentLoading(false) })
  }

  useEffect(() => { loadGeral() }, [])

  useEffect(() => {
    if (tab === 'recente' && !recentFetched.current) loadRecente()
  }, [tab])

  const activeData    = tab === 'geral' ? geralData    : recentData
  const activeLoading = tab === 'geral' ? geralLoading : recentLoading
  const activeError   = tab === 'geral' ? geralError   : recentError
  const activeLoad    = tab === 'geral' ? loadGeral    : loadRecente

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <h2 className="text-sm font-semibold">Contexto IA</h2>
        <div className="ml-auto flex items-center gap-2">
          {activeData?.generatedAt && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {timeAgo(activeData.generatedAt)}
            </span>
          )}
          <button
            onClick={activeLoad}
            disabled={activeLoading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Atualizar análise"
          >
            <RefreshCw className={`w-3 h-3 ${activeLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {([
          { key: 'geral',   label: 'Panorama Geral'   },
          { key: 'recente', label: 'Panorama Recente'  },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
              tab === t.key
                ? 'bg-violet-500/20 text-violet-300 font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed -mt-1">
        {tab === 'geral'
          ? 'Visão geral do cenário macro dos últimos 12 meses — contexto e implicações.'
          : 'Foco nos últimos dados divulgados — surpresas, outliers e o que está mudando agora.'}
      </p>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto max-h-[380px] pr-1">
        <BulletPanel data={activeData} loading={activeLoading} error={activeError} />
      </div>

      <p className="text-[10px] text-muted-foreground/50 pt-1 border-t border-border/30">
        {tab === 'geral'
          ? 'Gerado por IA com base nos dados do banco · atualiza a cada hora'
          : 'Gerado por IA com base nos dados recentes · atualiza a cada 15 min'}
      </p>
    </div>
  )
}
