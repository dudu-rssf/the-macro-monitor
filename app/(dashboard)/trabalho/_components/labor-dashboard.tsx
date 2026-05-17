'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface LaborData {
  desempregoKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  rendimentoKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  massaKv:       { latest: SeriesPoint; previous: SeriesPoint | null } | null
  desemprego:    SeriesPoint[]   // 24369
  rendimento:    SeriesPoint[]   // 24380
  massaSalarial: SeriesPoint[]   // 28763
}

interface Props { data: LaborData }

export function LaborDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const desempNow  = data.desempregoKv?.latest.value ?? null
  const desempPrev = data.desempregoKv?.previous?.value ?? null

  // Badge de tendência do desemprego
  const desempBadge = desempNow !== null && desempPrev !== null
    ? desempNow < desempPrev
      ? { label: 'Caindo', variant: 'secondary' as const }
      : desempNow > desempPrev
        ? { label: 'Subindo', variant: 'destructive' as const }
        : { label: 'Estável', variant: 'outline' as const }
    : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mercado de Trabalho</h1>
          <p className="text-sm text-muted-foreground mt-0.5">PNAD Contínua — desemprego, renda e massa salarial</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Taxa de Desocupacao (PNAD)"
          value={desempNow}
          unit="%"
          date={data.desempregoKv?.latest.date}
          delta={desempNow !== null && desempPrev !== null ? desempNow - desempPrev : null}
          badge={desempBadge}
          deltaInvert
        />
        <KpiCard
          title="Rendimento Medio Real Habitual"
          value={data.rendimentoKv?.latest.value ?? null}
          unit=" R$"
          date={data.rendimentoKv?.latest.date}
          delta={data.rendimentoKv?.previous ? data.rendimentoKv.latest.value - data.rendimentoKv.previous.value : null}
          deltaUnit=" R$"
          deltaInvert={false}
        />
        <KpiCard
          title="Massa Salarial Real Ampliada"
          value={data.massaKv?.latest.value !== undefined && data.massaKv?.latest.value !== null
            ? data.massaKv.latest.value / 1000
            : null}
          unit=" bi R$"
          date={data.massaKv?.latest.date}
          delta={data.massaKv?.previous
            ? (data.massaKv.latest.value - data.massaKv.previous.value) / 1000
            : null}
          deltaUnit=" bi R$"
          deltaInvert={false}
        />
      </div>

      {/* ── SEÇÃO: DESEMPREGO ─────────────────────────────────── */}
      <SectionDivider title="Desemprego" description="PNAD Contínua (IBGE) — taxa de desocupação das pessoas de 14 anos ou mais" />

      <SectionCard title="Taxa de Desocupacao — PNAD Continua (%)" sectionId="desemprego" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.desemprego.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Taxa de Desocupacao', color: 'var(--chart-1)' }]}
            referenceLines={[{ value: 5, label: '5% (pleno emprego)', color: 'hsl(142 76% 40%)' }]}
            unit="%" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: RENDA ──────────────────────────────────────── */}
      <SectionDivider title="Renda" description="Rendimento médio real e massa salarial — poder de compra das famílias" />

      <SectionCard title="Rendimento Medio Real Habitual (R$)" sectionId="rendimento" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.rendimento.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Rendimento Medio Real', color: 'var(--chart-2)' }]}
            unit=" R$" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Massa Salarial Real Ampliada (R$ milhoes)" sectionId="massa" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.massaSalarial.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Massa Salarial Real', color: 'var(--chart-4)' }]}
            unit="" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
