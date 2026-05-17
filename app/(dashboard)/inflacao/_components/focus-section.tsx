'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'
import type { FocusInflationData, FocusYearData } from '@/app/api/focus-inflation/route'

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-')
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${d}/${months[parseInt(m, 10) - 1]}`
}

function formatBulletinDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
}

function Delta({ latest, prev }: { latest: FocusYearData['latest']; prev: FocusYearData['prev'] }) {
  if (!prev) return null
  const diff = parseFloat((latest.mediana - prev.mediana).toFixed(2))
  if (Math.abs(diff) < 0.005) {
    return <span className="flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="w-3 h-3" /> estável</span>
  }
  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-[11px]">
        <TrendingUp className="w-3 h-3" /> +{diff.toFixed(2)} pp
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-emerald-400 text-[11px]">
      <TrendingDown className="w-3 h-3" /> {diff.toFixed(2)} pp
    </span>
  )
}

function YearCard({ yearData, label }: { yearData: FocusYearData; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-4 py-3 flex-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">
        {yearData.latest.mediana.toFixed(2)}
        <span className="text-sm font-normal text-muted-foreground ml-0.5">%</span>
      </p>
      <Delta latest={yearData.latest} prev={yearData.prev} />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(2)}%
        </p>
      ))}
    </div>
  )
}

export function FocusInflationSection() {
  const [data,    setData]    = useState<FocusInflationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetch('/api/focus-inflation')
      .then(r => r.json())
      .then((d: FocusInflationData & { error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  // Build trend chart data: merge anoAtual and anoSeguinte by date
  const chartData = (() => {
    if (!data?.anoAtual && !data?.anoSeguinte) return []
    const map = new Map<string, { data: string; atual?: number; seguinte?: number }>()
    data.anoAtual?.trend.forEach(p => {
      map.set(p.data, { data: p.data, atual: p.mediana })
    })
    data.anoSeguinte?.trend.forEach(p => {
      const existing = map.get(p.data) ?? { data: p.data }
      map.set(p.data, { ...existing, seguinte: p.mediana })
    })
    return Array.from(map.values())
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(p => ({ ...p, data: formatDate(p.data) }))
  })()

  const currentYear = new Date().getFullYear()

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="h-4 w-48 rounded bg-muted/40 animate-pulse" />
        <div className="flex gap-3">
          <div className="flex-1 h-20 rounded-lg bg-muted/40 animate-pulse" />
          <div className="flex-1 h-20 rounded-lg bg-muted/40 animate-pulse" />
        </div>
        <div className="h-40 rounded bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {error ? `Erro ao carregar Focus: ${error}` : 'Dados Focus indisponíveis.'}
        </p>
        <button onClick={load} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Expectativas de Mercado — Focus (BCB)</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Mediana das instituições · boletim de {data.anoAtual?.latest.data
              ? formatBulletinDate(data.anoAtual.latest.data)
              : '—'}
          </p>
        </div>
        <button
          onClick={load}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="flex gap-3">
        {data.anoAtual && (
          <YearCard yearData={data.anoAtual} label={`IPCA ${currentYear}`} />
        )}
        {data.anoSeguinte && (
          <YearCard yearData={data.anoSeguinte} label={`IPCA ${currentYear + 1}`} />
        )}
        {data.top5.anoAtual && (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-4 py-3 flex-1">
            <p className="text-[11px] text-muted-foreground">Top 5 — {currentYear}</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {data.top5.anoAtual.mediana.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground ml-0.5">%</span>
            </p>
            {data.anoAtual && (
              <p className="text-[11px] text-muted-foreground">
                {(data.top5.anoAtual.mediana - data.anoAtual.latest.mediana) >= 0 ? '+' : ''}
                {(data.top5.anoAtual.mediana - data.anoAtual.latest.mediana).toFixed(2)} pp vs mercado
              </p>
            )}
          </div>
        )}
      </div>

      {/* Trend Chart */}
      {chartData.length >= 2 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Evolução das expectativas — últimas semanas
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}%`}
                domain={['auto', 'auto']}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) => value === 'atual' ? `IPCA ${currentYear}` : `IPCA ${currentYear + 1}`}
              />
              {data.anoAtual && (
                <Line
                  type="monotone"
                  dataKey="atual"
                  name="atual"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
              )}
              {data.anoSeguinte && (
                <Line
                  type="monotone"
                  dataKey="seguinte"
                  name="seguinte"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 5 footnote */}
      {data.top5.anoSeguinte && (
        <p className="text-[10px] text-muted-foreground/70 border-t border-border/30 pt-2">
          Top 5 previsores {currentYear + 1}: {data.top5.anoSeguinte.mediana.toFixed(2)}%
          {data.anoSeguinte && (
            <> · {(data.top5.anoSeguinte.mediana - data.anoSeguinte.latest.mediana) >= 0 ? '+' : ''}
            {(data.top5.anoSeguinte.mediana - data.anoSeguinte.latest.mediana).toFixed(2)} pp vs mercado geral</>
          )}
        </p>
      )}
    </div>
  )
}
