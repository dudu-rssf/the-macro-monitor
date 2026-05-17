'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ReferenceLine, Legend
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { TimeRange } from './types'

export interface ChartSeries {
  key: string
  label: string
  color: string
}

export interface ReferenceLineConfig {
  value: number
  label: string
  color: string
}

interface MacroChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allData: any[]
  series: ChartSeries[]
  referenceLines?: ReferenceLineConfig[]
  unit?: string
  height?: number
  chartType?: 'line' | 'bar'
  stacked?: boolean
  effectiveRange: TimeRange
  xKey?: string
  xFormatter?: (value: string) => string
  yDomain?: [number, number]
}

export function cutData(data: { date: string }[], range: TimeRange) {
  if (range === 'max') return data
  const months: Record<TimeRange, number> = { '6m': 6, '1y': 12, '2y': 24, '5y': 60, '10y': 120, max: 0 }
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months[range])
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return data.filter((d) => d.date >= cutoffStr)
}

function formatDateTick(value: string) {
  if (!value) return ''
  const [year, month] = value.split('-')
  return `${month}/${year?.slice(2)}`
}

function formatValue(value: number, unit: string) {
  return `${value.toFixed(2)}${unit}`
}

// Smart Y-axis domain: zoom in when values occupy top portion of the scale.
// Rule: if all values ≥ 0 and min/max ≥ 0.65 → start near min (not at 0).
// This prevents IBC-Br (90-120) from showing empty space below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeYDomain(data: any[], seriesKeys: string[], refLineValues: number[], isBar: boolean, isStacked = false): [number, number] | undefined {
  if (isBar && isStacked) {
    // Stacked bars: domain must fit the total stack per date, not individual series max
    const rowSums = data.map((row) =>
      seriesKeys.reduce((sum, k) => sum + (typeof row[k] === 'number' ? (row[k] as number) : 0), 0)
    )
    const maxSum = Math.max(...rowSums, 0)
    const minSum = Math.min(...rowSums, 0)
    if (maxSum === minSum) return undefined
    return [Math.min(0, minSum), maxSum * 1.05]
  }

  const nums = data
    .flatMap((row) => seriesKeys.map((k) => row[k]))
    .filter((v): v is number => typeof v === 'number' && isFinite(v))

  if (nums.length === 0) return undefined

  const allNums = [...nums, ...refLineValues]
  const raw_min = Math.min(...allNums)
  const raw_max = Math.max(...allNums)
  if (raw_max === raw_min) return undefined

  // Bar charts always anchor at 0
  if (isBar) {
    return [Math.min(0, raw_min), raw_max * 1.05]
  }

  if (raw_min < 0) {
    // negative values — pad both sides symmetrically
    const pad = (raw_max - raw_min) * 0.08
    return [raw_min - pad, raw_max + pad]
  }

  if (raw_min / raw_max >= 0.65) {
    // tight positive range → zoom in with small margin
    const pad = (raw_max - raw_min) * 0.15
    return [Math.max(0, raw_min - pad), raw_max + pad]
  }

  // default: start at 0
  return [0, raw_max * 1.05]
}

export function MacroChart({
  allData, series, referenceLines = [], unit = '%', height = 280,
  chartType = 'line', stacked = false, effectiveRange, xKey = 'date', xFormatter, yDomain: yDomainProp,
}: MacroChartProps) {
  const data = xKey === 'date' ? cutData(allData as { date: string }[], effectiveRange) : allData

  const yDomain = yDomainProp ?? computeYDomain(
    data,
    series.map((s) => s.key),
    referenceLines.map((r) => r.value),
    chartType === 'bar',
    stacked,
  )

  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }])
  )

  const tickFmt = xFormatter ?? formatDateTick

  const xAxis = (
    <XAxis
      dataKey={xKey}
      tickFormatter={tickFmt}
      tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
      tickLine={false}
      axisLine={false}
      interval="preserveStartEnd"
    />
  )

  const yAxis = (
    <YAxis
      tickFormatter={(v) => `${Number(v).toFixed(1)}${unit}`}
      tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
      tickLine={false}
      axisLine={false}
      width={52}
      domain={yDomain}
      allowDataOverflow={false}
    />
  )

  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

  const tooltip = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value, name) => {
            const cfg = config[name as string]
            const label = cfg?.label ?? String(name)
            return (
              <div className="flex items-center justify-between gap-6 w-full">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium tabular-nums">{formatValue(Number(value), unit)}</span>
              </div>
            )
          }}
          labelFormatter={(label) => tickFmt(String(label))}
        />
      }
    />
  )

  const refLines = referenceLines.map((ref) => (
    <ReferenceLine
      key={ref.value}
      y={ref.value}
      stroke={ref.color}
      strokeDasharray="4 2"
      label={{ value: ref.label, fill: ref.color, fontSize: 9, fontFamily: 'var(--font-mono)' }}
    />
  ))

  const legend = (
    <Legend
      iconType="plainline"
      iconSize={16}
      wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)', paddingTop: '8px' }}
    />
  )

  const commonProps = { data, margin: { top: 4, right: 16, left: 0, bottom: 0 } }

  return (
    <ChartContainer config={config} className="w-full aspect-auto" style={{ height }}>
      {chartType === 'bar' ? (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{legend}
          {refLines}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} radius={stacked ? [0,0,0,0] : [2,2,0,0]} maxBarSize={stacked ? 40 : 16} stackId={stacked ? 'stack' : undefined} />
          ))}
        </BarChart>
      ) : (
        <LineChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{legend}
          {refLines}
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color}
              strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  )
}
