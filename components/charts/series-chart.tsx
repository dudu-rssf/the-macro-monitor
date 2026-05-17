'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

interface ChartSeries {
  key: string
  label: string
  color: string
}

interface ReferenceLineConfig {
  value: number
  label: string
  color: string
}

interface SeriesChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  series: ChartSeries[]
  referenceLines?: ReferenceLineConfig[]
  unit?: string
  height?: number
}

export function SeriesChart({ data, series, referenceLines = [], unit = '', height = 280 }: SeriesChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }])
  )

  function formatDate(value: string) {
    if (!value) return ''
    const [year, month] = value.split('-')
    return `${month}/${year?.slice(2)}`
  }

  function formatValue(value: number) {
    return `${value.toFixed(2)}${unit}`
  }

  return (
    <ChartContainer config={config} className="w-full aspect-auto" style={{ height }}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `${v}${unit}`}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatValue(Number(value))}
              labelFormatter={(label) => formatDate(String(label))}
            />
          }
        />
        {referenceLines.map((ref) => (
          <ReferenceLine
            key={ref.value}
            y={ref.value}
            stroke={ref.color}
            strokeDasharray="4 2"
            label={{ value: ref.label, fill: ref.color, fontSize: 10, fontFamily: 'var(--font-mono)' }}
          />
        ))}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
