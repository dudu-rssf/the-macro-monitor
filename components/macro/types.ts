export type TimeRange = '6m' | '1y' | '2y' | '5y' | '10y' | 'max'

export const RANGES: { value: TimeRange; label: string }[] = [
  { value: '6m',  label: '6M' },
  { value: '1y',  label: '1A' },
  { value: '2y',  label: '2A' },
  { value: '5y',  label: '5A' },
  { value: '10y', label: '10A' },
  { value: 'max', label: 'Máx' },
]

export interface SeriesPoint {
  date: string
  value: number
}
