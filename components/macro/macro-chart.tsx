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
  effectiveRange: TimeRange
  xKey?: string
  xFormatter?: (value: string) => string
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

export function MacroChart({
  allData, series, referenceLines = [], unit = '%', height = 280,
  chartType = 'line', effectiveRange, xKey = 'date', xFormatter
}: MacroChartProps) {
  const data = xKey === 'date' ? cutData(allData as { date: string }[], effectiveRange) : allData

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
      tickFormatter={(v) => `${v}${unit}`}
      tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
      tickLine={false}
      axisLine={false}
      width={44}
    />
  )

  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

  const tooltip = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value) => formatValue(Number(value), unit)}
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
            <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[2,2,0,0]} maxBarSize={16} />
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
