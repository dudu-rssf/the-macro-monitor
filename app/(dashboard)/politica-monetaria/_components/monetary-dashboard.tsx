'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, ReferenceLine, Cell,
} from 'recharts'
import { KpiCard }       from '@/components/macro/kpi-card'
import { MacroChart }    from '@/components/macro/macro-chart'
import { SectionCard }   from '@/components/macro/section-card'
import { SectionDivider } from '@/components/macro/section-divider'
import { RangeSelector } from '@/components/macro/range-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TimeRange, SeriesPoint } from '@/components/macro/types'
import type { CopomCycle } from '../page'
import type { EttjCurve } from '@/lib/sources/anbima-ettj'

// ────────────────────────────────────────────────────────────────────────────
interface InflationTarget {
  year: number; center: number; lower: number; upper: number
  realized: number | null
}

interface FocusRow { year: string; median: number | null }

interface MonetaryData {
  selicKv:   { latest: SeriesPoint; previous: SeriesPoint | null } | null
  ipca12mKv: { latest: SeriesPoint; previous: SeriesPoint | null } | null
  embiKv:    { latest: SeriesPoint; previous: SeriesPoint | null } | null
  selic:     SeriesPoint[]
  ipca12m:   SeriesPoint[]
  realRate:  SeriesPoint[]
  diOver:    SeriesPoint[]
  focusIpca: FocusRow[]
  focusSelic: FocusRow[]
  copomCycles: CopomCycle[]
  inflationTargets: InflationTarget[]
  m1:           SeriesPoint[]
  m2:           SeriesPoint[]
  bma:          SeriesPoint[]
  comp:         SeriesPoint[]
  m3:           SeriesPoint[]
  m4:           SeriesPoint[]
  baseRestrito: SeriesPoint[]
  embi:         SeriesPoint[]
  ettj: EttjCurve
}

interface Props { data: MonetaryData }

// ────────────────────────────────────────────────────────────────────────────
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

// Divide raw BCB values (R$ mil) → R$ bilhões
function toBi(pts: SeriesPoint[]): SeriesPoint[] {
  return pts.map((p) => ({ date: p.date, value: parseFloat((p.value / 1_000).toFixed(2)) }))
}

