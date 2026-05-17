'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface CreditData {
  totalKv:     { latest: SeriesPoint; previous: SeriesPoint | null } | null
  inadimKv:    { latest: SeriesPoint; previous: SeriesPoint | null } | null
  spreadKv:    { latest: SeriesPoint; previous: SeriesPoint | null } | null
  compRendaKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  total:       SeriesPoint[]   // 20631
  pf:          SeriesPoint[]   // 20622
  pj:          SeriesPoint[]   // 20623
  inadimTotal: SeriesPoint[]   // 21082
  inadimPf:    SeriesPoint[]   // 21084
  inadimPj:    SeriesPoint[]   // 21086
  spread:      SeriesPoint[]   // 20786
  compRenda:   SeriesPoint[]   // 19882
}

interface Props { data: CreditData }

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

export function CreditDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const saldoData    = mergeByDate({ pf: data.pf, pj: data.pj })
  const inadimData   = mergeByDate({ total: data.inadimTotal, pf: data.inadimPf, pj: data.inadimPj })

  const totalNow = data.totalKv?.latest.value ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Crédito</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Saldo, inadimplência, spread e comprometimento de renda</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Saldo Total de Credito"
          value={totalNow !== null ? totalNow / 1000 : null}
          unit=" bi R$"
          date={data.totalKv?.latest.date}
          delta={data.totalKv?.previous ? (data.totalKv.latest.value - data.totalKv.previous.value) / 1000 : null}
          deltaUnit=" bi R$"
          deltaInvert={false}
        />
        <KpiCard
          title="Inadimplencia Total (>90d)"
          value={data.inadimKv?.latest.value ?? null}
          unit="%"
          date={data.inadimKv?.latest.date}
          delta={data.inadimKv?.previous ? data.inadimKv.latest.value - data.inadimKv.previous.value : null}
          deltaUnit="pp"
          deltaInvert
        />
        <KpiCard
          title="Spread Medio (p.p.)"
          value={data.spreadKv?.latest.value ?? null}
          unit=" p.p."
          date={data.spreadKv?.latest.date}
          delta={data.spreadKv?.previous ? data.spreadKv.latest.value - data.spreadKv.previous.value : null}
          deltaUnit=" p.p."
          deltaInvert
        />
        <KpiCard
          title="Comprometimento de Renda"
          value={data.compRendaKv?.latest.value ?? null}
          unit="%"
          date={data.compRendaKv?.latest.date}
          delta={data.compRendaKv?.previous ? data.compRendaKv.latest.value - data.compRendaKv.previous.value : null}
          deltaUnit="pp"
          deltaInvert
        />
      </div>

      {/* ── SEÇÃO: SALDO ──────────────────────────────────── */}
      <SectionDivider title="Saldo de Crédito" description="Estoque total de operações de crédito no sistema financeiro (R$ milhões)" />

      <SectionCard title="Saldo Total de Credito (R$ milhoes)" sectionId="saldo-total" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.total.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Saldo Total', color: 'var(--chart-1)' }]}
            unit="" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Saldo por Segmento — PF e PJ (R$ milhoes)" sectionId="saldo-seg" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={saldoData}
            series={[
              { key: 'pf', label: 'Pessoa Fisica',   color: 'var(--chart-2)' },
              { key: 'pj', label: 'Pessoa Juridica', color: 'var(--chart-4)' },
            ]}
            unit="" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: INADIMPLÊNCIA ──────────────────────────── */}
      <SectionDivider title="Inadimplência" description="Percentual da carteira com atraso acima de 90 dias" />

      <SectionCard title="Inadimplencia por segmento (%)" sectionId="inadim" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={inadimData}
            series={[
              { key: 'total', label: 'Total',          color: 'var(--chart-1)' },
              { key: 'pf',    label: 'Pessoa Fisica',  color: 'var(--chart-2)' },
              { key: 'pj',    label: 'Pessoa Juridica',color: 'var(--chart-4)' },
            ]}
            unit="%" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: PREÇO DO CRÉDITO ───────────────────────── */}
      <SectionDivider title="Preço e Comprometimento" description="Custo do crédito e impacto no orçamento das famílias" />

      <SectionCard title="Spread Medio das Operacoes de Credito (p.p.)" sectionId="spread" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.spread.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Spread Medio', color: 'var(--chart-3)' }]}
            unit=" p.p." height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Comprometimento de Renda das Familias (%)" sectionId="comp-renda" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.compRenda.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Comprometimento de Renda', color: 'var(--chart-5)' }]}
            referenceLines={[{ value: 30, label: '30%', color: 'hsl(0 72% 51%)' }]}
            unit="%" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
