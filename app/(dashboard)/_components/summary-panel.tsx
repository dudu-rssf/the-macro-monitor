'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, RefreshCw, Clock } from 'lucide-react'

interface SummaryData {
  tab:         string
  tabName:     string
  historical:  string[]
  recent:      string[]
  generatedAt: string | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min atrás`
  return `${Math.floor(m / 60)}h atrás`
}

function BulletList({ bullets, loading }: { bullets: string[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 pt-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted/40 animate-pulse"
            style={{ width: `${60 + (i * 9) % 35}%` }}
          />
        ))}
      </div>
    )
  }
  if (bullets.length === 0) {
    return <p className="text-xs text-muted-foreground py-3">Nenhum dado disponível.</p>
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
          <span className="text-violet-400/70 shrink-0 mt-0.5 font-semibold">•</span>
          <span className="text-foreground/90">{b}</span>
        </li>
      ))}
    </ul>
  )
}

interface Props {
  tab:     string
  onClose: () => void
}

export function SummaryPanel({ tab, onClose }: Props) {
  const [data,    setData]    = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetch(`/api/summary?tab=${tab}`)
      .then(r => r.json())
      .then((d: SummaryData) => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { load() }, [tab])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-tight">
              Resumo IA — {data?.tabName ?? '...'}
            </h2>
            {data?.generatedAt && (
              <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5" />
                {timeAgo(data.generatedAt)}
              </p>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            title="Regenerar resumo"
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 p-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground text-center">
              Não foi possível gerar o resumo. Tente novamente.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
            {/* Histórico 12 meses */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-violet-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Últimos 12 meses
                </h3>
              </div>
              <BulletList bullets={data?.historical ?? []} loading={loading} />
            </section>

            {/* Situação recente */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-amber-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Situação Atual
                </h3>
              </div>
              <BulletList bullets={data?.recent ?? []} loading={loading} />
            </section>
          </div>
        )}

        <p className="px-5 py-3 text-[10px] text-muted-foreground/50 border-t border-border/30 shrink-0">
          Gerado por IA com base nos dados do banco · não constitui recomendação de investimento
        </p>
      </div>
    </>
  )
}