// ────────────────────────────────────────────────────────────────────────────
export function MonetaryDashboard({ data }: Props) {
  const [globalRange, setGlobalRange] = useState<TimeRange | null>('2y')
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, TimeRange>>({})

  function handleGlobalChange(r: TimeRange) { setGlobalRange(r); setSectionOverrides({}) }
  function handleSectionChange(id: string, r: TimeRange) {
    setSectionOverrides((prev) => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }
  const sectionProps = { globalRange, sectionOverrides, onGlobalChange: handleGlobalChange, onSectionChange: handleSectionChange }

  const selicNow   = data.selicKv?.latest.value ?? null
  const ipca12Now  = data.ipca12mKv?.latest.value ?? null
  const realNow    = selicNow !== null && ipca12Now !== null ? selicNow - ipca12Now : null

  const currentYear    = String(new Date().getFullYear())
  const focusSelicNow  = data.focusSelic.find((r) => r.year === currentYear)?.median ?? null
  const focusIpcaNow   = data.focusIpca.find((r) => r.year === currentYear)?.median ?? null

  const nominalData = mergeByDate({ selic: data.selic, ipca12m: data.ipca12m })

  // Monetary aggregates — convert to R$ bilhões
  const m1Bi   = useMemo(() => toBi(data.m1),   [data.m1])
  const m2Bi   = useMemo(() => toBi(data.m2),   [data.m2])
  const bmaBi  = useMemo(() => toBi(data.bma),  [data.bma])
  const compBi = useMemo(() => toBi(data.comp), [data.comp])
  const m3Bi   = useMemo(() => toBi(data.m3),   [data.m3])
  const m4Bi   = useMemo(() => toBi(data.m4),   [data.m4])

  const m1m2Data = mergeByDate({ m1: m1Bi, m2: m2Bi })
  const m3m4Data = mergeByDate({ m3: m3Bi, m4: m4Bi })

  // Multiplicador bancário = M1 / Base Restrita (ambos em R$ mil, ratio adimensional)
  const multiplicadorData = useMemo(() => {
    const baseMap = new Map(data.baseRestrito.map((p) => [p.date.slice(0, 7), p.value]))
    return data.m1
      .map((p) => {
        const baseVal = baseMap.get(p.date.slice(0, 7))
        if (!baseVal || baseVal === 0) return null
        return { date: p.date, value: parseFloat((p.value / baseVal).toFixed(3)) }
      })
      .filter((p): p is SeriesPoint => p !== null)
  }, [data.m1, data.baseRestrito])

  return (
    <div className="space-y-6">

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Política Monetária</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Selic, juros reais, curva de juros e agregados monetários</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobalChange} />
        </div>
      </div>

      {/* ── KPI CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Selic (a.a.)"
          value={selicNow}
          unit="% a.a."
          date={data.selicKv?.latest.date}
          delta={data.selicKv?.previous ? selicNow! - data.selicKv.previous.value : null}
          deltaUnit="pp"
          deltaInvert={false}
        />
        <KpiCard
          title="IPCA 12m"
          value={ipca12Now}
          date={data.ipca12mKv?.latest.date}
          delta={data.ipca12mKv?.previous ? ipca12Now! - data.ipca12mKv.previous.value : null}
          deltaInvert
        />
        <KpiCard
          title="Juro Real Ex-Post"
          value={realNow}
          unit="% a.a."
          date={data.selicKv?.latest.date}
          deltaInvert={false}
          badge={realNow !== null ? {
            label: realNow >= 6 ? 'Restritivo' : realNow >= 2 ? 'Neutro' : 'Expansionista',
            variant: realNow >= 6 ? 'destructive' : realNow >= 2 ? 'secondary' : 'default',
          } : undefined}
        />
        <KpiCard
          title={`Focus Selic ${currentYear}`}
          value={focusSelicNow}
          unit="% a.a."
          badge={focusIpcaNow !== null ? {
            label: `IPCA Focus: ${focusIpcaNow.toFixed(1)}%`,
            variant: 'outline',
          } : undefined}
          deltaInvert={false}
        />
      </div>

      {/* ── SEÇÃO: JUROS ────────────────────────────────────── */}
      <SectionDivider title="Juros Nominais e Reais" description="Meta Selic, IPCA 12 meses e juro real ex-post" />

      <SectionCard title="Taxa Selic e IPCA (12 meses) — histórico (%)" sectionId="nominal" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={nominalData}
            series={[
              { key: 'selic',   label: 'Taxa Selic (% a.a.)',     color: 'var(--chart-1)' },
              { key: 'ipca12m', label: 'IPCA (12 meses)',          color: 'var(--chart-3)' },
            ]}
            unit="%" height={280} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Juro Real Ex-Post (Selic − IPCA 12m)" sectionId="real" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.realRate.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'Juro Real', color: 'var(--chart-2)' }]}
            referenceLines={[
              { value: 0, label: '0%',              color: 'var(--muted-foreground)' },
              { value: 6, label: '6% (restritivo)', color: 'hsl(0 72% 51%)' },
            ]}
            unit="%" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="DI Overnight — taxa mensal (% a.a.)" sectionId="di" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.diOver.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'DI Overnight', color: 'var(--chart-4)' }]}
            unit="% a.a." height={220} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: CURVA DE JUROS ANBIMA ────────────────────── */}
      <SectionDivider title="Curva de Juros ANBIMA" description="ETTJ hoje — NTN-F (pré-fixada), NTN-B (IPCA+) e inflação implícita por prazo" />

      {data.ettj.pre.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EttjChart
            pre={data.ettj.pre}
            ipca={data.ettj.ipca}
          />
          <ImplicitInflationChart data={data.ettj.impl} />
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-muted-foreground">Curva ANBIMA indisponível no momento.</p>
          </CardContent>
        </Card>
      )}

      {/* ── SEÇÃO: METAS DE INFLAÇÃO ────────────────────────── */}
      <SectionDivider title="Metas de Inflação" description="Meta BCB (centro e banda de tolerância) vs IPCA realizado — 1999 a 2026" />

      <InflationTargetsChart targets={data.inflationTargets} />

      {/* ── Focus expectations ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FocusCard title="Expectativas Focus — IPCA (%)" rows={data.focusIpca} unit="%" color="var(--chart-3)" />
        <FocusCard title="Expectativas Focus — Selic (% a.a.)" rows={data.focusSelic} unit="% a.a." color="var(--chart-1)" />
      </div>

      {/* ── BPS PRECIFICADOS ────────────────────────────────── */}
      <SectionDivider title="Cortes Precificados pela Curva" description="Bps implícitos nas projeções do Focus Selic — diferença entre a Selic atual e as medianas projetadas" />
      <BpsPrecificados selicNow={selicNow} focusSelic={data.focusSelic} />

      {/* ── SEÇÃO: AGREGADOS MONETÁRIOS ─────────────────────── */}
      <SectionDivider title="Agregados Monetários" description="Meios de pagamento, base monetária ampliada e compulsórios — BCB SGS (R$ bilhões)" />

      <SectionCard title="M1 e M2 — Meios de Pagamento (R$ bi)" sectionId="m1m2" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={m1m2Data}
            series={[
              { key: 'm1', label: 'M1',  color: 'var(--chart-1)' },
              { key: 'm2', label: 'M2',  color: 'var(--chart-2)' },
            ]}
            unit=" bi R$" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="M3 e M4 — Meios de Pagamento amplos (R$ bi)" sectionId="m3m4" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={m3m4Data}
            series={[
              { key: 'm3', label: 'M3',  color: 'var(--chart-3)' },
              { key: 'm4', label: 'M4',  color: 'var(--chart-4)' },
            ]}
            unit=" bi R$" height={240} effectiveRange={range}
          />
        )}
      </SectionCard>

      <SectionCard title="Base Monetária Ampliada (R$ bi)" sectionId="bma" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={bmaBi.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'BMA', color: 'var(--chart-5)' }]}
            unit=" bi R$" height={220} effectiveRange={range}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Recolhimentos Compulsórios (R$ bi)" sectionId="comp" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={compBi.map((p) => ({ date: p.date, value: p.value }))}
              series={[{ key: 'value', label: 'Compulsórios', color: 'var(--chart-2)' }]}
              unit=" bi R$" height={220} effectiveRange={range}
            />
          )}
        </SectionCard>

        <SectionCard title="Multiplicador Bancário (M1 / Base Restrita)" sectionId="mult" {...sectionProps}>
          {(range) => (
            <MacroChart
              allData={multiplicadorData.map((p) => ({ date: p.date, value: p.value }))}
              series={[{ key: 'value', label: 'Multiplicador', color: 'var(--chart-1)' }]}
              unit="x" height={220} effectiveRange={range}
            />
          )}
        </SectionCard>
      </div>

      {/* ── SEÇÃO: RISCO-PAÍS ───────────────────────────────── */}
      <SectionDivider title="Risco-País" description="EMBI+ JP Morgan — spread dos títulos brasileiros sobre os Treasuries americanos (pontos-base)" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="EMBI+ Risco-Brasil"
          value={data.embiKv?.latest.value ?? null}
          unit=" bps"
          date={data.embiKv?.latest.date}
          delta={data.embiKv?.previous ? data.embiKv.latest.value - data.embiKv.previous.value : null}
          deltaUnit=" bps"
          badge={data.embiKv?.latest.value != null ? {
            label: data.embiKv.latest.value < 200 ? 'Baixo' : data.embiKv.latest.value < 400 ? 'Moderado' : 'Alto',
            variant: data.embiKv.latest.value < 200 ? 'secondary' : data.embiKv.latest.value < 400 ? 'outline' : 'destructive',
          } : undefined}
          deltaInvert
        />
      </div>

      <SectionCard title="EMBI+ Risco-Brasil — histórico (pontos-base)" sectionId="embi-pm" {...sectionProps}>
        {(range) => (
          <MacroChart
            allData={data.embi.map((p) => ({ date: p.date, value: p.value }))}
            series={[{ key: 'value', label: 'EMBI+ Brasil', color: 'var(--chart-5)' }]}
            referenceLines={[
              { value: 200, label: '200 bps', color: 'hsl(142 76% 40%)' },
              { value: 400, label: '400 bps', color: 'hsl(0 72% 51%)' },
            ]}
            unit=" bps" height={260} effectiveRange={range}
          />
        )}
      </SectionCard>

      {/* ── SEÇÃO: ANÁLISES COPOM ───────────────────────────── */}
      <SectionDivider title="Análises COPOM" description="Ciclos históricos de alta e corte da Selic desde 2001 — bps movidos por ciclo" />

      <CopomCyclesSection cycles={data.copomCycles} selicData={data.selic} />

    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ETTJ Chart (yield curve snapshot)
