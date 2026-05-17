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
  balanca:      SeriesPoint[]   // 22701 Saldo Comercial US$ mi
  servicos:     SeriesPoint[]   // 22702 Serviços US$ mi
  rendaPrim:    SeriesPoint[]   // 22703 Renda Primária US$ mi
  rendaSec:     SeriesPoint[]   // 22704 Renda Secundária US$ mi
  transCorr:    SeriesPoint[]   // 22707 Transações Correntes US$ mi
  contaFin:     SeriesPoint[]   // 22706 Conta Financeira US$ mi
  reservas:     SeriesPoint[]   // 3546  Reservas US$ mi
  embi:         SeriesPoint[]   // 11752 EMBI+
  usdBrl:       SeriesPoint[]   // 10813 USD/BRL PTAX
  eurBrl:       SeriesPoint[]   // 21620 EUR/BRL PTAX
  reer:         SeriesPoint[]   // 11753 REER IPCA índice
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

function movingAvg(pts: SeriesPoint[], window: number): SeriesPoint[] {
  const result: SeriesPoint[] = []
  for (let i = window - 1; i < pts.length; i++) {
    const slice = pts.slice(i - window + 1, i + 1)
    const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length
    result.push({ date: pts[i].date, value: parseFloat(avg.toFixed(1)) })
  }
  return result
}

function yoyPct(pts: SeriesPoint[]): SeriesPoint[] {
  const result: SeriesPoint[] = []
  for (let i = 12; i < pts.length; i++) {
    const prev = pts[i - 12].value
    if (prev !== 0) {
      result.push({ date: pts[i].date, value: parseFloat(((pts[i].value - prev) / Math.abs(prev) * 100).toFixed(2)) })
    }
  }
  return result
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

  // BOP — componentes + média móvel 9 meses
  const bopData = mergeByDate({
    balanca:   data.balanca,
    servicos:  data.servicos,
    rendaPrim: data.rendaPrim,
    rendaSec:  data.rendaSec,
  })

  const tcData = mergeByDate({
    transCorr: data.transCorr,
    ma9:       movingAvg(data.transCorr, 9),
  })

  // Câmbio — nível e variação YoY
  const cambioData    = mergeByDate({ usd: data.usdBrl, eur: data.eurBrl })
  const cambioYoyData = mergeByDate({ usd: yoyPct(data.usdBrl), eur: yoyPct(data.eurBrl) })

  // Reservas
  const reservasData = data.reservas.map((p) => ({ date: p.date, value: p.value / 1000 }))

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
          title="Balança Comercial"
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
          title="EMBI+ Risco-Brasil"
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
      <SectionDivider title="Câmbio" description="Taxas de câmbio PTAX (Banco Central do Brasil) — cotação de venda" />

      <SectionCard title="USD/BRL e EUR/BRL — PTAX Venda (R$ por unidade de moeda estrangeira)" sectionId="cambio" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={cambioData}
            series={[
              { key: 'usd', label: 'Dólar Americano (USD/BRL)', color: 'var(--chart-1)' },
              { key: 'eur', label: 'Euro (EUR/BRL)',             color: 'var(--chart-3)' },
            ]}
            unit=" R$" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Variação Anual do Câmbio — USD/BRL e EUR/BRL (%, ano contra ano)" sectionId="cambio-yoy" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={cambioYoyData}
            series={[
              { key: 'usd', label: 'Dólar Americano (USD/BRL)', color: 'var(--chart-1)' },
              { key: 'eur', label: 'Euro (EUR/BRL)',             color: 'var(--chart-3)' },
            ]}
            referenceLines={[{ value: 0, label: '0 (sem variação)', color: 'var(--muted-foreground)' }]}
            unit="%" height={260} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Taxa de Câmbio Real Efetiva — Brasil, deflacionada pelo IPCA (índice, média 2010 = 100)" sectionId="reer" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.reer.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Taxa de Câmbio Real Efetiva (IPCA)', color: 'var(--chart-2)' }]}
            referenceLines={[{ value: 100, label: 'Média 2010', color: 'var(--muted-foreground)' }]}
            unit="" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: BALANÇO DE PAGAMENTOS ──────────────────── */}
      <SectionDivider title="Balanço de Pagamentos" description="Fluxos financeiros entre o Brasil e o resto do mundo (US$ milhões, mensal)" />

      <SectionCard title="Componentes da Conta Corrente — Saldo Mensal (US$ milhões)" sectionId="bop-componentes" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={bopData}
            series={[
              { key: 'balanca',   label: 'Balança Comercial',  color: 'var(--chart-1)' },
              { key: 'servicos',  label: 'Serviços',           color: 'var(--chart-2)' },
              { key: 'rendaPrim', label: 'Renda Primária',     color: 'var(--chart-3)' },
              { key: 'rendaSec',  label: 'Renda Secundária',   color: 'var(--chart-4)' },
            ]}
            referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
            unit=" US$ mi" height={320} chartType="bar" effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Transações Correntes — Saldo Mensal e Média Móvel 9 Meses (US$ milhões)" sectionId="transacoes-correntes" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={tcData}
            series={[
              { key: 'transCorr', label: 'Transações Correntes (mensal)',          color: 'var(--chart-4)' },
              { key: 'ma9',       label: 'Média Móvel 9 Meses',                   color: 'var(--chart-1)' },
            ]}
            referenceLines={[{ value: 0, label: '0', color: 'var(--muted-foreground)' }]}
            unit=" US$ mi" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: RESERVAS E RISCO ───────────────────────── */}
      <SectionDivider title="Reservas Internacionais e Risco-País" description="Capacidade de pagamento externo e prêmio de risco soberano brasileiro" />

      <SectionCard title="Reservas Internacionais — Total (US$ bilhões)" sectionId="reservas" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={reservasData}
            series={[{ key: 'value', label: 'Reservas Internacionais (US$ bi)', color: 'var(--chart-2)' }]}
            unit=" bi US$" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="EMBI+ JP Morgan — Risco-Brasil (pontos-base)" sectionId="embi" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.embi.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'EMBI+ Brasil', color: 'var(--chart-5)' }]}
            referenceLines={[
              { value: 200, label: '200 bps', color: 'hsl(142 76% 40%)' },
              { value: 400, label: '400 bps', color: 'hsl(0 72% 51%)'   },
            ]}
            unit=" bps" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>
    </div>
  )
}
