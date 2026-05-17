'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface FiscalData {
  dlspKv:       { latest: SeriesPoint; previous: SeriesPoint | null } | null
  dbggKv:       { latest: SeriesPoint; previous: SeriesPoint | null } | null
  primarioKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  dlsp:         SeriesPoint[]   // 4513 % PIB
  dbgg:         SeriesPoint[]   // 13762 % PIB
  primarioCentral:  SeriesPoint[]   // 5727 R$ milhoes
  primarioTotal:    SeriesPoint[]   // 5793 R$ milhoes
  nfsp:         SeriesPoint[]   // 4649 R$ milhoes
}

interface Props { data: FiscalData }

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

export function FiscalDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const dividaData    = mergeByDate({ dlsp: data.dlsp, dbgg: data.dbgg })
  const primarioData  = mergeByDate({ central: data.primarioCentral, total: data.primarioTotal })

  // Badge para resultado primário (positivo = superávit = bom)
  const primNow  = data.primarioKv?.latest.value ?? null
  const primBadge = primNow !== null
    ? primNow >= 0
      ? { label: 'Superávit', variant: 'secondary' as const }
      : { label: 'Déficit', variant: 'destructive' as const }
    : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dívida pública, resultado primário e necessidade de financiamento</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Divida Liquida SP (% PIB)"
          value={data.dlspKv?.latest.value ?? null}
          unit="% PIB"
          date={data.dlspKv?.latest.date}
          delta={data.dlspKv?.previous ? data.dlspKv.latest.value - data.dlspKv.previous.value : null}
          deltaUnit="pp"
          deltaInvert
        />
        <KpiCard
          title="Divida Bruta GG (% PIB)"
          value={data.dbggKv?.latest.value ?? null}
          unit="% PIB"
          date={data.dbggKv?.latest.date}
          delta={data.dbggKv?.previous ? data.dbggKv.latest.value - data.dbggKv.previous.value : null}
          deltaUnit="pp"
          deltaInvert
        />
        <KpiCard
          title="Resultado Primario (Gov. Central)"
          value={primNow !== null ? primNow / 1000 : null}
          unit=" bi R$"
          date={data.primarioKv?.latest.date}
          delta={data.primarioKv?.previous
            ? (data.primarioKv.latest.value - data.primarioKv.previous.value) / 1000
            : null}
          deltaUnit=" bi R$"
          badge={primBadge}
          deltaInvert={false}
        />
      </div>

      {/* ── SEÇÃO: DÍVIDA ─────────────────────────────────── */}
      <SectionDivider title="Dívida Pública" description="Como proporção do PIB — métrica-chave de sustentabilidade fiscal" />

      <SectionCard title="DLSP e DBGG — % do PIB" sectionId="divida" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={dividaData}
            series={[
              { key: 'dlsp', label: 'DLSP (Divida Liquida SP)', color: 'var(--chart-1)' },
              { key: 'dbgg', label: 'DBGG (Divida Bruta GG)',   color: 'var(--chart-3)' },
            ]}
            referenceLines={[{ value: 60, label: '60% PIB', color: 'hsl(0 72% 51%)' }]}
            unit="%" height={300} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: RESULTADO PRIMÁRIO ──────────────────────── */}
      <SectionDivider title="Resultado Primário" description="Receitas menos despesas, excluindo juros — indica a capacidade de pagamento da dívida" />

      <SectionCard title="Resultado Primario — Gov. Central e Setor Publico (R$ milhoes)" sectionId="primario" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={primarioData}
            series={[
              { key: 'central', label: 'Governo Central', color: 'var(--chart-2)' },
              { key: 'total',   label: 'Setor Publico',   color: 'var(--chart-4)' },
            ]}
            referenceLines={[{ value: 0, label: '0 (equilíbrio)', color: 'var(--muted-foreground)' }]}
            unit="" height={280} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: NFSP ───────────────────────────────────── */}
      <SectionDivider title="Necessidade de Financiamento" description="NFSP inclui juros sobre a dívida — mede o déficit nominal total do setor público" />

      <SectionCard title="NFSP — Necessidade de Financiamento do Setor Publico (R$ milhoes)" sectionId="nfsp" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.nfsp.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'NFSP', color: 'var(--chart-5)' }]}
            referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
            unit="" height={260} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
