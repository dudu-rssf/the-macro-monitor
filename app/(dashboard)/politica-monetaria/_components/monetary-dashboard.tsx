'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { RangeSelector } from '@/components/macro/range-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface FocusRow {
  year: string
  median: number | null
}

interface MonetaryData {
  selicKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  ipca12mKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  selic:     SeriesPoint[]   // mensal
  ipca12m:   SeriesPoint[]   // mensal
  realRate:  SeriesPoint[]   // calculado: selic - ipca12m
  diOver:    SeriesPoint[]   // diário
  focusIpca: FocusRow[]
  focusSelic: FocusRow[]
}

interface Props {
  data: MonetaryData
}

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

export function MonetaryDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const selicNow  = data.selicKv?.latest.value ?? null
  const ipca12Now = data.ipca12mKv?.latest.value ?? null
  const realNow   = selicNow !== null && ipca12Now !== null ? selicNow - ipca12Now : null

  // Focus Selic ano corrente
  const currentYear = String(new Date().getFullYear())
  const focusSelicNow = data.focusSelic.find((r) => r.year === currentYear)?.median ?? null
  const focusIpcaNow  = data.focusIpca.find((r) => r.year === currentYear)?.median ?? null

  const nominalData = mergeByDate({ selic: data.selic, ipca12m: data.ipca12m })

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Política Monetária</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Selic, juros reais e expectativas Focus</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Selic (a.a.)"
          value={selicNow}
          unit="% a.a."
          date={data.selicKv?.latest.date}
          delta={data.selicKv?.previous ? selicNow! - data.selicKv.previous.value : null}
          deltaUnit="pp"
          deltaInvert={false}
        />
        <KpiCard
          title="IPCA 12m"
          value={ipca12Now}
          date={data.ipca12mKv?.latest.date}
          delta={data.ipca12mKv?.previous ? ipca12Now! - data.ipca12mKv.previous.value : null}
          deltaInvert
        />
        <KpiCard
          title="Juro Real Ex-Post"
          value={realNow}
          unit="% a.a."
          date={data.selicKv?.latest.date}
          deltaInvert={false}
          badge={realNow !== null ? {
            label: realNow >= 6 ? 'Restritivo' : realNow >= 2 ? 'Neutro' : 'Expansionista',
            variant: realNow >= 6 ? 'destructive' : realNow >= 2 ? 'secondary' : 'default',
          } : undefined}
        />
        <KpiCard
          title={`Focus Selic ${currentYear}`}
          value={focusSelicNow}
          unit="% a.a."
          badge={focusIpcaNow !== null ? {
            label: `IPCA Focus: ${focusIpcaNow.toFixed(1)}%`,
            variant: 'outline',
          } : undefined}
          deltaInvert={false}
        />
      </div>

      {/* Selic x IPCA */}
      <SectionCard title="Selic x IPCA 12m — histórico (%)" sectionId="nominal" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={nominalData}
            series={[
              { key: 'selic',  label: 'Selic (a.a.)', color: 'var(--chart-1)' },
              { key: 'ipca12m', label: 'IPCA 12m',    color: 'var(--chart-3)' },
            ]}
            unit="%" height={300} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* Juro real histórico */}
      <SectionCard title="Juro Real Ex-Post (Selic − IPCA 12m)" sectionId="real" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.realRate.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Juro Real', color: 'var(--chart-2)' }]}
            referenceLines={[
              { value: 0, label: '0%', color: 'var(--muted-foreground)' },
              { value: 6, label: '6% (restritivo)', color: 'hsl(0 72% 51%)' },
            ]}
            unit="%" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* DI Over */}
      <SectionCard title="DI Over — taxa diária (%)" sectionId="di" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.diOver.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'DI Over', color: 'var(--chart-4)' }]}
            unit="% a.a." height={220} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* Focus Cards lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FocusCard title="Expectativas Focus — IPCA (%)" rows={data.focusIpca} unit="%" color="var(--chart-3)" />
        <FocusCard title="Expectativas Focus — Selic (% a.a.)" rows={data.focusSelic} unit="% a.a." color="var(--chart-1)" />
      </div>
    </div>
  )
}

function FocusCard({ title, rows, unit, color }: { title: string; rows: FocusRow[]; unit: string; color: string }) {
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => r.median ?? 0))
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.year} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{r.year}</span>
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${((r.median ?? 0) / max) * 100}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-mono font-semibold w-16 text-right">
                {r.median !== null ? `${r.median.toFixed(2)}${unit}` : '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">Mediana das projeções do relatório Focus (BCB)</p>
      </CardContent>
    </Card>
  )
}
