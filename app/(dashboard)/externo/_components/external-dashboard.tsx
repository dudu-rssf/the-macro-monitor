'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface ExternalData {
  balancaKv:    { latest: SeriesPoint; previous: SeriesPoint | null } | null
  reservasKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  embiKv:       { latest: SeriesPoint; previous: SeriesPoint | null } | null
  usdBrlKv:     { latest: SeriesPoint; previous: SeriesPoint | null } | null
  balanca:      SeriesPoint[]   // 22701 saldo comercial
  transCorr:    SeriesPoint[]   // 22707 transacoes correntes
  reservas:     SeriesPoint[]   // 3546
  embi:         SeriesPoint[]   // 11752
  usdBrl:       SeriesPoint[]   // 10813 PTAX venda
  eurBrl:       SeriesPoint[]   // 21620 PTAX venda
}

interface Props { data: ExternalData }

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

export function ExternalDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const cambioData    = mergeByDate({ usd: data.usdBrl, eur: data.eurBrl })
  const contaExternaData = mergeByDate({ balanca: data.balanca, transCorr: data.transCorr })

  const embiNow = data.embiKv?.latest.value ?? null
  const embiBadge = embiNow !== null
    ? embiNow < 200
      ? { label: 'Baixo risco', variant: 'secondary' as const }
      : embiNow < 400
        ? { label: 'Risco moderado', variant: 'outline' as const }
        : { label: 'Alto risco', variant: 'destructive' as const }
    : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Setor Externo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Câmbio, balanço de pagamentos, reservas e risco-país</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          title="Balanca Comercial"
          value={data.balancaKv?.latest.value !== undefined ? (data.balancaKv!.latest.value / 1000) : null}
          unit=" bi US$"
          date={data.balancaKv?.latest.date}
          delta={data.balancaKv?.previous
            ? (data.balancaKv.latest.value - data.balancaKv.previous.value) / 1000
            : null}
          deltaUnit=" bi US$"
          deltaInvert={false}
        />
        <KpiCard
          title="Reservas Internacionais"
          value={data.reservasKv?.latest.value !== undefined ? (data.reservasKv!.latest.value / 1000) : null}
          unit=" bi US$"
          date={data.reservasKv?.latest.date}
          delta={data.reservasKv?.previous
            ? (data.reservasKv.latest.value - data.reservasKv.previous.value) / 1000
            : null}
          deltaUnit=" bi US$"
          deltaInvert={false}
        />
        <KpiCard
          title="EMBI+ (Risco-Brasil)"
          value={embiNow}
          unit=" bps"
          date={data.embiKv?.latest.date}
          delta={data.embiKv?.previous ? data.embiKv.latest.value - data.embiKv.previous.value : null}
          deltaUnit=" bps"
          badge={embiBadge}
          deltaInvert
        />
      </div>

      {/* ── SEÇÃO: CÂMBIO ─────────────────────────────────── */}
      <SectionDivider title="Câmbio" description="Taxas de câmbio PTAX (Banco Central do Brasil)" />

      <SectionCard title="USD/BRL e EUR/BRL — PTAX venda (R$)" sectionId="cambio" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={cambioData}
            series={[
              { key: 'usd', label: 'USD/BRL', color: 'var(--chart-1)' },
              { key: 'eur', label: 'EUR/BRL', color: 'var(--chart-3)' },
            ]}
            unit=" R$" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: BALANÇO DE PAGAMENTOS ──────────────────── */}
      <SectionDivider title="Balanço de Pagamentos" description="Fluxos financeiros entre o Brasil e o resto do mundo (US$ milhões)" />

      <SectionCard title="Balanca Comercial e Transacoes Correntes (US$ milhoes)" sectionId="bp" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={contaExternaData}
            series={[
              { key: 'balanca',  label: 'Balanca Comercial',     color: 'var(--chart-2)' },
              { key: 'transCorr', label: 'Transacoes Correntes', color: 'var(--chart-4)' },
            ]}
            referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
            unit="" height={280} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: RESERVAS E RISCO ───────────────────────── */}
      <SectionDivider title="Reservas e Risco-País" description="Capacidade de pagamento externo e prêmio de risco soberano" />

      <SectionCard title="Reservas Internacionais — Total (US$ milhoes)" sectionId="reservas" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.reservas.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Reservas Internacionais', color: 'var(--chart-2)' }]}
            unit="" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="EMBI+ JP Morgan — Risco-Brasil (pontos-base)" sectionId="embi" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.embi.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'EMBI+', color: 'var(--chart-5)' }]}
            referenceLines={[
              { value: 200, label: '200 bps', color: 'hsl(142 76% 40%)' },
              { value: 400, label: '400 bps', color: 'hsl(0 72% 51%)' },
            ]}
            unit=" bps" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
