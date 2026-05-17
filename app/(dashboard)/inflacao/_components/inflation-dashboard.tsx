'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import { Glossary } from './glossary'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

export type { TimeRange }

interface InflationData {
  ipcaKv:     { latest: SeriesPoint; previous: SeriesPoint | null } | null
  ipca12mKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  nucleoMsKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  igpmKv:     { latest: SeriesPoint; previous: SeriesPoint | null } | null
  ipca:       SeriesPoint[]
  ipca15:     SeriesPoint[]
  ipca12m:    SeriesPoint[]
  nucleoMs:   SeriesPoint[]
  nucleoMa:   SeriesPoint[]
  nucleoEx:   SeriesPoint[]
  nucleoDp:   SeriesPoint[]
  nucleoP55:  SeriesPoint[]
  difusao:    SeriesPoint[]
  igpm:       SeriesPoint[]
  igpdi:      SeriesPoint[]
  ipam:       SeriesPoint[]
  ipcm:       SeriesPoint[]
  inccm:      SeriesPoint[]
  inpc:       SeriesPoint[]
  icbrGeral:  SeriesPoint[]
  icbrAgro:   SeriesPoint[]
  icbrMetal:  SeriesPoint[]
  icbrEnergia: SeriesPoint[]
  // Grupos IPCA
  gr1635: SeriesPoint[]   // Alimentação e bebidas
  gr1636: SeriesPoint[]   // Habitação
  gr1637: SeriesPoint[]   // Artigos de residência
  gr1638: SeriesPoint[]   // Vestuário
  gr1639: SeriesPoint[]   // Transportes
  gr1640: SeriesPoint[]   // Saúde e cuidados pessoais
  gr1641: SeriesPoint[]   // Despesas pessoais
  gr1642: SeriesPoint[]   // Educação
  gr1643: SeriesPoint[]   // Comunicação
}

interface Props {
  data: InflationData
  metaCentral: number
  metaTeto: number
}

