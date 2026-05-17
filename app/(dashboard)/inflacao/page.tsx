export const dynamic = 'force-dynamic'

import { getSeriesHistory, getSeriesLatestTwo } from '@/db/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SeriesChart } from '@/components/charts/series-chart'

const BCB_META_CENTRAL = 3.0
const BCB_META_TETO    = 4.5

function deltaLabel(current: number, previous: number | null) {
  if (previous === null) return null
  const diff = current - previous
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}pp`
}

function statusMeta(ipca12m: number) {
  if (ipca12m <= BCB_META_TETO) return { label: 'Dentro da meta', variant: 'secondary' as const }
  return { label: 'Acima do teto', variant: 'destructive' as const }
}

function formatDate(dateStr: string) {
  const [year, month] = dateStr.split('-')
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${months[Number(month) - 1]}/${year}`
}

// Combina múltiplas séries em array alinhado por data
function mergeSeriesData(
  seriesMap: Record<string, { date: string; value: number }[]>
) {
  const dateSet = new Set<string>()
  for (const data of Object.values(seriesMap)) {
    data.forEach((p) => dateSet.add(p.date))
  }
  const dates = Array.from(dateSet).sort()
  return dates.map((date) => {
    const row: Record<string, string | number> = { date }
    for (const [key, data] of Object.entries(seriesMap)) {
      const point = data.find((p) => p.date === date)
      if (point !== undefined) row[key] = point.value
    }
    return row
  })
}

export default async function InflacaoPage() {
  const [ipca, ipca12m, nucleo, nucleoExcl, difusao, ipcaKv, ipca12mKv, nucleoKv] =
    await Promise.all([
      getSeriesHistory('433',   24),   // IPCA mensal — gráfico
      getSeriesHistory('13522', 24),   // IPCA 12m — gráfico
      getSeriesHistory('16121', 24),   // Núcleo médias aparadas — gráfico
      getSeriesHistory('27839', 24),   // Núcleo por exclusão — gráfico
      getSeriesHistory('11428', 24),   // Difusão
      getSeriesLatestTwo('433'),       // KV cards
      getSeriesLatestTwo('13522'),
      getSeriesLatestTwo('16121'),
    ])

  const chartData = mergeSeriesData({
    ipca12m:    ipca12m?.data  ?? [],
    nucleo:     nucleo?.data   ?? [],
    nucleoExcl: nucleoExcl?.data ?? [],
  })

  const meta12m = statusMeta(ipca12mKv?.latest.value ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Inflação</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Meta BCB: {BCB_META_CENTRAL}% · Teto: {BCB_META_TETO}%
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* IPCA Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
              IPCA Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {ipcaKv ? (
              <>
                <div className="text-3xl font-mono font-semibold">
                  {ipcaKv.latest.value.toFixed(2)}
                  <span className="text-lg text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDate(ipcaKv.latest.date)}
                  </span>
                  {ipcaKv.previous && (
                    <span className={`text-xs font-mono ${
                      ipcaKv.latest.value >= ipcaKv.previous.value
                        ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {deltaLabel(ipcaKv.latest.value, ipcaKv.previous.value)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* IPCA 12 meses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
              IPCA Acumulado 12m
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {ipca12mKv ? (
              <>
                <div className="text-3xl font-mono font-semibold">
                  {ipca12mKv.latest.value.toFixed(2)}
                  <span className="text-lg text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDate(ipca12mKv.latest.date)}
                  </span>
                  <Badge variant={meta12m.variant} className="text-xs h-4">
                    {meta12m.label}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* Núcleo IPCA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
              Núcleo IPCA (médias aparadas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {nucleoKv ? (
              <>
                <div className="text-3xl font-mono font-semibold">
                  {nucleoKv.latest.value.toFixed(2)}
                  <span className="text-lg text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDate(nucleoKv.latest.date)}
                  </span>
                  {nucleoKv.previous && (
                    <span className={`text-xs font-mono ${
                      nucleoKv.latest.value >= nucleoKv.previous.value
                        ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {deltaLabel(nucleoKv.latest.value, nucleoKv.previous.value)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">IPCA e Núcleos — últimos 24 meses (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <SeriesChart
            data={chartData}
            series={[
              { key: 'ipca12m',    label: 'IPCA 12m',       color: 'var(--chart-1)' },
              { key: 'nucleo',     label: 'Núcleo ap. c/suav', color: 'var(--chart-2)' },
              { key: 'nucleoExcl', label: 'Núcleo p/ exclusão', color: 'var(--chart-4)' },
            ]}
            referenceLines={[
              { value: BCB_META_CENTRAL, label: `Meta ${BCB_META_CENTRAL}%`, color: 'var(--chart-2)' },
              { value: BCB_META_TETO,    label: `Teto ${BCB_META_TETO}%`,    color: 'var(--chart-3)' },
            ]}
            unit="%"
            height={300}
          />
        </CardContent>
      </Card>

      {/* Difusão */}
      {difusao && difusao.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Difusão do IPCA — últimos 24 meses (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <SeriesChart
              data={difusao.data}
              series={[{ key: 'value', label: 'Difusão', color: 'var(--chart-5)' }]}
              referenceLines={[{ value: 50, label: '50%', color: 'var(--muted-foreground)' }]}
              unit="%"
              height={200}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
