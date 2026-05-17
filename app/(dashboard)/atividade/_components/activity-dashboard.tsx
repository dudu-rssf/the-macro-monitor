'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface ActivityData {
  ibcBrKv:    { latest: SeriesPoint; previous: SeriesPoint | null } | null
  prodIndKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  iccKv:      { latest: SeriesPoint; previous: SeriesPoint | null } | null
  varejoKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  ibcBrSa:    SeriesPoint[]   // 24364 c/ ajuste sazonal
  ibcBrNsa:   SeriesPoint[]   // 24363 s/ ajuste sazonal
  prodInd:    SeriesPoint[]   // 21859
  varejo:     SeriesPoint[]   // 1455
  icc:        SeriesPoint[]   // 22099 consumidor
  ici:        SeriesPoint[]   // 22023 industria
  ics:        SeriesPoint[]   // 22021 servicos
  pib:        SeriesPoint[]   // 28503 trimestral
}

interface Props { data: ActivityData }

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

export function ActivityDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const ibcData      = mergeByDate({ sa: data.ibcBrSa, nsa: data.ibcBrNsa })
  const confiancaData = mergeByDate({ icc: data.icc, ici: data.ici, ics: data.ics })

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const ibcNow = data.ibcBrKv?.latest.value ?? null
  const ibcPrev = data.ibcBrKv?.previous?.value ?? null
  const ibcDelta = ibcNow !== null && ibcPrev !== null ? ((ibcNow - ibcPrev) / ibcPrev) * 100 : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Atividade Econômica</h1>
          <p className="text-sm text-muted-foreground mt-0.5">IBC-Br, produção industrial, varejo e confiança</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="IBC-Br (c/ ajuste saz.)"
          value={ibcNow}
          unit=""
          date={data.ibcBrKv?.latest.date}
          delta={ibcDelta}
          deltaUnit="%"
          deltaInvert={false}
        />
        <KpiCard
          title="Producao Industrial"
          value={data.prodIndKv?.latest.value ?? null}
          unit=""
          date={data.prodIndKv?.latest.date}
          delta={data.prodIndKv?.previous ? data.prodIndKv.latest.value - data.prodIndKv.previous.value : null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Varejo Ampliado (vol.)"
          value={data.varejoKv?.latest.value ?? null}
          unit=""
          date={data.varejoKv?.latest.date}
          delta={data.varejoKv?.previous ? data.varejoKv.latest.value - data.varejoKv.previous.value : null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Confianca Consumidor"
          value={data.iccKv?.latest.value ?? null}
          unit=" pts"
          date={data.iccKv?.latest.date}
          delta={data.iccKv?.previous ? data.iccKv.latest.value - data.iccKv.previous.value : null}
          deltaUnit=" pts"
          deltaInvert={false}
        />
      </div>

      {/* ── SEÇÃO: ATIVIDADE ─────────────────────────────────── */}
      <SectionDivider title="Nível de Atividade" description="Indicadores de volume e produção da economia" />

      <SectionCard title="IBC-Br — proxy mensal do PIB (indice)" sectionId="ibc" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={ibcData}
            series={[
              { key: 'sa',  label: 'IBC-Br c/ ajuste saz.', color: 'var(--chart-1)' },
              { key: 'nsa', label: 'IBC-Br s/ ajuste saz.', color: 'var(--chart-3)' },
            ]}
            unit="" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Producao Industrial — IBGE (indice)" sectionId="prod-ind" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.prodInd.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Prod. Industrial', color: 'var(--chart-2)' }]}
            unit="" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Varejo Ampliado — volume de vendas IBGE (indice)" sectionId="varejo" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.varejo.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Varejo Ampliado', color: 'var(--chart-4)' }]}
            unit="" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: CONFIANÇA ─────────────────────────────────── */}
      <SectionDivider title="Confiança" description="Índices FGV de confiança — antecedentes da atividade (base 100 = média histórica)" />

      <SectionCard title="Indices de Confianca FGV (pontos)" sectionId="confianca" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={confiancaData}
            series={[
              { key: 'icc', label: 'Consumidor (ICC)', color: 'var(--chart-1)' },
              { key: 'ici', label: 'Industria (ICI)',  color: 'var(--chart-2)' },
              { key: 'ics', label: 'Servicos (ICS)',   color: 'var(--chart-3)' },
            ]}
            unit=" pts" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: PIB ───────────────────────────────────────── */}
      <SectionDivider title="PIB" description="Produto Interno Bruto — acumulado em 4 trimestres (R$ milhões correntes)" />

      <SectionCard title="PIB acumulado 4 trimestres (R$ milhoes)" sectionId="pib" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.pib.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'PIB', color: 'var(--chart-5)' }]}
            unit="" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
