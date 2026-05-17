'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface EquityIndex {
  key:        string
  label:      string
  symbol:     string
  raw:        { date: string; close: number }[]
  normalized: { date: string; value: number }[]
  latest:     { date: string; close: number } | null
  previous:   { date: string; close: number } | null
}

interface MarketsData {
  selicKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  usdBrlKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  embiKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  diOverKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  selic:    SeriesPoint[]
  diOver:   SeriesPoint[]
  usdBrl:   SeriesPoint[]
  eurBrl:   SeriesPoint[]
  embi:     SeriesPoint[]
  equityIndices: EquityIndex[]
}

interface Props { data: MarketsData }

const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'hsl(280 65% 60%)',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeByDate(seriesMap: Record<string, SeriesPoint[]>): any[] {
  const dateSet = new Set<string>()
  for (const pts of Object.values(seriesMap)) pts.forEach((p) => dateSet.add(p.date))
  const dates = Array.from(dateSet).sort()
  return dates.map((date) => {
    const row: Record<string, string | number> = { date }
    for (const [key, pts] of Object.entries(seriesMap)) {
      const pt = pts.find((p) => p.date === date)
      if (pt !== undefined) row[key] = pt.value
    }
    return row
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeNormalized(indices: EquityIndex[]): any[] {
  const dateSet = new Set<string>()
  for (const idx of indices) idx.normalized.forEach((p) => dateSet.add(p.date))
  const dates = Array.from(dateSet).sort()
  return dates.map((date) => {
    const row: Record<string, string | number> = { date }
    for (const idx of indices) {
      const pt = idx.normalized.find((p) => p.date === date)
      if (pt !== undefined) row[idx.key] = pt.value
    }
    return row
  })
}

function formatClose(v: number): string {
  if (v >= 10_000) return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  if (v >= 1_000)  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function MarketsDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('1y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const selicDiData    = mergeByDate({ selic: data.selic, di: data.diOver })
  const cambioData     = mergeByDate({ usd: data.usdBrl, eur: data.eurBrl })
  const equityNormData = mergeNormalized(data.equityIndices)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mercados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Juros, câmbio, risco-país e principais índices de ações do mundo</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Taxa Selic (% a.a.)"
          value={data.selicKv?.latest.value ?? null}
          unit="% a.a."
          date={data.selicKv?.latest.date}
          delta={data.selicKv?.previous ? data.selicKv.latest.value - data.selicKv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert={false}
        />
        <KpiCard
          title="DI Overnight (% a.a.)"
          value={data.diOverKv?.latest.value ?? null}
          unit="% a.a."
          date={data.diOverKv?.latest.date}
          delta={data.diOverKv?.previous ? data.diOverKv.latest.value - data.diOverKv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert={false}
        />
        <KpiCard
          title="USD/BRL (PTAX)"
          value={data.usdBrlKv?.latest.value ?? null}
          unit=" R$"
          date={data.usdBrlKv?.latest.date}
          delta={data.usdBrlKv?.previous ? data.usdBrlKv.latest.value - data.usdBrlKv.previous.value : null}
          deltaUnit=" R$"
          deltaInvert
        />
        <KpiCard
          title="EMBI+ Risco-Brasil"
          value={data.embiKv?.latest.value ?? null}
          unit=" bps"
          date={data.embiKv?.latest.date}
          delta={data.embiKv?.previous ? data.embiKv.latest.value - data.embiKv.previous.value : null}
          deltaUnit=" bps"
          deltaInvert
        />
      </div>

      {/* ── SEÇÃO: ÍNDICES DE AÇÕES ───────────────────────── */}
      <SectionDivider
        title="Índices de Ações Globais"
        description="Principais bolsas de valores — desempenho normalizado (base 100 = início do período) em moeda local"
      />

      {/* Cards rápidos com valor atual e variação */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.equityIndices.map((idx) => {
          const delta = idx.latest && idx.previous
            ? ((idx.latest.close - idx.previous.close) / idx.previous.close) * 100
            : null
          return (
            <div key={idx.key} className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground leading-tight">{idx.label}</span>
              <span className="text-lg font-semibold tabular-nums leading-tight">
                {idx.latest ? formatClose(idx.latest.close) : '—'}
              </span>
              {delta !== null && (
                <span className={`text-[11px] font-medium ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(2)}% (mês)
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {idx.latest?.date ? new Date(idx.latest.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : ''}
              </span>
            </div>
          )
        })}
      </div>

      <SectionCard
        title="Desempenho Comparativo — Índices de Ações Globais (base 100 = início do período, moeda local)"
        sectionId="equity"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={equityNormData}
            series={data.equityIndices.map((idx, i) => ({
              key:   idx.key,
              label: idx.label,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))}
            referenceLines={[{ value: 100, label: 'Base 100', color: 'var(--muted-foreground)' }]}
            unit="" height={360} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: JUROS ──────────────────────────────────── */}
      <SectionDivider title="Juros" description="Taxa Selic anualizada e DI Overnight — referência para todos os ativos de renda fixa" />

      <SectionCard title="Taxa Selic e DI Overnight (% ao ano)" sectionId="juros" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={selicDiData}
            series={[
              { key: 'selic', label: 'Taxa Selic (% a.a.)',       color: 'var(--chart-1)' },
              { key: 'di',    label: 'DI Overnight (% a.a.)',     color: 'var(--chart-3)' },
            ]}
            unit="% a.a." height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: CÂMBIO ─────────────────────────────────── */}
      <SectionDivider title="Câmbio" description="Taxas de câmbio PTAX (Banco Central do Brasil) — cotação de venda, média mensal" />

      <SectionCard title="USD/BRL e EUR/BRL — PTAX Venda (R$ por unidade de moeda estrangeira)" sectionId="cambio" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={cambioData}
            series={[
              { key: 'usd', label: 'Dólar Americano (USD/BRL)', color: 'var(--chart-2)' },
              { key: 'eur', label: 'Euro (EUR/BRL)',             color: 'var(--chart-4)' },
            ]}
            unit=" R$" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: RISCO ──────────────────────────────────── */}
      <SectionDivider title="Risco-País" description="EMBI+ JP Morgan — spread soberano brasileiro sobre os Treasuries americanos" />

      <SectionCard title="EMBI+ Brasil — JP Morgan (pontos-base)" sectionId="embi" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.embi.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'EMBI+ Brasil', color: 'var(--chart-5)' }]}
            referenceLines={[
              { value: 200, label: '200 bps', color: 'hsl(142 76% 40%)' },
              { value: 400, label: '400 bps', color: 'hsl(0 72% 51%)'   },
            ]}
            unit=" bps" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
