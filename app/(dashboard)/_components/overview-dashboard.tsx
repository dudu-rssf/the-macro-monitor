'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/components/macro/kpi-card'
import type { SeriesPoint } from '@/components/macro/types'
import { NewsSection } from './news-section'
import { CalendarSection } from './calendar-section'
import { AiContextSection } from './ai-context-section'
import { ErrorBoundary } from './error-boundary'

type Kv = { latest: SeriesPoint; previous: SeriesPoint | null } | null

interface OverviewData {
  ibcBr12m:    Kv
  desemprego:  Kv
  rendimento:  Kv
  ipca12m:     Kv
  selic:       Kv
  juroReal:    { value: number | null; prev: number | null; date?: string }
  dlsp:        Kv
  dbgg:        Kv
  primario:    Kv
  primario12m: Kv
  inadim:      Kv
  spread:      Kv
  usdBrl:      Kv
  embi:        Kv
  reservas:    Kv
}

interface Props { data: OverviewData }

type Status = 'ok' | 'warn' | 'bad' | 'info'

const STATUS_DOT: Record<Status, string> = {
  ok:   'bg-emerald-500',
  warn: 'bg-amber-400',
  bad:  'bg-red-500',
  info: 'bg-muted-foreground/40',
}

function dot(status: Status) {
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
}

