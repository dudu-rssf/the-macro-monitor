'use client'

import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { SectionDivider } from '@/components/macro/section-divider'
import { SectionCard }    from '@/components/macro/section-card'
import { KpiCard }        from '@/components/macro/kpi-card'
import { MacroChart }     from '@/components/macro/macro-chart'
import { RangeSelector }  from '@/components/macro/range-selector'
import type { TimeRange } from '@/components/macro/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface HiatoPoint  { date: string; actual: number; trend: number; gap: number }
interface TaylorPoint { date: string; selic: number; taylor: number; infGap: number; outputGap: number }
interface SurprisePoint { date: string; actual: number; expected: number; surprise: number }
interface DebtPoint   { date: string; dlsp: number; delta: number; interestContrib: number; growthContrib: number; primaryContrib: number; residual: number }
interface CorrPoint   { date: string; selicIpca: number | null; embiUsd: number | null; ibcUnemp: number | null }
interface FciPoint    { date: string; fci: number; selicZ: number; spreadZ: number; usdZ: number; embiZ: number }

interface QuantData {
  hiatoData:    HiatoPoint[]
  taylorData:   TaylorPoint[]
  surpriseData: SurprisePoint[]
  debtData:     DebtPoint[]
  corrData:     CorrPoint[]
  fciData:      FciPoint[]
}

// ── Range filter ─────────────────────────────────────────────────────────────

function cutoff(range: TimeRange | null): string {
  if (!range || range === 'max') return '0000-00'
  const months: Record<TimeRange, number> = { '6m': 6, '1y': 12, '2y': 24, '5y': 60, '10y': 120, 'max': 0 }
  const n   = months[range]
  const now = new Date()
  const d   = new Date(now.getFullYear(), now.getMonth() - n, 1)
  return d.toISOString().slice(0, 7)
}

function filterRange<T extends { date: string }>(data: T[], range: TimeRange | null): T[] {
  const c = cutoff(range)
  return data.filter(p => p.date >= c)
}

