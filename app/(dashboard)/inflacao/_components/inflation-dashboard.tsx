'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from './kpi-card'
import { MacroChart } from './macro-chart'
import { Glossary } from './glossary'

export type TimeRange = '6m' | '1y' | '2y' | '5y' | '10y' | 'max'

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '6m',  label: '6M' },
  { value: '1y',  label: '1A' },
  { value: '2y',  label: '2A' },
  { value: '5y',  label: '5A' },
  { value: '10y', label: '10A' },
  { value: 'max', label: 'Máx' },
]

interface SeriesPoint { date: string; value: number }

interface InflationData {
  // KV data
  ipcaKv:     { latest: SeriesPoint; previous: SeriesPoint | null } | null
  ipca12mKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  nucleoMsKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  igpmKv:     { latest: SeriesPoint; previous: SeriesPoint | null } | null
  // Chart data (full history, filtered client-side)
  ipca:       SeriesPoint[]
  ipca15:     SeriesPoint[]
  ipca12m:    SeriesPoint[]
  nucleoMs:   SeriesPoint[]  // 16121 Medias aparadas c/ suavizacao
  nucleoMa:   SeriesPoint[]  // 27838 Medias aparadas s/ suavizacao
  nucleoEx:   SeriesPoint[]  // 27839 Por exclusao
  nucleoDp:   SeriesPoint[]  // 11427 Dupla ponderacao
  nucleoP55:  SeriesPoint[]  // 28750 P55
  difusao:    SeriesPoint[]  // 11428
  igpm:       SeriesPoint[]  // 188
  igpdi:      SeriesPoint[]  // 189
  ipam:       SeriesPoint[]  // 225 IPA-M
  ipcm:       SeriesPoint[]  // 191 IPC-M
  inccm:      SeriesPoint[]  // 192 INCC-M
  inpc:       SeriesPoint[]  // 4466
}

interface Props {
  data: InflationData
  metaCentral: number
  metaTeto: number
}

