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
  total:        SeriesPoint[]   // 20631 Saldo total R$ mi
  pf:           SeriesPoint[]   // 20622 Saldo PF R$ mi
  pj:           SeriesPoint[]   // 20623 Saldo PJ R$ mi
  inadimTotal:  SeriesPoint[]   // 21082 Inadimplência total %
  inadimPf:     SeriesPoint[]   // 21084 Inadimplência PF %
  inadimPj:     SeriesPoint[]   // 21086 Inadimplência PJ %
  spread:       SeriesPoint[]   // 20786 Spread total p.p.
  spreadPf:     SeriesPoint[]   // 20787 Spread PF p.p.
  compRenda:    SeriesPoint[]   // 19882 Comprometimento renda %
  taxaTotal:    SeriesPoint[]   // 20714 Taxa total % a.a.
  taxaPf:       SeriesPoint[]   // 20751 Taxa PF % a.a.
  endividamento: SeriesPoint[]  // 29037 Endividamento % renda bruta
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

  const saldoSegData  = mergeByDate({ pf: data.pf, pj: data.pj })
  const inadimData    = mergeByDate({ total: data.inadimTotal, pf: data.inadimPf, pj: data.inadimPj })
  const spreadData    = mergeByDate({ total: data.spread, pf: data.spreadPf })
  const taxaData      = mergeByDate({ total: data.taxaTotal, pf: data.taxaPf })
  const endivData     = mergeByDate({ endividamento: data.endividamento, comprometimento: data.compRenda })

  const totalNow = data.totalKv?.latest.value ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Crédito</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Saldo, inadimplência, custo do crédito e endividamento das famílias</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Saldo Total de Crédito"
          value={totalNow !== null ? totalNow / 1000 : null}
          unit=" bi R$"
          date={data.totalKv?.latest.date}
          delta={data.totalKv?.previous ? (data.totalKv.latest.value - data.totalKv.previous.value) / 1000 : null}
          deltaUnit=" bi R$"
          deltaInvert={false}
        />
        <KpiCard
          title="Inadimplência Total (>90 dias)"
          value={data.inadimKv?.latest.value ?? null}
          unit="%"
          date={data.inadimKv?.latest.date}
          delta={data.inadimKv?.previous ? data.inadimKv.latest.value - data.inadimKv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert
        />
        <KpiCard
          title="Spread Médio das Operações"
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
          deltaUnit=" pp"
          deltaInvert
        />
      </div>

      {/* ── SEÇÃO: SALDO DE CRÉDITO ──────────────────────── */}
      <SectionDivider title="Saldo de Crédito" description="Estoque total de operações de crédito no Sistema Financeiro Nacional (R$ milhões)" />

      <SectionCard title="Saldo Total de Crédito do Sistema Financeiro Nacional (R$ milhões)" sectionId="saldo-total" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.total.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Saldo Total de Crédito', color: 'var(--chart-1)' }]}
            unit=" R$ mi" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Saldo de Crédito por Segmento — Pessoa Física e Pessoa Jurídica (R$ milhões)" sectionId="saldo-seg" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={saldoSegData}
            series={[
              { key: 'pf', label: 'Pessoa Física',   color: 'var(--chart-2)' },
              { key: 'pj', label: 'Pessoa Jurídica', color: 'var(--chart-4)' },
            ]}
            unit=" R$ mi" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: INADIMPLÊNCIA ──────────────────────────── */}
      <SectionDivider title="Inadimplência" description="Percentual da carteira de crédito com atraso superior a 90 dias" />

      <SectionCard title="Taxa de Inadimplência por Segmento (%, atraso > 90 dias)" sectionId="inadim" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={inadimData}
            series={[
              { key: 'total', label: 'Total do Sistema',    color: 'var(--chart-1)' },
              { key: 'pf',    label: 'Pessoa Física',       color: 'var(--chart-2)' },
              { key: 'pj',    label: 'Pessoa Jurídica',     color: 'var(--chart-4)' },
            ]}
            unit="%" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: CUSTO DO CRÉDITO ──────────────────────── */}
      <SectionDivider title="Custo do Crédito" description="Taxas de juros e spread médio das operações de crédito do Sistema Financeiro Nacional" />

      <SectionCard title="Taxa de Juros Média das Operações de Crédito (% ao ano)" sectionId="taxa" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={taxaData}
            series={[
              { key: 'total', label: 'Total do Sistema', color: 'var(--chart-1)' },
              { key: 'pf',    label: 'Pessoa Física',    color: 'var(--chart-2)' },
            ]}
            unit="% a.a." height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Spread Médio das Operações de Crédito (pontos percentuais)" sectionId="spread" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={spreadData}
            series={[
              { key: 'total', label: 'Total do Sistema', color: 'var(--chart-3)' },
              { key: 'pf',    label: 'Pessoa Física',    color: 'var(--chart-2)' },
            ]}
            unit=" p.p." height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: ENDIVIDAMENTO DAS FAMÍLIAS ────────────── */}
      <SectionDivider title="Endividamento das Famílias" description="Carga financeira em relação à renda — indicador de vulnerabilidade das famílias brasileiras" />

      <SectionCard
        title="Endividamento e Comprometimento de Renda das Famílias (%)"
        sectionId="endividamento"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={endivData}
            series={[
              { key: 'endividamento',   label: 'Endividamento Total (% da renda bruta acumulada 12 meses)',       color: 'var(--chart-5)' },
              { key: 'comprometimento', label: 'Comprometimento de Renda com Serviço da Dívida (%, com ajuste sazonal)', color: 'var(--chart-1)' },
            ]}
            unit="%" height={300} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