function rolling12m(pts: SeriesPoint[]): SeriesPoint[] {
  const result: SeriesPoint[] = []
  for (let i = 11; i < pts.length; i++) {
    let acc = 1
    for (let j = i - 11; j <= i; j++) acc *= (1 + pts[j].value / 100)
    result.push({ date: pts[i].date, value: parseFloat(((acc - 1) * 100).toFixed(2)) })
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeByDate(seriesMap: Record<string, SeriesPoint[]>): any[] {
  const dateSet = new Set<string>()
  for (const data of Object.values(seriesMap)) data.forEach((p) => dateSet.add(p.date))
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

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const ipca12mValue = data.ipca12mKv?.latest.value ?? 0
  const metaBadge = ipca12mValue <= metaTeto
    ? { label: 'Dentro da meta', variant: 'secondary' as const }
    : { label: 'Acima do teto', variant: 'destructive' as const }

  const panoramaData = mergeByDate({ ipca12m: data.ipca12m, ipca: data.ipca, ipca15: data.ipca15 })
  const nucleosData  = mergeByDate({
    ms:  rolling12m(data.nucleoMs),
    ma:  rolling12m(data.nucleoMa),
    ex:  rolling12m(data.nucleoEx),
    dp:  rolling12m(data.nucleoDp),
    p55: rolling12m(data.nucleoP55),
  })
  // Pré-computa rolling 12m de cada grupo
  const r12 = {
    alim: rolling12m(data.gr1635),
    hab:  rolling12m(data.gr1636),
    res:  rolling12m(data.gr1637),
    ves:  rolling12m(data.gr1638),
    tra:  rolling12m(data.gr1639),
    sau:  rolling12m(data.gr1640),
    des:  rolling12m(data.gr1641),
    edu:  rolling12m(data.gr1642),
    com:  rolling12m(data.gr1643),
  }

  // Decomposição por grupos (cada um em sua própria série)
  const gruposData = mergeByDate({
    alimentacao: r12.alim, habitacao: r12.hab, residencia: r12.res,
    vestuario:   r12.ves,  transportes: r12.tra, saude: r12.sau,
    despesas:    r12.des,  educacao: r12.edu,  comunicacao: r12.com,
  })

  // Áreas de influência (média simples dos grupos de cada área):
  // Câmbio: Alimentação, Artigos de residência, Transportes
  // Renda:  Saúde, Despesas pessoais, Educação, Comunicação
  // Juros:  Habitação, Vestuário
  function avgSeries(seriesList: SeriesPoint[][]): SeriesPoint[] {
    const merged = mergeByDate(Object.fromEntries(seriesList.map((s, i) => [String(i), s])))
    const n = seriesList.length
    return merged
      .filter((row) => seriesList.every((_, i) => row[String(i)] !== undefined))
      .map((row) => ({
        date:  row.date as string,
        value: parseFloat((seriesList.reduce((sum, _, i) => sum + (row[String(i)] as number), 0) / n).toFixed(2)),
      }))
  }

  const areasData = mergeByDate({
    cambio: avgSeries([r12.alim, r12.res, r12.tra]),
    renda:  avgSeries([r12.sau, r12.des, r12.edu, r12.com]),
    juros:  avgSeries([r12.hab, r12.ves]),
  })

  const igpmData     = mergeByDate({ igpm: data.igpm, igpdi: data.igpdi })
  const igpmCompData = mergeByDate({ ipam: data.ipam, ipcm: data.ipcm, inccm: data.inccm })
  const comparData   = mergeByDate({ ipca: data.ipca, inpc: data.inpc, igpm: data.igpm })
  const icbrCompData = mergeByDate({ agro: data.icbrAgro, metal: data.icbrMetal, energia: data.icbrEnergia })

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  return (
    <div className="space-y-6">

      {/* Header */}
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
        <KpiCard title="IPCA Mensal" value={data.ipcaKv?.latest.value ?? null}
          date={data.ipcaKv?.latest.date}
          delta={data.ipcaKv?.previous ? data.ipcaKv.latest.value - data.ipcaKv.previous.value : null} deltaInvert />
        <KpiCard title="IPCA Acumulado 12 Meses" value={data.ipca12mKv?.latest.value ?? null}
          date={data.ipca12mKv?.latest.date}
          delta={data.ipca12mKv?.previous ? data.ipca12mKv.latest.value - data.ipca12mKv.previous.value : null}
          badge={metaBadge} deltaInvert />
        <KpiCard title="Núcleo IPCA — Médias Aparadas com Suavização" value={data.nucleoMsKv?.latest.value ?? null}
          date={data.nucleoMsKv?.latest.date}
          delta={data.nucleoMsKv?.previous ? data.nucleoMsKv.latest.value - data.nucleoMsKv.previous.value : null} deltaInvert />
        <KpiCard title="IGP-M Mensal" value={data.igpmKv?.latest.value ?? null}
          date={data.igpmKv?.latest.date}
          delta={data.igpmKv?.previous ? data.igpmKv.latest.value - data.igpmKv.previous.value : null} deltaInvert />
      </div>

      {/* ── SEÇÃO: IPCA ─────────────────────────────────────── */}
      <SectionDivider title="IPCA" description="Índice Nacional de Preços ao Consumidor Amplo — índice oficial de inflação" />

      <SectionCard title="Panorama — IPCA e acumulados" sectionId="panorama" {...sectionProps}>
        {(range) => (
          <MacroChart allData={panoramaData}
            series={[
              { key: 'ipca12m', label: 'IPCA (12 meses)',   color: 'var(--chart-1)' },
              { key: 'ipca',    label: 'IPCA Mensal', color: 'var(--chart-2)' },
              { key: 'ipca15',  label: 'IPCA-15',     color: 'var(--chart-4)' },
            ]}
            referenceLines={[
              { value: metaCentral, label: `Meta ${metaCentral}%`, color: 'hsl(142 76% 40%)' },
              { value: metaTeto,    label: `Teto ${metaTeto}%`,    color: 'hsl(0 72% 51%)' },
            ]}
            unit="%" height={300} effectiveRange={range} />
        )}
      </SectionCard>

      <SectionCard title="Difusão do IPCA — itens com alta (%)" sectionId="difusao" {...sectionProps}>
        {(range) => (
          <MacroChart allData={data.difusao.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Difusão', color: 'var(--chart-5)' }]}
            referenceLines={[{ value: 50, label: '50%', color: 'var(--muted-foreground)' }]}
            unit="%" height={220} chartType="bar" effectiveRange={range} />
        )}
      </SectionCard>

      <SectionCard title="Núcleos do IPCA — 5 medidas BCB (acumulado 12 meses, %)" sectionId="nucleos" {...sectionProps}>
        {(range) => (
          <MacroChart allData={nucleosData}
            series={[
              { key: 'ms',  label: 'Médias Aparadas com Suavização', color: 'var(--chart-1)' },
              { key: 'ma',  label: 'Médias Aparadas sem Suavização',  color: 'var(--chart-2)' },
              { key: 'ex',  label: 'Por Exclusão',                    color: 'var(--chart-3)' },
              { key: 'dp',  label: 'Dupla Ponderação',                color: 'var(--chart-4)' },
              { key: 'p55', label: 'P55',                             color: 'var(--chart-5)' },
            ]}
            referenceLines={[
              { value: metaCentral, label: `Meta ${metaCentral}%`, color: 'hsl(142 76% 40%)' },
              { value: metaTeto,    label: `Teto ${metaTeto}%`,    color: 'hsl(0 72% 51%)' },
            ]}
            unit="%" height={320} effectiveRange={range} />
        )}
      </SectionCard>

      {/* ── Decomposição por grupos ─────────────────────────── */}
      <SectionCard title="IPCA acumulado 12 meses — por grupos do IBGE (%)" sectionId="grupos" {...sectionProps}>
        {(range) => (
          <MacroChart allData={gruposData}
            series={[
              { key: 'alimentacao', label: 'Alimentação e Bebidas',      color: 'var(--chart-1)' },
              { key: 'habitacao',   label: 'Habitação',                   color: 'var(--chart-2)' },
              { key: 'residencia',  label: 'Artigos de Residência',       color: 'var(--chart-3)' },
              { key: 'vestuario',   label: 'Vestuário',                   color: 'var(--chart-4)' },
              { key: 'transportes', label: 'Transportes',                 color: 'var(--chart-5)' },
              { key: 'saude',       label: 'Saúde e Cuidados Pessoais',   color: 'hsl(280 70% 60%)' },
              { key: 'despesas',    label: 'Despesas Pessoais',           color: 'hsl(30 90% 55%)' },
              { key: 'educacao',    label: 'Educação',                    color: 'hsl(200 80% 50%)' },
              { key: 'comunicacao', label: 'Comunicação',                 color: 'hsl(160 60% 45%)' },
            ]}
            referenceLines={[
              { value: metaCentral, label: `Meta ${metaCentral}%`, color: 'hsl(142 76% 40%)' },
              { value: metaTeto,    label: `Teto ${metaTeto}%`,    color: 'hsl(0 72% 51%)' },
            ]}
            unit="%" height={340} chartType="bar" stacked effectiveRange={range} />
        )}
      </SectionCard>

      <SectionCard title="IPCA — Áreas de influência: câmbio, renda e juros (12m, %)" sectionId="areas" {...sectionProps}>
        {(range) => (
          <MacroChart allData={areasData}
            series={[
              { key: 'cambio', label: 'Sensível ao Câmbio (Alimentação, Artigos de Residência, Transportes)', color: 'var(--chart-1)' },
              { key: 'renda',  label: 'Sensível à Renda (Saúde, Despesas Pessoais, Educação, Comunicação)',   color: 'var(--chart-3)' },
              { key: 'juros',  label: 'Sensível aos Juros (Habitação, Vestuário)',                             color: 'var(--chart-5)' },
            ]}
            referenceLines={[
              { value: metaCentral, label: `Meta ${metaCentral}%`, color: 'hsl(142 76% 40%)' },
              { value: metaTeto,    label: `Teto ${metaTeto}%`,    color: 'hsl(0 72% 51%)' },
            ]}
            unit="%" height={300} chartType="bar" stacked effectiveRange={range} />
        )}
      </SectionCard>

      <SectionCard title="Comparativo de Índices — variação mensal (%)" sectionId="comparativo" {...sectionProps}>
        {(range) => (
          <MacroChart allData={comparData}
            series={[
              { key: 'ipca', label: 'IPCA',  color: 'var(--chart-1)' },
              { key: 'inpc', label: 'INPC',  color: 'var(--chart-2)' },
              { key: 'igpm', label: 'IGP-M', color: 'var(--chart-3)' },
            ]}
            unit="%" height={260} effectiveRange={range} />
        )}
      </SectionCard>

      {/* ── SEÇÃO: IGP-M ────────────────────────────────────── */}
      <SectionDivider title="IGP-M" description="Índice Geral de Preços — Mercado (FGV): IPA-M 60% + IPC-M 30% + INCC-M 10%" />

      <SectionCard title="IGP-M e IGP-DI — variação mensal (%)" sectionId="igpm" {...sectionProps}>
        {(range) => (
          <MacroChart allData={igpmData}
            series={[
              { key: 'igpm',  label: 'IGP-M',  color: 'var(--chart-1)' },
              { key: 'igpdi', label: 'IGP-DI', color: 'var(--chart-3)' },
            ]}
            unit="%" height={240} chartType="bar" effectiveRange={range} />
        )}
      </SectionCard>

      <SectionCard title="Componentes do IGP-M (%)" sectionId="igpm-comp" {...sectionProps}>
        {(range) => (
          <MacroChart allData={igpmCompData}
            series={[
              { key: 'ipam',  label: 'IPA-M (atacado)',     color: 'var(--chart-2)' },
              { key: 'ipcm',  label: 'IPC-M (consumidor)',  color: 'var(--chart-4)' },
              { key: 'inccm', label: 'INCC-M (construção)',  color: 'var(--chart-5)' },
            ]}
            unit="%" height={260} effectiveRange={range} />
        )}
      </SectionCard>

      {/* ── SEÇÃO: COMMODITIES ──────────────────────────────── */}
      <SectionDivider title="Commodities" description="IC-Br (Índice de Commodities Brasil) — BCB. Antecipador de pressões inflacionárias via IPA-M" />

      <SectionCard title="IC-Br Geral — nível do índice" sectionId="icbr-geral" {...sectionProps}>
        {(range) => (
          <MacroChart allData={data.icbrGeral.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'IC-Br Geral', color: 'var(--chart-1)' }]}
            unit="" height={260} effectiveRange={range} />
        )}
      </SectionCard>

      <SectionCard title="IC-Br por componente — nível do índice" sectionId="icbr-comp" {...sectionProps}>
        {(range) => (
          <MacroChart allData={icbrCompData}
            series={[
              { key: 'agro',    label: 'Agropecuário',  color: 'var(--chart-2)' },
              { key: 'metal',   label: 'Metal',        color: 'var(--chart-4)' },
              { key: 'energia', label: 'Energia',      color: 'var(--chart-5)' },
            ]}
            unit="" height={280} effectiveRange={range} />
        )}
      </SectionCard>

      <Glossary />
    </div>
  )
}