function RangeSelector({
  active,
  onChange,
}: {
  active: TimeRange | null
  onChange: (r: TimeRange) => void
}) {
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <Button
          key={r.value}
          variant={active === r.value ? 'secondary' : 'ghost'}
          size="sm"
          className={`h-6 px-2 text-xs font-mono ${active === r.value ? '' : 'text-muted-foreground'}`}
          onClick={() => onChange(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  )
}

function SectionCard({
  title,
  sectionId,
  globalRange,
  sectionOverrides,
  onGlobalChange,
  onSectionChange,
  children,
}: {
  title: string
  sectionId: string
  globalRange: TimeRange | null
  sectionOverrides: Record<string, TimeRange>
  onGlobalChange: (r: TimeRange) => void
  onSectionChange: (id: string, r: TimeRange) => void
  children: (effectiveRange: TimeRange) => React.ReactNode
}) {
  const effectiveRange: TimeRange = sectionOverrides[sectionId] ?? globalRange ?? '2y'
  const isOverridden = sectionId in sectionOverrides

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <RangeSelector
            active={isOverridden ? sectionOverrides[sectionId] : null}
            onChange={(r) => onSectionChange(sectionId, r)}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        {children(effectiveRange)}
      </CardContent>
    </Card>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeByDate(seriesMap: Record<string, SeriesPoint[]>): any[] {
  const dateSet = new Set<string>()
  for (const data of Object.values(seriesMap)) {
    data.forEach((p) => dateSet.add(p.date))
  }
  const dates = Array.from(dateSet).sort()
  return dates.map((date) => {
    const row: Record<string, string | number> = { date }
    for (const [key, data] of Object.entries(seriesMap)) {
      const point = data.find((p) => p.date === date)
      if (point !== undefined) row[key] = point.value
    }
    return row
  })
}

export function InflationDashboard({ data, metaCentral, metaTeto }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) {
    setGlobalRange(r)
    setSectionOverrides({})
  }

  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  // Status meta
  const ipca12mValue = data.ipca12mKv?.latest.value ?? 0
  const metaBadge = ipca12mValue <= metaTeto
    ? { label: 'Dentro da meta', variant: 'secondary' as const }
    : { label: 'Acima do teto', variant: 'destructive' as const }

  // Merged chart datasets
  const panoramaData = mergeByDate({ ipca12m: data.ipca12m, ipca: data.ipca, ipca15: data.ipca15 })
  const nucleosData  = mergeByDate({ ms: data.nucleoMs, ma: data.nucleoMa, ex: data.nucleoEx, dp: data.nucleoDp, p55: data.nucleoP55 })
  const igpmData     = mergeByDate({ igpm: data.igpm, igpdi: data.igpdi })
  const igpmCompData = mergeByDate({ ipam: data.ipam, ipcm: data.ipcm, inccm: data.inccm })
  const comparData   = mergeByDate({ ipca: data.ipca, inpc: data.inpc, igpm: data.igpm })

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  return (
    <div className="space-y-6">

      {/* Header + Global Range */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inflação</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Meta BCB: {metaCentral}% · Teto: {metaTeto}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="IPCA Mensal"
          value={data.ipcaKv?.latest.value ?? null}
          date={data.ipcaKv?.latest.date}
          delta={data.ipcaKv?.previous ? data.ipcaKv.latest.value - data.ipcaKv.previous.value : null}
          deltaInvert
        />
        <KpiCard
          title="IPCA Acumulado 12m"
          value={data.ipca12mKv?.latest.value ?? null}
          date={data.ipca12mKv?.latest.date}
          delta={data.ipca12mKv?.previous ? data.ipca12mKv.latest.value - data.ipca12mKv.previous.value : null}
          badge={metaBadge}
          deltaInvert
        />
        <KpiCard
          title="Nucleo IPCA (ap. c/ suav.)"
          value={data.nucleoMsKv?.latest.value ?? null}
          date={data.nucleoMsKv?.latest.date}
          delta={data.nucleoMsKv?.previous ? data.nucleoMsKv.latest.value - data.nucleoMsKv.previous.value : null}
          deltaInvert
        />
        <KpiCard
          title="IGP-M Mensal"
          value={data.igpmKv?.latest.value ?? null}
          date={data.igpmKv?.latest.date}
          delta={data.igpmKv?.previous ? data.igpmKv.latest.value - data.igpmKv.previous.value : null}
          deltaInvert
        />
      </div>

      {/* Panorama */}
      <SectionCard title="Panorama — IPCA e acumulados" sectionId="panorama" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={panoramaData}
            series={[
              { key: 'ipca12m', label: 'IPCA 12m',    color: 'var(--chart-1)' },
              { key: 'ipca',    label: 'IPCA Mensal',  color: 'var(--chart-2)' },
              { key: 'ipca15',  label: 'IPCA-15',      color: 'var(--chart-4)' },
            ]}
            referenceLines={[
              { value: metaCentral, label: `Meta ${metaCentral}%`, color: 'hsl(142 76% 40%)' },
              { value: metaTeto,    label: `Teto ${metaTeto}%`,    color: 'hsl(0 72% 51%)' },
            ]}
            unit="%"
            height={300}
            effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* IPCA em Detalhe — Difusão */}
      <SectionCard title="Difusao do IPCA — itens com alta (%)" sectionId="difusao" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.difusao.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Difusao', color: 'var(--chart-5)' }]}
            referenceLines={[{ value: 50, label: '50%', color: 'var(--muted-foreground)' }]}
            unit="%"
            height={220}
            chartType="bar"
            effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* Nucleos */}
      <SectionCard title="Nucleos do IPCA — 5 medidas BCB (%)" sectionId="nucleos" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={nucleosData}
            series={[
              { key: 'ms',  label: 'Med. Ap. c/ Suav.',  color: 'var(--chart-1)' },
              { key: 'ma',  label: 'Med. Ap. s/ Suav.',  color: 'var(--chart-2)' },
              { key: 'ex',  label: 'Por Exclusao',       color: 'var(--chart-3)' },
              { key: 'dp',  label: 'Dupla Ponderacao',   color: 'var(--chart-4)' },
              { key: 'p55', label: 'P55',                color: 'var(--chart-5)' },
            ]}
            referenceLines={[
              { value: metaCentral, label: `Meta ${metaCentral}%`, color: 'hsl(142 76% 40%)' },
              { value: metaTeto,    label: `Teto ${metaTeto}%`,    color: 'hsl(0 72% 51%)' },
            ]}
            unit="%"
            height={320}
            effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* IGP-M */}
      <SectionCard title="IGP-M e IGP-DI — variacao mensal (%)" sectionId="igpm" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={igpmData}
            series={[
              { key: 'igpm',  label: 'IGP-M',  color: 'var(--chart-1)' },
              { key: 'igpdi', label: 'IGP-DI', color: 'var(--chart-3)' },
            ]}
            unit="%"
            height={240}
            chartType="bar"
            effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* IGP-M Componentes */}
      <SectionCard title="Componentes do IGP-M (%)" sectionId="igpm-comp" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={igpmCompData}
            series={[
              { key: 'ipam',  label: 'IPA-M (atacado)',    color: 'var(--chart-2)' },
              { key: 'ipcm',  label: 'IPC-M (consumidor)', color: 'var(--chart-4)' },
              { key: 'inccm', label: 'INCC-M (construcao)',color: 'var(--chart-5)' },
            ]}
            unit="%"
            height={260}
            effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* Comparativo */}
      <SectionCard title="Comparativo de indices — variacao mensal (%)" sectionId="comparativo" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={comparData}
            series={[
              { key: 'ipca', label: 'IPCA',  color: 'var(--chart-1)' },
              { key: 'inpc', label: 'INPC',  color: 'var(--chart-2)' },
              { key: 'igpm', label: 'IGP-M', color: 'var(--chart-3)' },
            ]}
            unit="%"
            height={260}
            effectiveRange={range}
          />
        )}
      </SectionCard>

      <Glossary />
    </div>
  )
}
