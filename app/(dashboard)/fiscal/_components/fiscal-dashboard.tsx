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
  dlsp:             SeriesPoint[]   // 4513  DLSP % PIB
  dbgg:             SeriesPoint[]   // 13762 DBGG % PIB
  primarioCentral:  SeriesPoint[]   // 5727  Primário Gov. Central R$ milhões
  primarioTotal:    SeriesPoint[]   // 5793  Primário Setor Público % PIB (mensal)
  nfsp:             SeriesPoint[]   // 4649  NFSP nominal R$ milhões (mensal)
  nfspSemDesval:    SeriesPoint[]   // 5786  NFSP s/desval cambial nominal % PIB 12m
  primarioSemDesval: SeriesPoint[]  // 5788  NFSP s/desval cambial primário % PIB 12m
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

// Variação anual em pontos percentuais (para séries já em % PIB)
function yoyPP(pts: SeriesPoint[]): SeriesPoint[] {
  const result: SeriesPoint[] = []
  for (let i = 12; i < pts.length; i++) {
    result.push({ date: pts[i].date, value: parseFloat((pts[i].value - pts[i - 12].value).toFixed(2)) })
  }
  return result
}

// Metas do arcabouço fiscal (LC 200/2023) — resultado primário positivo = superávit
const ARCABOUCO_METAS = [
  { year: 2024, meta: -0.5, label: 'Meta 2024 (−0,5% PIB)' },
  { year: 2025, meta:  0.0, label: 'Meta 2025 (0% PIB)'    },
  { year: 2026, meta:  0.5, label: 'Meta 2026 (+0,5% PIB)' },
  { year: 2027, meta:  1.0, label: 'Meta 2027 (+1,0% PIB)' },
]
const META_COLORS = ['hsl(0 72% 51%)', 'hsl(142 71% 45%)', 'hsl(217 91% 60%)', 'hsl(280 65% 60%)']

