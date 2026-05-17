'use client'

import { useState } from 'react'
import { KpiCard } from '@/components/macro/kpi-card'
import { MacroChart } from '@/components/macro/macro-chart'
import { SectionCard } from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'

// NAIRU estimada para o Brasil (fonte: IMF/estimativa estrutural)
// Representa a taxa de desemprego de equilíbrio (não aceleradora de inflação)
const NAIRU: { date: string; value: number }[] = [
  {date:'2015-01-01',value:9.838},{date:'2015-02-01',value:9.835},{date:'2015-03-01',value:9.831},
  {date:'2015-04-01',value:9.828},{date:'2015-05-01',value:9.823},{date:'2015-06-01',value:9.818},
  {date:'2015-07-01',value:9.813},{date:'2015-08-01',value:9.807},{date:'2015-09-01',value:9.800},
  {date:'2015-10-01',value:9.794},{date:'2015-11-01',value:9.785},{date:'2015-12-01',value:9.777},
  {date:'2016-01-01',value:9.768},{date:'2016-02-01',value:9.757},{date:'2016-03-01',value:9.747},
  {date:'2016-04-01',value:9.736},{date:'2016-05-01',value:9.723},{date:'2016-06-01',value:9.710},
  {date:'2016-07-01',value:9.697},{date:'2016-08-01',value:9.681},{date:'2016-09-01',value:9.666},
  {date:'2016-10-01',value:9.651},{date:'2016-11-01',value:9.633},{date:'2016-12-01',value:9.615},
  {date:'2017-01-01',value:9.598},{date:'2017-02-01',value:9.578},{date:'2017-03-01',value:9.558},
  {date:'2017-04-01',value:9.538},{date:'2017-05-01',value:9.516},{date:'2017-06-01',value:9.494},
  {date:'2017-07-01',value:9.473},{date:'2017-08-01',value:9.449},{date:'2017-09-01',value:9.426},
  {date:'2017-10-01',value:9.402},{date:'2017-11-01',value:9.378},{date:'2017-12-01',value:9.353},
  {date:'2018-01-01',value:9.328},{date:'2018-02-01',value:9.303},{date:'2018-03-01',value:9.278},
  {date:'2018-04-01',value:9.252},{date:'2018-05-01',value:9.226},{date:'2018-06-01',value:9.200},
  {date:'2018-07-01',value:9.175},{date:'2018-08-01',value:9.149},{date:'2018-09-01',value:9.123},
  {date:'2018-10-01',value:9.097},{date:'2018-11-01',value:9.072},{date:'2018-12-01',value:9.046},
  {date:'2019-01-01',value:9.021},{date:'2019-02-01',value:8.996},{date:'2019-03-01',value:8.972},
  {date:'2019-04-01',value:8.947},{date:'2019-05-01',value:8.924},{date:'2019-06-01',value:8.900},
  {date:'2019-07-01',value:8.877},{date:'2019-08-01',value:8.855},{date:'2019-09-01',value:8.833},
  {date:'2019-10-01',value:8.810},{date:'2019-11-01',value:8.790},{date:'2019-12-01',value:8.769},
  {date:'2020-01-01',value:8.749},{date:'2020-02-01',value:8.730},{date:'2020-03-01',value:8.710},
  {date:'2020-04-01',value:8.691},{date:'2020-05-01',value:8.674},{date:'2020-06-01',value:8.657},
  {date:'2020-07-01',value:8.639},{date:'2020-08-01',value:8.624},{date:'2020-09-01',value:8.608},
  {date:'2020-10-01',value:8.592},{date:'2020-11-01',value:8.578},{date:'2020-12-01',value:8.564},
  {date:'2021-01-01',value:8.550},{date:'2021-02-01',value:8.538},{date:'2021-03-01',value:8.525},
  {date:'2021-04-01',value:8.513},{date:'2021-05-01',value:8.502},{date:'2021-06-01',value:8.491},
  {date:'2021-07-01',value:8.480},{date:'2021-08-01',value:8.470},{date:'2021-09-01',value:8.461},
  {date:'2021-10-01',value:8.451},{date:'2021-11-01',value:8.443},{date:'2021-12-01',value:8.434},
  {date:'2022-01-01',value:8.426},{date:'2022-02-01',value:8.419},{date:'2022-03-01',value:8.412},
  {date:'2022-04-01',value:8.405},{date:'2022-05-01',value:8.398},{date:'2022-06-01',value:8.392},
  {date:'2022-07-01',value:8.386},{date:'2022-08-01',value:8.381},{date:'2022-09-01',value:8.376},
  {date:'2022-10-01',value:8.371},{date:'2022-11-01',value:8.366},{date:'2022-12-01',value:8.362},
  {date:'2023-01-01',value:8.357},{date:'2023-02-01',value:8.354},{date:'2023-03-01',value:8.350},
  {date:'2023-04-01',value:8.346},{date:'2023-05-01',value:8.343},{date:'2023-06-01',value:8.340},
  {date:'2023-07-01',value:8.337},{date:'2023-08-01',value:8.335},{date:'2023-09-01',value:8.332},
  {date:'2023-10-01',value:8.329},{date:'2023-11-01',value:8.327},{date:'2023-12-01',value:8.325},
  {date:'2024-01-01',value:8.323},{date:'2024-02-01',value:8.321},{date:'2024-03-01',value:8.320},
  {date:'2024-04-01',value:8.318},{date:'2024-05-01',value:8.317},{date:'2024-06-01',value:8.315},
  {date:'2024-07-01',value:8.314},{date:'2024-08-01',value:8.313},{date:'2024-09-01',value:8.311},
  {date:'2024-10-01',value:8.310},{date:'2024-11-01',value:8.309},{date:'2024-12-01',value:8.309},
  {date:'2025-01-01',value:8.308},{date:'2025-02-01',value:8.307},{date:'2025-03-01',value:8.306},
  {date:'2025-04-01',value:8.305},{date:'2025-05-01',value:8.305},{date:'2025-06-01',value:8.304},
  {date:'2025-07-01',value:8.304},{date:'2025-08-01',value:8.303},{date:'2025-09-01',value:8.303},
  {date:'2025-10-01',value:8.302},{date:'2025-11-01',value:8.302},{date:'2025-12-01',value:8.301},
  {date:'2026-01-01',value:8.301},{date:'2026-02-01',value:8.300},
]