// ── Axis helpers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmtDate(d: any) { return String(d ?? '').slice(0, 7) }

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '6px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuantDashboard({ data }: { data: QuantData }) {
  const [globalRange, setGlobalRange]     = useState<TimeRange | null>('5y')
  const [overrides, setOverrides]         = useState<Record<string, TimeRange>>({})

  function handleGlobal(r: TimeRange) { setGlobalRange(r); setOverrides({}) }
  function handleSection(id: string, r: TimeRange) {
    setOverrides(prev => ({ ...prev, [id]: r }))
    setGlobalRange(null)
  }

  const sp = { globalRange, sectionOverrides: overrides, onGlobalChange: handleGlobal, onSectionChange: handleSection }

  // ── Derived KPIs ─────────────────────────────────────────────────────────

  const latestHiato   = data.hiatoData.at(-1)
  const latestTaylor  = data.taylorData.at(-1)
  const lastSurprise  = data.surpriseData.at(-1)
  const avgSurprise12 = data.surpriseData.slice(-12).reduce((s, p) => s + p.surprise, 0) /
                        Math.max(data.surpriseData.slice(-12).length, 1)
  const upside12      = data.surpriseData.slice(-12).filter(p => p.surprise > 0).length
  const latestDebt    = data.debtData.at(-1)
  const debtChange12  = latestDebt && data.debtData.length >= 12
    ? latestDebt.dlsp - data.debtData[data.debtData.length - 12].dlsp : null
  const latestCorr    = data.corrData.at(-1)
  const latestFci     = data.fciData.at(-1)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Análises Quantitativas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hiato do produto, Regra de Taylor, surpresa Focus, decomposição da dívida, correlações e FCI
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Horizonte global</span>
          <RangeSelector active={globalRange} onChange={handleGlobal} />
        </div>
      </div>

      {/* ── 1. HIATO DO PRODUTO ─────────────────────────────────────────── */}
      <SectionDivider
        title="Hiato do Produto"
        description="Desvio do IBC-Br em relação à tendência de longo prazo (filtro Hodrick-Prescott, λ=14400). Positivo = economia acima do potencial (pressão inflacionária); negativo = abaixo (folga)."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Hiato atual"
          value={latestHiato?.gap ?? null}
          unit="%"
          date={latestHiato?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="IBC-Br (nível)"
          value={latestHiato?.actual ?? null}
          unit=""
          date={latestHiato?.date}
          delta={latestHiato && data.hiatoData.length >= 2 ? latestHiato.actual - data.hiatoData.at(-2)!.actual : null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Tendência HP"
          value={latestHiato?.trend ?? null}
          unit=""
          date={latestHiato?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Hiato 12m atrás"
          value={data.hiatoData.length >= 12 ? data.hiatoData.at(-12)!.gap : null}
          unit="%"
          date={data.hiatoData.at(-12)?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
      </div>

      <SectionCard title="IBC-Br — nível real vs tendência HP" sectionId="hiato-nivel" {...sp}>
        {(range) => (
          <MacroChart
            allData={filterRange(data.hiatoData, range)}
            series={[
              { key: 'actual', label: 'IBC-Br (real)',       color: 'var(--chart-1)' },
              { key: 'trend',  label: 'Tendência HP',        color: 'var(--chart-3)' },
            ]}
            unit="" height={280} effectiveRange={'max'}
          />
        )}
      </SectionCard>

      <SectionCard title="Hiato do Produto — desvio % em relação ao potencial" sectionId="hiato-gap" {...sp}>
        {(range) => {
          const d = filterRange(data.hiatoData, range)
          return (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={t => t.slice(0, 7)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Hiato']} labelFormatter={fmtDate} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Bar dataKey="gap" name="Hiato %" radius={[2, 2, 0, 0]}>
                  {d.map((entry, idx) => (
                    <Cell key={idx} fill={entry.gap >= 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-4))'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        }}
      </SectionCard>

      {/* ── 2. REGRA DE TAYLOR ──────────────────────────────────────────── */}
      <SectionDivider
        title="Regra de Taylor"
        description={`Selic implícita pela regra de Taylor: i* = r* + π + 1,5×(π − π*) + 0,5×hiato. Parâmetros: r*=4,5%, π*=3,0%. Acima da curva = postura mais hawkish que o modelo sugere.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Selic atual"
          value={latestTaylor?.selic ?? null}
          unit="% a.a."
          date={latestTaylor?.date}
          delta={latestTaylor && data.taylorData.length >= 2 ? latestTaylor.selic - data.taylorData.at(-2)!.selic : null}
          deltaUnit=" pp"
          deltaInvert={false}
        />
        <KpiCard
          title="Taylor implícita"
          value={latestTaylor?.taylor ?? null}
          unit="% a.a."
          date={latestTaylor?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Desvio (Selic − Taylor)"
          value={latestTaylor ? latestTaylor.selic - latestTaylor.taylor : null}
          unit=" pp"
          date={latestTaylor?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Hiato de inflação"
          value={latestTaylor?.infGap ?? null}
          unit=" pp"
          date={latestTaylor?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
      </div>

      <SectionCard title="Selic real vs Taylor implícita (% a.a.)" sectionId="taylor-chart" {...sp}>
        {(range) => (
          <MacroChart
            allData={filterRange(data.taylorData, range)}
            series={[
              { key: 'selic',  label: 'Selic (real)',     color: 'var(--chart-1)' },
              { key: 'taylor', label: 'Taylor implícita', color: 'var(--chart-4)' },
            ]}
            unit="%" height={280} effectiveRange={'max'}
          />
        )}
      </SectionCard>

      {/* ── 3. SURPRESA FOCUS ───────────────────────────────────────────── */}
      <SectionDivider
        title="Surpresa Focus — IPCA"
        description="Diferença entre o IPCA mensal realizado e a mediana das expectativas Focus (última projeção antes do fechamento do mês de referência). Positivo = IPCA veio acima do esperado."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Última surpresa"
          value={lastSurprise?.surprise ?? null}
          unit=" pp"
          date={lastSurprise?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Média surpresa 12m"
          value={parseFloat(avgSurprise12.toFixed(2))}
          unit=" pp"
          date={undefined}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="Surpresas positivas 12m"
          value={upside12}
          unit=" de 12"
          date={undefined}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="IPCA realizado (último)"
          value={lastSurprise?.actual ?? null}
          unit="% m/m"
          date={lastSurprise?.date}
          delta={lastSurprise && data.surpriseData.length >= 2
            ? lastSurprise.actual - data.surpriseData.at(-2)!.actual : null}
          deltaUnit=" pp"
          deltaInvert={false}
        />
      </div>

      <SectionCard title="Surpresa Focus — IPCA (realizado − expectativa, pp)" sectionId="surprise-chart" {...sp}>
        {(range) => {
          const d = filterRange(data.surpriseData, range)
          return (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v} pp`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => {
                    const n = Number(v)
                    return [
                      name === 'surprise' ? `${n >= 0 ? '+' : ''}${n.toFixed(2)} pp` : `${n.toFixed(2)}%`,
                      name === 'surprise' ? 'Surpresa' : name === 'actual' ? 'Realizado' : 'Esperado',
                    ]
                  }}
                  labelFormatter={fmtDate}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Bar dataKey="surprise" name="surprise" radius={[2, 2, 0, 0]}>
                  {d.map((entry, idx) => (
                    <Cell key={idx} fill={entry.surprise >= 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-2))'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        }}
      </SectionCard>

      <SectionCard title="IPCA realizado vs expectativa Focus (% m/m)" sectionId="surprise-lines" {...sp}>
        {(range) => (
          <MacroChart
            allData={filterRange(data.surpriseData, range)}
            series={[
              { key: 'actual',   label: 'Realizado',  color: 'var(--chart-1)' },
              { key: 'expected', label: 'Expectativa Focus', color: 'var(--chart-3)' },
            ]}
            unit="%" height={240} effectiveRange={'max'}
          />
        )}
      </SectionCard>

      {/* ── 4. DECOMPOSIÇÃO DA DÍVIDA ────────────────────────────────────── */}
      <SectionDivider
        title="Decomposição da Dívida Pública"
        description="Variação mensal da DLSP decomposta em: efeito juros (r×D), efeito crescimento (g×D, dilui a dívida) e resultado primário. Aproximação mensal a partir de taxas anuais."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="DLSP % PIB"
          value={latestDebt?.dlsp ?? null}
          unit="%"
          date={latestDebt?.date}
          delta={debtChange12}
          deltaUnit=" pp (12m)"
          deltaInvert={true}
        />
        <KpiCard
          title="Var. mensal DLSP"
          value={latestDebt?.delta ?? null}
          unit=" pp"
          date={latestDebt?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={true}
        />
        <KpiCard
          title="Contrib. juros (mês)"
          value={latestDebt?.interestContrib ?? null}
          unit=" pp"
          date={latestDebt?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={true}
        />
        <KpiCard
          title="Contrib. primário (mês)"
          value={latestDebt?.primaryContrib ?? null}
          unit=" pp"
          date={latestDebt?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
      </div>

      <SectionCard title="DLSP % PIB — trajetória" sectionId="dlsp-nivel" {...sp}>
        {(range) => (
          <MacroChart
            allData={filterRange(data.debtData, range)}
            series={[{ key: 'dlsp', label: 'DLSP % PIB', color: 'var(--chart-1)' }]}
            unit="%" height={240} effectiveRange={'max'}
          />
        )}
      </SectionCard>

      <SectionCard title="Contribuições mensais à variação da DLSP (pp)" sectionId="dlsp-decomp" {...sp}>
        {(range) => {
          const d = filterRange(data.debtData, range)
          return (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(2)}`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => { const n = Number(v); return [`${n >= 0 ? '+' : ''}${n.toFixed(3)} pp`, String(name)] }}
                  labelFormatter={fmtDate}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="interestContrib" name="Juros"    stackId="a" fill="hsl(var(--chart-4))" fillOpacity={0.85} />
                <Bar dataKey="growthContrib"   name="Crescimento" stackId="a" fill="hsl(var(--chart-2))" fillOpacity={0.85} />
                <Bar dataKey="primaryContrib"  name="Primário" stackId="a" fill="hsl(var(--chart-3))" fillOpacity={0.85} />
                <Bar dataKey="residual"        name="Residual" stackId="a" fill="hsl(var(--chart-5))" fillOpacity={0.60} />
              </BarChart>
            </ResponsiveContainer>
          )
        }}
      </SectionCard>

      {/* ── 5. CORRELAÇÕES ROLANTES ──────────────────────────────────────── */}
      <SectionDivider
        title="Correlações Rolantes"
        description="Correlação de Pearson entre pares de variáveis em janela móvel de 24 meses. +1 = correlação positiva perfeita, −1 = inversa perfeita, 0 = sem relação linear."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Selic × IPCA 12m"
          value={latestCorr?.selicIpca ?? null}
          unit=""
          date={latestCorr?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="EMBI+ × USD/BRL"
          value={latestCorr?.embiUsd ?? null}
          unit=""
          date={latestCorr?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
        <KpiCard
          title="IBC-Br × Desemprego"
          value={latestCorr?.ibcUnemp ?? null}
          unit=""
          date={latestCorr?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={false}
        />
      </div>

      <SectionCard title="Correlações rolantes — janela 24 meses" sectionId="corr-chart" {...sp}>
        {(range) => {
          const d = filterRange(data.corrData, range)
          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={d} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [Number(v).toFixed(3), '']} labelFormatter={fmtDate} />
                <ReferenceLine y={0}    stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <ReferenceLine y={0.5}  stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" strokeOpacity={0.4} />
                <ReferenceLine y={-0.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" strokeOpacity={0.4} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="selicIpca" name="Selic × IPCA 12m"     stroke="hsl(var(--chart-1))" dot={false} strokeWidth={1.5} connectNulls />
                <Line type="monotone" dataKey="embiUsd"   name="EMBI+ × USD/BRL"      stroke="hsl(var(--chart-4))" dot={false} strokeWidth={1.5} connectNulls />
                <Line type="monotone" dataKey="ibcUnemp"  name="IBC-Br × Desemprego"  stroke="hsl(var(--chart-2))" dot={false} strokeWidth={1.5} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )
        }}
      </SectionCard>

      {/* ── 6. ÍNDICE DE CONDIÇÕES FINANCEIRAS ──────────────────────────── */}
      <SectionDivider
        title="Índice de Condições Financeiras (FCI)"
        description="Média ponderada dos z-scores de Selic (30%), Spread PF (25%), USD/BRL (25%) e EMBI+ (20%). Positivo = condições mais restritivas que a média histórica; negativo = mais frouxas."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="FCI atual"
          value={latestFci?.fci ?? null}
          unit=" σ"
          date={latestFci?.date}
          delta={latestFci && data.fciData.length >= 2 ? latestFci.fci - data.fciData.at(-2)!.fci : null}
          deltaUnit=" σ"
          deltaInvert={true}
        />
        <KpiCard
          title="Selic (z-score)"
          value={latestFci?.selicZ ?? null}
          unit=" σ"
          date={latestFci?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={true}
        />
        <KpiCard
          title="Spread PF (z-score)"
          value={latestFci?.spreadZ ?? null}
          unit=" σ"
          date={latestFci?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={true}
        />
        <KpiCard
          title="EMBI+ (z-score)"
          value={latestFci?.embiZ ?? null}
          unit=" σ"
          date={latestFci?.date}
          delta={null}
          deltaUnit=""
          deltaInvert={true}
        />
      </div>

      <SectionCard title="FCI — condições financeiras ao longo do tempo (σ)" sectionId="fci-linha" {...sp}>
        {(range) => {
          const d = filterRange(data.fciData, range)
          return (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={d} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(1)}σ`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(3)} σ`, 'FCI']} labelFormatter={fmtDate} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'neutro', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <ReferenceLine y={1}  stroke="hsl(var(--chart-4))" strokeDasharray="2 4" strokeOpacity={0.5} />
                <ReferenceLine y={-1} stroke="hsl(var(--chart-2))" strokeDasharray="2 4" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="fci" name="FCI" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )
        }}
      </SectionCard>

      <SectionCard title="FCI — componentes normalizados (z-score atual)" sectionId="fci-comp" {...sp}>
        {() => {
          const snapshot = latestFci
            ? [
                { name: 'Selic',    value: latestFci.selicZ,  fill: 'hsl(var(--chart-1))' },
                { name: 'Spread PF', value: latestFci.spreadZ, fill: 'hsl(var(--chart-4))' },
                { name: 'USD/BRL',  value: latestFci.usdZ,    fill: 'hsl(var(--chart-3))' },
                { name: 'EMBI+',    value: latestFci.embiZ,   fill: 'hsl(var(--chart-2))' },
              ]
            : []
          return (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={snapshot} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(1)}σ`} domain={['auto', 'auto']} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(3)} σ`, 'z-score']} />
                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {snapshot.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        }}
      </SectionCard>

    </div>
  )
}
