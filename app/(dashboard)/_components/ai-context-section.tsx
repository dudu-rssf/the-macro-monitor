'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

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

export function AiContextSection() {
  const [data,    setData]    = useState<AiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetch('/api/ai-context')
      .then(r => r.json())
      .then((d: AiData) => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <h2 className="text-sm font-semibold">Contexto IA</h2>
        <div className="ml-auto flex items-center gap-2">
          {data?.generatedAt && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {timeAgo(data.generatedAt)}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Atualizar análise"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto max-h-[440px] pr-1">
        {loading && (
          <div className="flex flex-col gap-3 pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-4 rounded bg-muted/40 animate-pulse"
                style={{ width: `${65 + (i * 7) % 30}%` }}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Não foi possível gerar a análise. Tente novamente.
          </p>
        )}

        {!loading && !error && data?.bullets && data.bullets.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma análise disponível no momento.
          </p>
        )}

        {!loading && !error && data?.bullets && data.bullets.length > 0 && (
          <ul className="flex flex-col gap-3">
            {data.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
                <span className="text-violet-400/70 shrink-0 mt-0.5 font-semibold">•</span>
                <span className="text-foreground/90">{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/50 pt-1 border-t border-border/30">
        Gerado por IA com base nos dados do banco · atualiza a cada hora
      </p>
    </div>
  )
}