function EttjChart({ pre, ipca }: { pre: EttjCurve['pre']; ipca: EttjCurve['ipca'] }) {
  const labels: Record<number, string> = {
    1: '1M', 2: '2M', 3: '3M', 6: '6M', 9: '9M',
    12: '1A', 18: '18M', 24: '2A', 36: '3A', 48: '4A', 60: '5A', 84: '7A', 120: '10A',
  }

  const merged = pre.map((p) => {
    const i = ipca.find((x) => x.bd === p.bd)
    return { months: p.months, pre: p.rate, ipca: i?.rate ?? null }
  })

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-medium">ETTJ hoje — NTN-F (pré) e NTN-B (IPCA+)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-2">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={merged} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="months"
              tickFormatter={(v: number) => labels[v] ?? `${v}M`}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              width={48}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, name: any) => [`${Number(v).toFixed(2)}% a.a.`, name === 'pre' ? 'NTN-F (Pré)' : 'NTN-B (IPCA+)']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(v: any) => `Prazo: ${labels[Number(v)] ?? `${v} meses`}`}
              contentStyle={{ fontSize: 11 }}
            />
            <Line dataKey="pre"  stroke="var(--chart-1)" strokeWidth={2} dot={false} name="pre"  />
            <Line dataKey="ipca" stroke="var(--chart-3)" strokeWidth={2} dot={false} name="ipca" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ImplicitInflationChart({ data }: { data: EttjCurve['impl'] }) {
  const labels: Record<number, string> = {
    1: '1M', 2: '2M', 3: '3M', 6: '6M', 9: '9M',
    12: '1A', 18: '18M', 24: '2A', 36: '3A', 48: '4A', 60: '5A', 84: '7A', 120: '10A',
  }
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-medium">Inflação Implícita por prazo (pré − IPCA+)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-2">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="months"
              tickFormatter={(v: number) => labels[v] ?? `${v}M`}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              width={48}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Inflação Implícita']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(v: any) => `Prazo: ${labels[Number(v)] ?? `${v} meses`}`}
              contentStyle={{ fontSize: 11 }}
            />
            <ReferenceLine y={3} stroke="hsl(142 76% 40%)" strokeDasharray="4 2" label={{ value: 'Meta 3%', fontSize: 9 }} />
            <Line dataKey="rate" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Inflation targets chart
function InflationTargetsChart({ targets }: { targets: InflationTarget[] }) {
  const data = targets.map((t) => ({
    year:     t.year,
    center:   t.center,
    lower:    t.lower,
    upper:    t.upper,
    realized: t.realized,
    bandBase: t.lower,
    bandSize: parseFloat((t.upper - t.lower).toFixed(2)),
    missed:   t.realized !== null && (t.realized > t.upper || t.realized < t.lower),
  }))

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-medium">Meta de Inflação BCB vs IPCA Realizado (1999–2026)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-2">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
              interval={2}
            />
            <YAxis
              domain={[0, 14]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              width={36}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = data.find((x) => x.year === label)
                if (!d) return null
                return (
                  <div className="bg-card border border-border rounded p-2 text-xs space-y-0.5">
                    <p className="font-semibold">{label}</p>
                    <p>Meta: {d.center}% (±{((d.upper - d.lower) / 2).toFixed(1)}pp)</p>
                    <p>Banda: {d.lower}% – {d.upper}%</p>
                    {d.realized !== null && (
                      <p className={d.missed ? 'text-red-500 font-semibold' : 'text-green-500'}>
                        Realizado: {d.realized}% {d.missed ? '✗ fora da banda' : '✓'}
                      </p>
                    )}
                  </div>
                )
              }}
            />
            {/* Tolerance band — stacked bar: transparent base + colored band */}
            <Bar dataKey="bandBase" stackId="band" fill="transparent"    legendType="none" isAnimationActive={false} />
            <Bar dataKey="bandSize" stackId="band" fill="hsl(var(--chart-2) / 0.15)" stroke="hsl(var(--chart-2) / 0.4)" strokeWidth={0.5} legendType="none" isAnimationActive={false} />
            {/* Center target */}
            <Line dataKey="center"   stroke="var(--chart-2)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" legendType="none" />
            {/* Realized IPCA */}
            <Line
              dataKey="realized"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props
                if (payload.realized === null) return <g key={`dot-${cx}`} />
                return (
                  <circle
                    key={`dot-${cx}`}
                    cx={cx} cy={cy} r={3}
                    fill={payload.missed ? 'hsl(0 72% 51%)' : 'hsl(142 76% 40%)'}
                    stroke="none"
                  />
                )
              }}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-4 px-2 mt-1">
          <LegendItem color="hsl(var(--chart-2) / 0.3)" label="Banda de tolerância" type="bar" />
          <LegendItem color="var(--chart-2)" label="Centro da meta" type="dash" />
          <LegendItem color="var(--chart-3)" label="IPCA realizado" type="line" />
          <LegendItem color="hsl(0 72% 51%)" label="Fora da banda" type="dot" />
        </div>
      </CardContent>
    </Card>
  )
}

