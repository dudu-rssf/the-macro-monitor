import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface KpiCardProps {
  title: string
  value: number | null
  unit?: string
  date?: string
  delta?: number | null
  deltaUnit?: string
  badge?: { label: string; variant: 'secondary' | 'destructive' | 'outline' | 'default' }
  deltaInvert?: boolean  // true = alta é ruim (ex: inflação, desemprego)
}

export function formatDate(dateStr: string) {
  const [year, month] = dateStr.split('-')
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${months[Number(month) - 1]}/${year}`
}

export function KpiCard({ title, value, unit = '%', date, delta, deltaUnit = 'pp', badge, deltaInvert = true }: KpiCardProps) {
  const deltaColor = delta === null || delta === undefined
    ? ''
    : deltaInvert
      ? (delta > 0 ? 'text-red-400' : 'text-emerald-400')
      : (delta > 0 ? 'text-emerald-400' : 'text-red-400')

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-[11px] text-muted-foreground font-normal uppercase tracking-wider leading-tight">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        {value !== null && value !== undefined ? (
          <>
            <div className="text-3xl font-mono font-semibold leading-none">
              {value.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-0.5">{unit}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {date && (
                <span className="text-xs text-muted-foreground font-mono">{formatDate(date)}</span>
              )}
              {delta !== null && delta !== undefined && (
                <span className={`text-xs font-mono ${deltaColor}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(2)}{deltaUnit}
                </span>
              )}
              {badge && (
                <Badge variant={badge.variant} className="text-[10px] h-4 px-1.5">
                  {badge.label}
                </Badge>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">Sem dados</div>
        )}
      </CardContent>
    </Card>
  )
}
