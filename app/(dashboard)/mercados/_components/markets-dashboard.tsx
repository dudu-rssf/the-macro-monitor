'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface MarketsData {
  selicKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  usdBrlKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  embiKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  diOverKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  selic:    SeriesPoint[]   // 1178 diário → mensal
  diOver:   SeriesPoint[]   // 7806 diário → mensal
  usdBrl:   SeriesPoint[]   // 10813 diário → mensal
  eurBrl:   SeriesPoint[]   // 21620 diário → mensal
  embi:     SeriesPoint[]   // 11752 diário → mensal
}

interface Props { data: MarketsData }

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

export function MarketsDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('1y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const selicDiData = mergeByDate({ selic: data.selic, di: data.diOver })
  const cambioData  = mergeByDate({ usd: data.usdBrl, eur: data.eurBrl })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mercados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Juros, câmbio e risco-país — dados BCB</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Selic (% a.a.)"
          value={data.selicKv?.latest.value ?? null}
          unit="% a.a."
          date={data.selicKv?.latest.date}
          delta={data.selicKv?.previous ? data.selicKv.latest.value - data.selicKv.previous.value : null}
          deltaUnit="pp"
          deltaInvert={false}
        />
        <KpiCard
          title="DI Over (% a.a.)"
          value={data.diOverKv?.latest.value ?? null}
          unit="% a.a."
          date={data.diOverKv?.latest.date}
          delta={data.diOverKv?.previous ? data.diOverKv.latest.value - data.diOverKv.previous.value : null}
          deltaUnit="pp"
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
          title="EMBI+ (Risco-Brasil)"
          value={data.embiKv?.latest.value ?? null}
          unit=" bps"
          date={data.embiKv?.latest.date}
          delta={data.embiKv?.previous ? data.embiKv.latest.value - data.embiKv.previous.value : null}
          deltaUnit=" bps"
          deltaInvert
        />
      </div>

      {/* ── SEÇÃO: JUROS ──────────────────────────────────── */}
      <SectionDivider title="Juros" description="Selic anualizada e DI Over — referência para todos os ativos de renda fixa" />

      <SectionCard title="Selic e DI Over — % a.a." sectionId="juros" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={selicDiData}
            series={[
              { key: 'selic', label: 'Selic (a.a.)', color: 'var(--chart-1)' },
              { key: 'di',    label: 'DI Over',      color: 'var(--chart-3)' },
            ]}
            unit="% a.a." height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: CÂMBIO ─────────────────────────────────── */}
      <SectionDivider title="Câmbio" description="Taxas de câmbio PTAX — média mensal do último dia útil" />

      <SectionCard title="USD/BRL e EUR/BRL — PTAX venda (R$)" sectionId="cambio" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={cambioData}
            series={[
              { key: 'usd', label: 'USD/BRL', color: 'var(--chart-2)' },
              { key: 'eur', label: 'EUR/BRL', color: 'var(--chart-4)' },
            ]}
            unit=" R$" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: RISCO ──────────────────────────────────── */}
      <SectionDivider title="Risco-País" description="EMBI+ JP Morgan — spread dos títulos brasileiros sobre os Treasuries americanos" />

      <SectionCard title="EMBI+ — Risco-Brasil (pontos-base)" sectionId="embi" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.embi.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'EMBI+', color: 'var(--chart-5)' }]}
            referenceLines={[
              { value: 200, label: '200 bps', color: 'hsl(142 76% 40%)' },
              { value: 400, label: '400 bps', color: 'hsl(0 72% 51%)' },
            ]}
            unit=" bps" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Nota</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <p className="text-xs text-muted-foreground">
            Esta página exibe indicadores de mercado disponíveis no BCB SGS (Selic, DI Over, câmbio PTAX, EMBI+).
            Ibovespa, curva de juros futuros (DI futuro B3) e outros ativos serão adicionados
            na próxima fase via APIs de mercado dedicadas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