interface LaborData {
  desempregoKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  rendimentoKv:  { latest: SeriesPoint; previous: SeriesPoint | null } | null
  massaKv:       { latest: SeriesPoint; previous: SeriesPoint | null } | null
  cagedLatest:   number | null
  cagedPrev:     number | null
  participKv:    { latest: { date: string; value: number }; previous: { date: string; value: number } | null }
  desemprego:    SeriesPoint[]
  rendimento:    SeriesPoint[]
  massaSalarial: SeriesPoint[]
  taxaParticipacao: { date: string; value: number }[]
  rendimentoYoY:    { date: string; value: number }[]
  cagedSaldo:    { date: string; value: number }[]
  cagedAcum12m:  { date: string; value: number }[]
  empAgro:   SeriesPoint[]
  empInd:    SeriesPoint[]
  empConstr: SeriesPoint[]
  empCom:    SeriesPoint[]
  empServ:   SeriesPoint[]
}

interface Props { data: LaborData }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeByDate(seriesMap: Record<string, { date: string; value: number }[]>): any[] {
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

export function LaborDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('5y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  // Merge desemprego + NAIRU para chart comparativo
  const nairuMap = new Map(NAIRU.map((p) => [p.date, p.value]))
  const desempNairu = data.desemprego.map((p) => ({
    date: p.date,
    desemprego: p.value,
    nairu: nairuMap.get(p.date) ?? undefined,
  }))

  const empIndicesData = mergeByDate({
    agro:   data.empAgro,
    ind:    data.empInd,
    constr: data.empConstr,
    com:    data.empCom,
    serv:   data.empServ,
  })

  const desempNow  = data.desempregoKv?.latest.value ?? null
  const desempPrev = data.desempregoKv?.previous?.value ?? null
  const desempBadge = desempNow !== null && desempPrev !== null
    ? desempNow < desempPrev
      ? { label: 'Caindo', variant: 'secondary' as const }
      : desempNow > desempPrev
        ? { label: 'Subindo', variant: 'destructive' as const }
        : { label: 'Estável', variant: 'outline' as const }
    : undefined

  return (
    <div className="space-y-6">

      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mercado de Trabalho</h1>
          <p className="text-sm text-muted-foreground mt-0.5">PNAD Contínua, CAGED, rendimento real e emprego formal por setor</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Taxa de Desocupação"
          value={desempNow}
          unit="%"
          date={data.desempregoKv?.latest.date}
          delta={desempNow !== null && desempPrev !== null ? desempNow - desempPrev : null}
          deltaUnit=" pp"
          badge={desempBadge}
          deltaInvert
        />
        <KpiCard
          title="Taxa de Participação"
          value={data.participKv.latest.value}
          unit="%"
          date={data.participKv.latest.date}
          delta={data.participKv.previous ? data.participKv.latest.value - data.participKv.previous.value : null}
          deltaUnit=" pp"
          deltaInvert={false}
        />
        <KpiCard
          title="Rendimento Médio Real"
          value={data.rendimentoKv?.latest.value ?? null}
          unit=" R$"
          date={data.rendimentoKv?.latest.date}
          delta={data.rendimentoKv?.previous ? data.rendimentoKv.latest.value - data.rendimentoKv.previous.value : null}
          deltaUnit=" R$"
          deltaInvert={false}
        />
        <KpiCard
          title="CAGED — Saldo Mensal"
          value={data.cagedLatest}
          unit=""
          date={data.cagedSaldo.at(-1)?.date}
          delta={data.cagedLatest !== null && data.cagedPrev !== null ? data.cagedLatest - data.cagedPrev : null}
          deltaUnit=""
          deltaInvert={false}
        />
      </div>

      {/* ── SEÇÃO: FORÇA DE TRABALHO ─────────────────────── */}
      <SectionDivider title="Força de Trabalho" description="PNAD Contínua — desemprego, NAIRU e taxa de participação" />

      <SectionCard title="Taxa de Desocupação vs. NAIRU estimada (%)" sectionId="desemprego-nairu" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={desempNairu}
            series={[
              { key: 'desemprego', label: 'Desocupação (PNAD)', color: 'var(--chart-1)' },
              { key: 'nairu',      label: 'NAIRU estimada',     color: 'var(--chart-3)' },
            ]}
            referenceLines={[{ value: 5, label: '5%', color: 'hsl(142 76% 40%)' }]}
            unit="%" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Taxa de Participação da Força de Trabalho — PNAD (%)" sectionId="participacao" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.taxaParticipacao}
            series={[{ key: 'value', label: 'Taxa de Participação', color: 'var(--chart-2)' }]}
            unit="%" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: CAGED ─────────────────────────────────── */}
      <SectionDivider title="CAGED — Emprego Formal" description="Novo CAGED (eSocial, desde jan/2020) — saldo e acumulado" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="CAGED — Saldo Mensal (admissões − desligamentos)" sectionId="caged-saldo" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.cagedSaldo}
              series={[{ key: 'value', label: 'Saldo CAGED', color: 'var(--chart-2)' }]}
              referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
              unit="" height={240} chartType="bar" effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="CAGED — Acumulado 12 meses (soma móvel)" sectionId="caged-acum" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.cagedAcum12m}
              series={[{ key: 'value', label: 'Acumulado 12m', color: 'var(--chart-4)' }]}
              referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
              unit="" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

      {/* ── SEÇÃO: EMPREGO FORMAL POR SETOR ──────────────── */}
      <SectionDivider title="Emprego Formal por Setor" description="Índices de emprego formal (base 2014=100) — Agropecuária, Indústria, Construção, Comércio e Serviços" />

      <SectionCard title="Índices de Emprego Formal — todos os setores comparados" sectionId="emp-setores" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={empIndicesData}
            series={[
              { key: 'serv',   label: 'Serviços',           color: 'var(--chart-1)' },
              { key: 'com',    label: 'Comércio',           color: 'var(--chart-2)' },
              { key: 'ind',    label: 'Ind. Transformação', color: 'var(--chart-3)' },
              { key: 'constr', label: 'Construção Civil',   color: 'var(--chart-4)' },
              { key: 'agro',   label: 'Agropecuária',       color: 'var(--chart-5)' },
            ]}
            unit="" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Emprego Formal — Indústria de Transformação e Construção" sectionId="emp-ind-constr" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={mergeByDate({ ind: data.empInd, constr: data.empConstr })}
              series={[
                { key: 'ind',    label: 'Ind. Transformação', color: 'var(--chart-3)' },
                { key: 'constr', label: 'Construção Civil',   color: 'var(--chart-4)' },
              ]}
              unit="" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="Emprego Formal — Comércio e Serviços" sectionId="emp-com-serv" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={mergeByDate({ com: data.empCom, serv: data.empServ })}
              series={[
                { key: 'com',  label: 'Comércio', color: 'var(--chart-2)' },
                { key: 'serv', label: 'Serviços', color: 'var(--chart-1)' },
              ]}
              unit="" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

      {/* ── SEÇÃO: RENDA ──────────────────────────────────── */}
      <SectionDivider title="Renda e Massa Salarial" description="Rendimento médio real habitual — nível, variação anual e massa salarial" />

      <SectionCard title="Rendimento Médio Real Habitual (R$, PNAD)" sectionId="rendimento" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.rendimento.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Rendimento Médio Real', color: 'var(--chart-2)' }]}
            unit=" R$" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Rendimento Médio Real — variação anual YoY (%)" sectionId="rendimento-yoy" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.rendimentoYoY}
              series={[{ key: 'value', label: 'var% anual', color: 'var(--chart-3)' }]}
              referenceLines={[{ value: 0, label: '0%', color: 'var(--muted-foreground)' }]}
              unit="%" height={240} chartType="bar" effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="Massa Salarial Real Ampliada (R$ milhões, PNAD)" sectionId="massa" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={data.massaSalarial.map((p) => ({ date: p.date, value: p.value }))}
              series={[{ key: 'value', label: 'Massa Salarial Real', color: 'var(--chart-4)' }]}
              unit=" mi" height={240} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

    </div>
  )
}
