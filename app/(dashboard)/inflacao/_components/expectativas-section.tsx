'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, ReferenceLine,
} from 'recharts'
import type { ExpectationsData, HorizonRate } from '@/app/api/inflation-expectations/route'

// ── Tooltip personalizado ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-0.5">
      <p className="text-muted-foreground mb-1">{label} meses</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(2)}%
        </p>
      ))}
    </div>
  )
}

// ── Tabela de horizontes ─────────────────────────────────────────────────
function HorizonTable({ horizons, mode }: {
  horizons: HorizonRate[]
  mode: 'impl' | 'pre'
}) {
  const ipca2025Meta = 3.0
  return (
    <div className="flex flex-col divide-y divide-border/40">
      {horizons.map(h => {
        const val = mode === 'impl' ? h.impl : h.pre
        if (val === null) return null
        const diff = mode === 'impl' ? val - ipca2025Meta : null
        return (
          <div key={h.label} className="flex items-center justify-between py-2.5 px-1">
            <span className="text-xs text-muted-foreground">{h.label}</span>
            <div className="flex items-center gap-3">
              {diff !== null && (
                <span className={`text-[10px] font-mono ${diff > 0 ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(2)} pp meta
                </span>
              )}
              <span className="text-sm font-semibold tabular-nums w-14 text-right">
                {val.toFixed(2)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────
export function ExpectativasSection() {
  const [data,    setData]    = useState<ExpectationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetch('/api/inflation-expectations')
      .then(r => r.json())
      .then((d: ExpectationsData & { error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-56 rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-52 rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-52 rounded-lg bg-muted/40 animate-pulse" />
        </div>
        <div className="h-52 rounded bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {error
            ? `Dados ANBIMA indisponíveis: ${error.slice(0, 80)}`
            : 'Dados indisponíveis.'}
        </p>
        <button onClick={load} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Tentar novamente
        </button>
      </div>
    )
  }

  const ipca2025Meta = 3.0

  // Formata meses para label legível
  function fmtMonths(m: number): string {
    if (m <= 12) return `${m}m`
    const y = m / 12
    return Number.isInteger(y) ? `${y}a` : `${m}m`
  }

  const chartData = data.curve
    .filter(p => p.months >= 1 && p.months <= 121)
    .map(p => ({ ...p, months: fmtMonths(p.months) }))

  return (
    <div className="space-y-5">

      {/* Cabeçalho + refresh */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Dados ANBIMA — curva de fechamento de {data.curveDate.split('-').reverse().join('/')}
        </p>
        <button
          onClick={load}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Atualizar curvas"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Duas tabelas lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Inflação implícita */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold">Inflação Implícita</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Breakeven NTN-B vs NTN-F · diferença em pp da meta BCB (3%)
            </p>
          </div>
          <HorizonTable horizons={data.horizons} mode="impl" />
        </div>

        {/* Juros prefixados */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold">Juros Implícitos — Curva Pré (NTN-F)</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Taxa zero-cupom pré-fixada por prazo — proxy da expectativa de juros
            </p>
          </div>
          <HorizonTable horizons={data.horizons} mode="pre" />
        </div>
      </div>

      {/* Gráfico das três curvas */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-semibold mb-1">Estrutura a Termo completa — NTN-F, NTN-B e Inflação Implícita</h4>
        <p className="text-[10px] text-muted-foreground mb-4">
          Curva de fechamento ANBIMA · taxa zero-cupom (% a.a.) por prazo em meses
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            <XAxis
              dataKey="months"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}%`}
              domain={['auto', 'auto']}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(v) => v === 'pre' ? 'Juros Pré (NTN-F)' : v === 'real' ? 'Juro Real (NTN-B)' : 'Inflação Implícita'}
            />
            <ReferenceLine
              y={ipca2025Meta}
              stroke="hsl(142 76% 40%)"
              strokeDasharray="4 3"
              strokeOpacity={0.6}
              label={{ value: `Meta ${ipca2025Meta}%`, position: 'right', fontSize: 9, fill: 'hsl(142 76% 40%)' }}
            />
            <Line type="monotone" dataKey="pre"  name="pre"  stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="real" name="real" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="impl" name="impl" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} connectNulls strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