function MetricRow({
  label, kv, unit = '%', decimals = 2,
  deltaUnit, deltaInvert = false, status, customValue, customDate,
}: {
  label: string
  kv?: Kv
  unit?: string
  decimals?: number
  deltaUnit?: string
  deltaInvert?: boolean
  status: Status
  customValue?: number | null
  customDate?: string
}) {
  const val   = customValue  !== undefined ? customValue   : kv?.latest.value  ?? null
  const prev  = kv?.previous?.value ?? null
  const date  = customDate   !== undefined ? customDate    : kv?.latest.date
  const delta = val !== null && prev !== null ? val - prev : null
  const dUnit = deltaUnit ?? unit

  const deltaColor = delta === null ? '' : deltaInvert
    ? (delta > 0 ? 'text-red-400' : 'text-emerald-400')
    : (delta > 0 ? 'text-emerald-400' : 'text-red-400')

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="w-2 flex justify-center shrink-0">{dot(status)}</div>
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <div className="text-right shrink-0">
        {val !== null ? (
          <>
            <span className="text-sm font-mono font-semibold tabular-nums">
              {val.toFixed(decimals)}
            </span>
            <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
            {delta !== null && (
              <span className={`ml-2 text-xs font-mono tabular-nums ${deltaColor}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(2)}{dUnit}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      {date && (
        <span className="text-[10px] text-muted-foreground/60 font-mono w-12 text-right shrink-0">
          {formatDate(date)}
        </span>
      )}
    </div>
  )
}

function CategoryCard({
  title, href, accentColor, children,
}: {
  title: string
  href: string
  accentColor: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className="block group">
      <Card className="bg-card border-border h-full transition-colors group-hover:border-muted-foreground/40">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          {children}
        </CardContent>
      </Card>
    </Link>
  )
}

function statusFor(val: number | null, thresholds: { ok: number; warn: number; invert?: boolean }): Status {
  if (val === null) return 'info'
  const { ok, warn, invert = false } = thresholds
  if (!invert) {
    if (val >= ok)   return 'ok'
    if (val >= warn) return 'warn'
    return 'bad'
  } else {
    if (val <= ok)   return 'ok'
    if (val <= warn) return 'warn'
    return 'bad'
  }
}

export function OverviewDashboard({ data }: Props) {
  const {
    ibcBr12m, desemprego, rendimento,
    ipca12m, selic, juroReal,
    dlsp, dbgg, primario, primario12m,
    inadim, spread, usdBrl, embi, reservas,
  } = data

  const ipca12mVal     = ipca12m?.latest.value     ?? null
  const selicVal       = selic?.latest.value        ?? null
  const dlspVal        = dlsp?.latest.value         ?? null
  const dbggVal        = dbgg?.latest.value         ?? null
  const embiVal        = embi?.latest.value         ?? null
  const inadimVal      = inadim?.latest.value       ?? null
  const ibcBr12mVal    = ibcBr12m?.latest.value     ?? null
  const desempregoVal  = desemprego?.latest.value   ?? null
  const primario12mVal = primario12m?.latest.value  ?? null

  // Resultado primário sem desval já é NFSP — negamos pra resultado (positivo = superávit)
  const resultadoPrimario = primario12mVal !== null ? -primario12mVal : null
  const resultadoPrimarioPrev = primario12m?.previous?.value !== undefined && primario12m.previous !== null
    ? -primario12m.previous.value : null

  // Datas de referência
  const dates = [
    ibcBr12m?.latest.date, ipca12m?.latest.date, selic?.latest.date,
    dlsp?.latest.date, inadim?.latest.date, usdBrl?.latest.date,
  ].filter(Boolean) as string[]
  const mostRecentDate = dates.sort().at(-1)

  return (
    <div className="space-y-6">
      {/* Seção superior — Notícias | Calendário | IA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="px-4 pt-4 pb-4">
            <ErrorBoundary fallback="Erro ao carregar notícias.">
              <NewsSection />
            </ErrorBoundary>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="px-4 pt-4 pb-4">
            <ErrorBoundary fallback="Erro ao carregar calendário.">
              <CalendarSection />
            </ErrorBoundary>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="px-4 pt-4 pb-4">
            <ErrorBoundary fallback="Erro ao carregar análise de IA.">
              <AiContextSection />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Panorama Macro Brasil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Indicadores-chave de todas as áreas — clique em qualquer bloco para ver o detalhamento completo
          </p>
        </div>
        {mostRecentDate && (
          <span className="text-xs text-muted-foreground font-mono shrink-0 mt-1">
            ref. {formatDate(mostRecentDate)}
          </span>
        )}
      </div>

      {/* Legenda dos status */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">{dot('ok')}   <span>Favorável</span></div>
        <div className="flex items-center gap-1.5">{dot('warn')} <span>Atenção</span></div>
        <div className="flex items-center gap-1.5">{dot('bad')}  <span>Desfavorável</span></div>
        <div className="flex items-center gap-1.5">{dot('info')} <span>Informativo</span></div>
      </div>

      {/* Grid de categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* ── Atividade ─────────────────────────────────── */}
        <CategoryCard title="Atividade" href="/atividade" accentColor="var(--chart-1)">
          <MetricRow
            label="IBC-Br variação 12 meses (proxy PIB)"
            kv={ibcBr12m} unit="%" deltaUnit=" pp"
            status={statusFor(ibcBr12mVal, { ok: 2.5, warn: 0, invert: false })}
          />
          <MetricRow
            label="Taxa de desocupação — PNAD Contínua"
            kv={desemprego} unit="%" deltaUnit=" pp" deltaInvert
            status={statusFor(desempregoVal, { ok: 8, warn: 11, invert: true })}
          />
          <MetricRow
            label="Rendimento médio real habitual"
            kv={rendimento} unit=" R$" decimals={0}
            status="info"
          />
        </CategoryCard>

        {/* ── Inflação ──────────────────────────────────── */}
        <CategoryCard title="Inflação" href="/inflacao" accentColor="var(--chart-3)">
          <MetricRow
            label="IPCA acumulado 12 meses"
            kv={ipca12m} unit="%" deltaUnit=" pp" deltaInvert
            status={statusFor(ipca12mVal, { ok: 3.25, warn: 4.5, invert: true })}
          />
          <MetricRow
            label="Meta BCB 2025 (centro)"
            kv={null} unit="%" status="info"
            customValue={3.0} customDate={undefined}
          />
          <MetricRow
            label="Teto da meta (banda ± 1,5 pp)"
            kv={null} unit="%" status={statusFor(ipca12mVal, { ok: 4.5, warn: 4.5, invert: true })}
            customValue={4.5} customDate={undefined}
          />
        </CategoryCard>

        {/* ── Política Monetária ────────────────────────── */}
        <CategoryCard title="Política Monetária" href="/politica-monetaria" accentColor="var(--chart-2)">
          <MetricRow
            label="Taxa Selic (% ao ano)"
            kv={selic} unit="% a.a." deltaUnit=" pp"
            status="info"
          />
          <MetricRow
            label="Juro real ex-post (Selic − IPCA 12m)"
            customValue={juroReal.value}
            customDate={juroReal.date}
            kv={null} unit="%" deltaUnit=" pp"
            status={statusFor(juroReal.value, { ok: 4, warn: 1, invert: false })}
          />
        </CategoryCard>

        {/* ── Fiscal ────────────────────────────────────── */}
        <CategoryCard title="Fiscal" href="/fiscal" accentColor="var(--chart-4)">
          <MetricRow
            label="Dívida Líquida do Setor Público (% PIB)"
            kv={dlsp} unit="% PIB" deltaUnit=" pp" deltaInvert
            status={statusFor(dlspVal, { ok: 55, warn: 70, invert: true })}
          />
          <MetricRow
            label="Dívida Bruta do Governo Geral (% PIB)"
            kv={dbgg} unit="% PIB" deltaUnit=" pp" deltaInvert
            status={statusFor(dbggVal, { ok: 75, warn: 90, invert: true })}
          />
          <MetricRow
            label="Resultado primário sem desval. cambial (12m)"
            customValue={resultadoPrimario}
            customDate={primario12m?.latest.date}
            kv={null} unit="% PIB" deltaUnit=" pp"
            status={statusFor(resultadoPrimario, { ok: 0, warn: -0.25, invert: false })}
          />
        </CategoryCard>

        {/* ── Setor Externo ─────────────────────────────── */}
        <CategoryCard title="Setor Externo" href="/externo" accentColor="var(--chart-5)">
          <MetricRow
            label="USD/BRL — PTAX venda"
            kv={usdBrl} unit=" R$" deltaUnit=" R$" deltaInvert
            status="info"
          />
          <MetricRow
            label="EMBI+ Risco-Brasil (pontos-base)"
            kv={embi} unit=" bps" deltaUnit=" bps" deltaInvert
            status={statusFor(embiVal, { ok: 200, warn: 400, invert: true })}
          />
          <MetricRow
            label="Reservas internacionais (US$ bilhões)"
            kv={reservas} unit=" bi US$" decimals={0}
            customValue={reservas?.latest.value !== undefined ? (reservas!.latest.value / 1000) : null}
            customDate={reservas?.latest.date}
            status="info"
          />
        </CategoryCard>

        {/* ── Crédito ───────────────────────────────────── */}
        <CategoryCard title="Crédito" href="/credito" accentColor="hsl(280 65% 60%)">
          <MetricRow
            label="Taxa de inadimplência total (> 90 dias)"
            kv={inadim} unit="%" deltaUnit=" pp" deltaInvert
            status={statusFor(inadimVal, { ok: 3, warn: 5, invert: true })}
          />
          <MetricRow
            label="Spread médio das operações de crédito"
            kv={spread} unit=" p.p." deltaUnit=" p.p." deltaInvert
            status="info"
          />
        </CategoryCard>

      </div>

      {/* Rodapé */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Fontes: BCB SGS, IBGE, FGV · Atualização automática às 07:00 e 19:00 BRT
      </p>
    </div>
  )
}
