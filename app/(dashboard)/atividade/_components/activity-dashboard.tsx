'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

interface ActivityData {
  ibcVarMKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  ibcVar12Kv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  varejoKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  iccKv:      { latest: SeriesPoint; previous: SeriesPoint | null } | null
  // Visão Geral
  ibcSa:    SeriesPoint[]
  ibcNsa:   SeriesPoint[]
  ibcVarM:  SeriesPoint[]
  ibcVar12: SeriesPoint[]
  pibNsa:   SeriesPoint[]
  pibSa:    SeriesPoint[]
  pibNom:   SeriesPoint[]
  // Indústria
  pimTotal:  SeriesPoint[]
  pimTransf: SeriesPoint[]
  pimCap:    SeriesPoint[]
  pimInterm: SeriesPoint[]
  pimDur:    SeriesPoint[]
  ici:       SeriesPoint[]
  // Comércio
  varejo:   SeriesPoint[]
  pmcComb:  SeriesPoint[]
  pmcHiper: SeriesPoint[]
  pmcMov:   SeriesPoint[]
  pmcFarm:  SeriesPoint[]
  pmcInfo:  SeriesPoint[]
  pmcVeic:  SeriesPoint[]
  icc:      SeriesPoint[]
  // Serviços
  ics: SeriesPoint[]
  // PIB Demanda
  pibCons: SeriesPoint[]
  pibExp:  SeriesPoint[]
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
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('5y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const ibcNivelData  = mergeByDate({ sa: data.ibcSa, nsa: data.ibcNsa })
  const pibTrimData   = mergeByDate({ sa: data.pibSa, nsa: data.pibNsa })
  const pimSegsData   = mergeByDate({ transf: data.pimTransf, cap: data.pimCap, interm: data.pimInterm, dur: data.pimDur })
  const pmcEssData    = mergeByDate({ hiper: data.pmcHiper, farm: data.pmcFarm, comb: data.pmcComb })
  const pmcDiscData   = mergeByDate({ mov: data.pmcMov, info: data.pmcInfo, veic: data.pmcVeic })
  const confGerData   = mergeByDate({ icc: data.icc, ici: data.ici, ics: data.ics })
  const pibDemData    = mergeByDate({ cons: data.pibCons, exp: data.pibExp })
  // PIB nominal: BCB reporta em R$ milhões → dividir por 1000 para R$ bilhões
  const pibNomData    = data.pibNom.map((p) => ({ date: p.date, value: p.value / 1000 }))

  return (
    <div className="space-y-6">

      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Atividade Econômica</h1>
          <p className="text-sm text-muted-foreground mt-0.5">PIB, IBC-Br, produção industrial, varejo e serviços</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="IBC-Br — var% mensal"
          value={data.ibcVarMKv?.latest.value ?? null}
          unit="%"
          date={data.ibcVarMKv?.latest.date}
          delta={data.ibcVarMKv?.previous ? data.ibcVarMKv.latest.value - data.ibcVarMKv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert={false}
        />
        <KpiCard
          title="IBC-Br — var% 12 meses"
          value={data.ibcVar12Kv?.latest.value ?? null}
          unit="%"
          date={data.ibcVar12Kv?.latest.date}
          delta={data.ibcVar12Kv?.previous ? data.ibcVar12Kv.latest.value - data.ibcVar12Kv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert={false}
        />
        <KpiCard
          title="Varejo Ampliado"
          value={data.varejoKv?.latest.value ?? null}
          unit=""
          date={data.varejoKv?.latest.date}
          delta={data.varejoKv?.previous ? data.varejoKv.latest.value - data.varejoKv.previous.value : null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Confiança Consumidor"
          value={data.iccKv?.latest.value ?? null}
          unit=" pts"
          date={data.iccKv?.latest.date}
          delta={data.iccKv?.previous ? data.iccKv.latest.value - data.iccKv.previous.value : null}
          deltaUnit=" pts"
          deltaInvert={false}
        />
      </div>

      {/* ── SEÇÃO: VISÃO GERAL ───────────────────────────── */}
      <SectionDivider title="Visão Geral" description="IBC-Br e PIB — nível e variações" />

      <SectionCard title="IBC-Br — nível mensal (índice, proxy do PIB)" sectionId="ibc-nivel" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={ibcNivelData}
            series={[
              { key: 'sa',  label: 'IBC-Br c/ aj. saz.',  color: 'var(--chart-1)' },
              { key: 'nsa', label: 'IBC-Br s/ aj. saz.',  color: 'var(--chart-3)' },
            ]}
            unit="" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="IBC-Br — variação % mensal" sectionId="ibc-var-m" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.ibcVarM.map((p) => ({ date: p.date, value: p.value }))}
              series={[{ key: 'value', label: 'var% mensal', color: 'var(--chart-1)' }]}
              referenceLines={[{ value: 0, label: '0%', color: 'var(--muted-foreground)' }]}
              unit="%" height={240} chartType="bar" effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="IBC-Br — variação % acumulada 12 meses" sectionId="ibc-var-12" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.ibcVar12.map((p) => ({ date: p.date, value: p.value }))}
              series={[{ key: 'value', label: 'var% 12 meses', color: 'var(--chart-2)' }]}
              referenceLines={[{ value: 0, label: '0%', color: 'var(--muted-foreground)' }]}
              unit="%" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="PIB nominal — acumulado 12 meses (R$ bilhões)" sectionId="pib-nom" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={pibNomData}
              series={[{ key: 'value', label: 'PIB nominal 12m', color: 'var(--chart-5)' }]}
              unit=" bi" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="PIB encadeado — trimestral (índice, base 1995=100)" sectionId="pib-trim" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={pibTrimData}
              series={[
                { key: 'sa',  label: 'c/ aj. saz.', color: 'var(--chart-1)' },
                { key: 'nsa', label: 's/ aj. saz.', color: 'var(--chart-3)' },
              ]}
              unit="" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

      {/* ── SEÇÃO: INDÚSTRIA ─────────────────────────────── */}
      <SectionDivider title="Indústria" description="Produção Industrial — PIM/IBGE por segmento e confiança" />

      <SectionCard title="Produção Industrial — total (PIM, índice base 2012=100)" sectionId="pim-total" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.pimTotal.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'PIM Total', color: 'var(--chart-2)' }]}
            unit="" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="PIM — Transformação, Capital, Intermediários e Bens Duráveis" sectionId="pim-segs" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={pimSegsData}
            series={[
              { key: 'transf', label: 'Ind. Transformação',   color: 'var(--chart-1)' },
              { key: 'cap',    label: 'Bens de Capital',      color: 'var(--chart-2)' },
              { key: 'interm', label: 'Bens Intermediários',  color: 'var(--chart-3)' },
              { key: 'dur',    label: 'Bens de Consumo Dur.', color: 'var(--chart-4)' },
            ]}
            unit="" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Confiança Industrial — ICI FGV (pontos)" sectionId="ici" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.ici.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'ICI (Indústria)', color: 'var(--chart-2)' }]}
            unit=" pts" height={220} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: COMÉRCIO ──────────────────────────────── */}
      <SectionDivider title="Comércio" description="Varejo — PMC/IBGE por segmento e confiança do consumidor" />

      <SectionCard title="Varejo Ampliado — volume de vendas (PMC, índice base 2022=100)" sectionId="varejo" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.varejo.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Varejo Ampliado', color: 'var(--chart-4)' }]}
            unit="" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="PMC — Segmentos Essenciais" sectionId="pmc-ess" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={pmcEssData}
              series={[
                { key: 'hiper', label: 'Hipermercados/Alimentos', color: 'var(--chart-1)' },
                { key: 'farm',  label: 'Farmácia e Perfumaria',   color: 'var(--chart-2)' },
                { key: 'comb',  label: 'Combustíveis',            color: 'var(--chart-3)' },
              ]}
              unit="" height={260} effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="PMC — Segmentos Discricionários" sectionId="pmc-disc" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={pmcDiscData}
              series={[
                { key: 'mov',  label: 'Móveis e Eletrodomésticos', color: 'var(--chart-4)' },
                { key: 'info', label: 'Informática e Comunicação', color: 'var(--chart-5)' },
                { key: 'veic', label: 'Veículos e Peças',          color: 'var(--chart-1)' },
              ]}
              unit="" height={260} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Confiança do Consumidor — ICC FGV (pontos)" sectionId="icc" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.icc.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'ICC (Consumidor)', color: 'var(--chart-4)' }]}
            unit=" pts" height={220} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: SERVIÇOS ──────────────────────────────── */}
      <SectionDivider title="Serviços" description="Confiança — PMS/PNAD disponível via IBGE SIDRA em versão futura" />

      <SectionCard title="Confiança no Setor de Serviços — ICS FGV (pontos)" sectionId="ics" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.ics.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'ICS (Serviços)', color: 'var(--chart-3)' }]}
            unit=" pts" height={220} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Confiança Geral — ICC, ICI e ICS comparados" sectionId="conf-geral" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={confGerData}
            series={[
              { key: 'icc', label: 'Consumidor (ICC)', color: 'var(--chart-1)' },
              { key: 'ici', label: 'Indústria (ICI)',  color: 'var(--chart-2)' },
              { key: 'ics', label: 'Serviços (ICS)',   color: 'var(--chart-3)' },
            ]}
            unit=" pts" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: PIB DEMANDA ───────────────────────────── */}
      <SectionDivider title="PIB pelo Lado da Demanda" description="Componentes trimestrais — Consumo das Famílias e Exportações (índice encadeado, base 1995=100)" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Consumo das Famílias — trimestral (índice encadeado)" sectionId="pib-cons" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.pibCons.map((p) => ({ date: p.date, value: p.value }))}
              series={[{ key: 'value', label: 'Consumo das Famílias', color: 'var(--chart-1)' }]}
              unit="" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="Exportações de Bens e Serviços — trimestral (índice encadeado)" sectionId="pib-exp" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.pibExp.map((p) => ({ date: p.date, value: p.value }))}
              series={[{ key: 'value', label: 'Exportações', color: 'var(--chart-5)' }]}
              unit="" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Consumo das Famílias vs. Exportações — componentes do PIB" sectionId="pib-dem" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={pibDemData}
            series={[
              { key: 'cons', label: 'Consumo das Famílias', color: 'var(--chart-1)' },
              { key: 'exp',  label: 'Exportações',          color: 'var(--chart-5)' },
            ]}
            unit="" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

    </div>
  )
}