function LegendItem({ color, label, type }: { color: string; label: string; type: 'bar' | 'dash' | 'line' | 'dot' }) {
  return (
    <div className="flex items-center gap-1.5">
      {type === 'bar'  && <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />}
      {type === 'dash' && <div className="w-5 h-0 border-t-2 border-dashed" style={{ borderColor: color }} />}
      {type === 'line' && <div className="w-5 h-0 border-t-2" style={{ borderColor: color }} />}
      {type === 'dot'  && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />}
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// COPOM Cycles section
function CopomCyclesSection({ cycles, selicData }: { cycles: CopomCycle[]; selicData: SeriesPoint[] }) {
  if (cycles.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4 px-4">
          <p className="text-xs text-muted-foreground">Dados insuficientes para análise de ciclos COPOM.</p>
        </CardContent>
      </Card>
    )
  }

  const barData = cycles.map((c) => ({
    label:     `${c.direction === 'hike' ? '▲' : '▼'} ${c.startDate.slice(0, 4)}`,
    bps:       c.bps,
    direction: c.direction,
    bpsMeet:   c.moves > 0 ? parseFloat((c.bps / c.moves).toFixed(0)) : 0,
    months:    c.months,
    startRate: c.startRate,
    endRate:   c.endRate,
    moves:     c.moves,
    start:     c.startDate,
    end:       c.endDate,
  }))

  const hikeColor = 'hsl(0 72% 51%)'
  const cutColor  = 'hsl(142 76% 40%)'

  const totalHikeBps = cycles.filter((c) => c.direction === 'hike').reduce((s, c) => s + c.bps, 0)
  const totalCutBps  = cycles.filter((c) => c.direction === 'cut').reduce((s, c) => s + c.bps, 0)
  const avgCycleDur  = Math.round(cycles.reduce((s, c) => s + c.months, 0) / cycles.length)

  // Selic agora e COPOM atual
  const selicNow  = selicData.length > 0 ? selicData[selicData.length - 1].value : null
  const lastCycle = cycles[cycles.length - 1]

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ciclos identificados" value={String(cycles.length)} sub="desde 2001" />
        <StatCard label="Total alta acumulada" value={`${totalHikeBps} bps`} sub={`${cycles.filter((c) => c.direction === 'hike').length} ciclos`} />
        <StatCard label="Total cortes acumulados" value={`${totalCutBps} bps`} sub={`${cycles.filter((c) => c.direction === 'cut').length} ciclos`} />
        <StatCard label="Duração média" value={`${avgCycleDur} meses`} sub="por ciclo" />
      </div>

      {/* Bar chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Bps movidos por ciclo COPOM (vermelho = alta / verde = corte)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-2">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                angle={-35}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tickFormatter={(v: number) => `${v}`}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                width={40}
                label={{ value: 'bps', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'var(--muted-foreground)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-card border border-border rounded p-2 text-xs space-y-0.5">
                      <p className="font-semibold">{d.direction === 'hike' ? 'Alta' : 'Corte'} — {d.start.slice(0, 7)} → {d.end.slice(0, 7)}</p>
                      <p>{d.bps} bps totais · {d.moves} movimentos · {d.months} meses</p>
                      <p>{d.startRate.toFixed(2)}% → {d.endRate.toFixed(2)}%</p>
                      <p className="text-muted-foreground">Média por reunião: ~{d.bpsMeet} bps</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="bps" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {barData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.direction === 'hike' ? hikeColor : cutColor} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cycle table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Detalhe dos Ciclos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-0 px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ciclo</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">De</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Para</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">bps</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Meses</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Mov.</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">bps/mov</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-1.5">
                      <span className={`font-semibold ${c.direction === 'hike' ? 'text-red-500' : 'text-green-500'}`}>
                        {c.direction === 'hike' ? '▲ Alta' : '▼ Corte'}
                      </span>
                      <span className="ml-1.5 text-muted-foreground">{c.startDate.slice(0, 7)}</span>
                    </td>
                    <td className="text-right px-3 py-1.5 font-mono">{c.startRate.toFixed(2)}%</td>
                    <td className="text-right px-3 py-1.5 font-mono">{c.endRate.toFixed(2)}%</td>
                    <td className={`text-right px-3 py-1.5 font-mono font-semibold ${c.direction === 'hike' ? 'text-red-500' : 'text-green-500'}`}>
                      {c.direction === 'hike' ? '+' : '-'}{c.bps}
                    </td>
                    <td className="text-right px-3 py-1.5 font-mono">{c.months}</td>
                    <td className="text-right px-3 py-1.5 font-mono">{c.moves}</td>
                    <td className="text-right px-4 py-1.5 font-mono text-muted-foreground">
                      ~{c.moves > 0 ? Math.round(c.bps / c.moves) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selicNow !== null && lastCycle && (
            <p className="text-[10px] text-muted-foreground px-4 py-2">
              Selic atual: {selicNow.toFixed(2)}% — último ciclo detectado: {lastCycle.direction === 'hike' ? 'alta' : 'corte'} de {lastCycle.bps} bps em {lastCycle.months} meses.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// BPS precificados pelo Focus Selic
function BpsPrecificados({ selicNow, focusSelic }: { selicNow: number | null; focusSelic: { year: string; median: number | null }[] }) {
  if (selicNow === null || focusSelic.length === 0) return null

  const byYear = new Map(focusSelic.map((r) => [r.year, r.median]))
  const currentYear = String(new Date().getFullYear())
  const nextYear    = String(Number(currentYear) + 1)
  const horizonYear = focusSelic.at(-1)?.year ?? nextYear

  function bps(target: number | null | undefined): string {
    if (target == null) return '—'
    const diff = Math.round((selicNow! - target) * 100)
    return diff > 0 ? `-${diff} bps` : diff < 0 ? `+${Math.abs(diff)} bps` : '0 bps'
  }

  const focus2026 = byYear.get(currentYear === '2026' ? currentYear : '2026')
  const focus2027 = byYear.get('2027')
  const focusNext = byYear.get(nextYear)
  const focusHorizon = focusSelic.at(-1)?.median ?? null

  const items = [
    { label: `Até fim de ${currentYear}`, bpsStr: bps(byYear.get(currentYear)), target: byYear.get(currentYear) },
    { label: 'Até fim de 2026',           bpsStr: bps(focus2026),               target: focus2026 },
    { label: 'Ao longo de 2027',          bpsStr: bps(focus2027) !== bps(focus2026) ? (() => { const a = focus2026; const b = focus2027; if (a==null||b==null) return '—'; const d=Math.round((a-b)*100); return d>0?`-${d} bps`:d<0?`+${Math.abs(d)} bps`:'0 bps' })() : '—', target: focus2027 },
    { label: `Até fim de 2027`,           bpsStr: bps(focus2027),               target: focus2027 },
    { label: `Horizonte (${horizonYear})`, bpsStr: bps(focusHorizon),           target: focusHorizon },
  ].filter((it, i, arr) => it.bpsStr !== '—' && arr.findIndex((x) => x.label === it.label) === i)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.slice(0, 4).map((it) => (
        <Card key={it.label} className="bg-card border-border">
          <CardContent className="pt-3 pb-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{it.label}</p>
            <p className={`text-xl font-semibold mt-0.5 ${it.bpsStr.startsWith('-') ? 'text-green-500' : it.bpsStr.startsWith('+') ? 'text-red-500' : ''}`}>
              {it.bpsStr}
            </p>
            {it.target != null && (
              <p className="text-[10px] text-muted-foreground">Focus: {it.target.toFixed(2)}% a.a.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-3 pb-3 px-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-semibold mt-0.5">{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Focus bar card (existente)
function FocusCard({ title, rows, unit, color }: { title: string; rows: FocusRow[]; unit: string; color: string }) {
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => r.median ?? 0))
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.year} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{r.year}</span>
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${((r.median ?? 0) / max) * 100}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-mono font-semibold w-16 text-right">
                {r.median !== null ? `${r.median.toFixed(2)}${unit}` : '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">Mediana das projeções do relatório Focus (BCB)</p>
      </CardContent>
    </Card>
  )
}
