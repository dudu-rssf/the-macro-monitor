'use client'

import { useState } from 'react'
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

type Smoothing = 'raw' | 'mm3' | 'mm6' | 'mm9' | 'mm12' | 'yoy'

const SMOOTHING_OPTIONS: { value: Smoothing; label: string }[] = [
  { value: 'raw',  label: 'Bruto' },
  { value: 'mm3',  label: 'MM3'   },
  { value: 'mm6',  label: 'MM6'   },
  { value: 'mm9',  label: 'MM9'   },
  { value: 'mm12', label: 'MM12'  },
  { value: 'yoy',  label: 'YoY'   },
]

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
  showSmoothing?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySmoothing(data: any[], keys: string[], smoothing: Smoothing): any[] {
  if (smoothing === 'raw') return data

  if (smoothing === 'yoy') {
    return data.map((row, i) => {
      const newRow = { ...row }
      if (i < 12) {
        keys.forEach((k) => { newRow[k] = undefined })
        return newRow
      }
      const prev = data[i - 12]
      keys.forEach((key) => {
        const curr = row[key]
        const past = prev[key]
        newRow[key] = typeof curr === 'number' && typeof past === 'number'
          ? parseFloat((curr - past).toFixed(2))
          : undefined
      })
      return newRow
    })
  }

  const n = smoothing === 'mm3' ? 3 : smoothing === 'mm6' ? 6 : smoothing === 'mm9' ? 9 : 12
  return data.map((row, i) => {
    const newRow = { ...row }
    keys.forEach((key) => {
      const window = data.slice(Math.max(0, i - n + 1), i + 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vals = window.map((r: any) => r[key]).filter((v: unknown): v is number => typeof v === 'number')
      newRow[key] = vals.length > 0
        ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2))
        : undefined
    })
    return newRow
  })
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeYDomain(data: any[], seriesKeys: string[], refLineValues: number[], isBar: boolean, isStacked = false): [number, number] | undefined {
  if (isBar && isStacked) {
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

  if (isBar) {
    return [Math.min(0, raw_min), raw_max * 1.05]
  }

  if (raw_min < 0) {
    const pad = (raw_max - raw_min) * 0.08
    return [raw_min - pad, raw_max + pad]
  }

  if (raw_min / raw_max >= 0.65) {
    const pad = (raw_max - raw_min) * 0.15
    return [Math.max(0, raw_min - pad), raw_max + pad]
  }

  return [0, raw_max * 1.05]
}

export function MacroChart({
  allData, series, referenceLines = [], unit = '%', height = 280,
  chartType = 'line', stacked = false, effectiveRange, xKey = 'date', xFormatter, yDomain: yDomainProp,
  showSmoothing,
}: MacroChartProps) {
  const [smoothing, setSmoothing] = useState<Smoothing>('raw')

  const showSmoothingToggle = showSmoothing !== undefined ? showSmoothing : !stacked

  const seriesKeys = series.map((s) => s.key)
  const processedAllData = xKey === 'date' && smoothing !== 'raw'
    ? applySmoothing(allData, seriesKeys, smoothing)
    : allData

  const data = xKey === 'date' ? cutData(processedAllData as { date: string }[], effectiveRange) : processedAllData

  const yDomain = yDomainProp ?? computeYDomain(
    data,
    seriesKeys,
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
    <div className="flex flex-col gap-1">
      {showSmoothingToggle && (
        <div className="flex justify-end gap-0.5">
          {SMOOTHING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSmoothing(opt.value)}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                smoothing === opt.value
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
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
    </div>
  )
}