export function FiscalDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  // Dívida
  const dividaData    = mergeByDate({ dlsp: data.dlsp, dbgg: data.dbgg })
  const dividaYoyData = mergeByDate({ dlsp: yoyPP(data.dlsp), dbgg: yoyPP(data.dbgg) })

  // Primário — Central em R$ mi, Total em % PIB (separados)
  const centralData = data.primarioCentral.map((p) => ({ date: p.date, value: p.value }))
  const totalData   = data.primarioTotal.map((p) => ({ date: p.date, value: p.value }))

  // NFSP sem desval cambial: 5788 é convenção NFSP (positivo = déficit)
  // Negamos para obter "Resultado Primário" (positivo = superávit), comparável às metas
  const resultadoPct = data.primarioSemDesval.map((p) => ({ date: p.date, value: parseFloat((-p.value).toFixed(3)) }))
  const nfspSemDesvalData = mergeByDate({
    nominal:  data.nfspSemDesval,
    primario: data.primarioSemDesval,
  })
  const arcaboucoData = mergeByDate({ resultado: resultadoPct })

  // KPI primário — 5793 já em % PIB
  const primNow  = data.primarioKv?.latest.value ?? null
  const primBadge = primNow !== null
    ? primNow >= 0
      ? { label: 'Superávit', variant: 'secondary' as const }
      : { label: 'Déficit',   variant: 'destructive' as const }
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
          title="Dívida Líquida do Setor Público (% PIB)"
          value={data.dlspKv?.latest.value ?? null}
          unit="% PIB"
          date={data.dlspKv?.latest.date}
          delta={data.dlspKv?.previous ? data.dlspKv.latest.value - data.dlspKv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert
        />
        <KpiCard
          title="Dívida Bruta do Governo Geral (% PIB)"
          value={data.dbggKv?.latest.value ?? null}
          unit="% PIB"
          date={data.dbggKv?.latest.date}
          delta={data.dbggKv?.previous ? data.dbggKv.latest.value - data.dbggKv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert
        />
        <KpiCard
          title="Resultado Primário do Setor Público"
          value={primNow}
          unit="% PIB"
          date={data.primarioKv?.latest.date}
          delta={data.primarioKv?.previous ? data.primarioKv.latest.value - data.primarioKv.previous.value : null}
          deltaUnit=" pp"
          badge={primBadge}
          deltaInvert={false}
        />
      </div>

      {/* ── SEÇÃO: DÍVIDA ─────────────────────────────────── */}
      <SectionDivider title="Dívida Pública" description="Como proporção do PIB — métrica-chave de sustentabilidade fiscal" />

      <SectionCard
        title="Dívida Líquida do Setor Público e Dívida Bruta do Governo Geral (% do PIB)"
        sectionId="divida"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={dividaData}
            series={[
              { key: 'dlsp', label: 'Dívida Líquida do Setor Público', color: 'var(--chart-1)' },
              { key: 'dbgg', label: 'Dívida Bruta do Governo Geral',   color: 'var(--chart-3)' },
            ]}
            referenceLines={[{ value: 60, label: '60% do PIB', color: 'hsl(0 72% 51%)' }]}
            unit="% PIB" height={300} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Variação Anual da Dívida (pontos percentuais do PIB, ano contra ano)"
        sectionId="divida-yoy"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={dividaYoyData}
            series={[
              { key: 'dlsp', label: 'Dívida Líquida do Setor Público', color: 'var(--chart-1)' },
              { key: 'dbgg', label: 'Dívida Bruta do Governo Geral',   color: 'var(--chart-3)' },
            ]}
            referenceLines={[{ value: 0, label: 'Sem variação', color: 'var(--muted-foreground)' }]}
            unit=" pp" height={260} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: RESULTADO PRIMÁRIO ──────────────────────── */}
      <SectionDivider
        title="Resultado Primário"
        description="Receitas menos despesas, excluindo juros — indica a capacidade de serviço da dívida"
      />

      <SectionCard
        title="Resultado Primário do Governo Central (R$ milhões, mensal)"
        sectionId="primario-central"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={centralData}
            series={[{ key: 'value', label: 'Governo Central', color: 'var(--chart-2)' }]}
            referenceLines={[{ value: 0, label: '0 (equilíbrio)', color: 'var(--muted-foreground)' }]}
            unit=" R$ mi" height={260} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Resultado Primário do Setor Público Consolidado (% do PIB, mensal)"
        sectionId="primario-total"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={totalData}
            series={[{ key: 'value', label: 'Setor Público Consolidado', color: 'var(--chart-4)' }]}
            referenceLines={[{ value: 0, label: '0 (equilíbrio)', color: 'var(--muted-foreground)' }]}
            unit="% PIB" height={260} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: ARCABOUÇO FISCAL ───────────────────────── */}
      <SectionDivider
        title="Arcabouço Fiscal"
        description="Metas de resultado primário definidas pela Lei Complementar 200/2023 — positivo = superávit"
      />

      <SectionCard
        title="Resultado Primário do Setor Público — % do PIB, acumulado 12 meses, sem desvalorização cambial"
        sectionId="arcabouco"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={arcaboucoData}
            series={[{ key: 'resultado', label: 'Resultado Primário (acumulado 12 meses)', color: 'var(--chart-2)' }]}
            referenceLines={[
              ...ARCABOUCO_METAS.map((m, i) => ({ value: m.meta, label: m.label, color: META_COLORS[i] })),
            ]}
            unit="% PIB" height={320} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: NFSP ───────────────────────────────────── */}
      <SectionDivider
        title="Necessidade de Financiamento"
        description="NFSP inclui juros sobre a dívida — mede o déficit nominal total do setor público"
      />

      <SectionCard
        title="NFSP — Necessidade de Financiamento do Setor Público (R$ milhões, mensal)"
        sectionId="nfsp"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={data.nfsp.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'NFSP Nominal', color: 'var(--chart-5)' }]}
            referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
            unit=" R$ mi" height={260} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard
        title="NFSP sem Desvalorização Cambial — Resultado Nominal e Primário (% do PIB, acumulado 12 meses)"
        sectionId="nfsp-desval"
        {...sectionProps}
      >
        {(range) => (
          <MacroChart
            allData={nfspSemDesvalData}
            series={[
              { key: 'nominal',  label: 'Resultado Nominal (acumulado 12 meses)',  color: 'var(--chart-5)' },
              { key: 'primario', label: 'Resultado Primário (acumulado 12 meses)', color: 'var(--chart-2)' },
            ]}
            referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
            unit="% PIB" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
