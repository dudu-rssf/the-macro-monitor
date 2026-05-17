export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { LaborDashboard } from './_components/labor-dashboard'
import { TabAiSummary } from '@/components/macro/tab-ai-summary'
import type { SeriesPoint } from '@/components/macro/types'

const FROM      = new Date('2012-01-01')
const FROM_CAGED = new Date('2020-01-01')

function yoyGrowth(pts: SeriesPoint[]): { date: string; value: number }[] {
  const sorted = [...pts].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.flatMap((p, i) => {
    if (i < 12) return []
    const prev = sorted[i - 12]
    return [{ date: p.date, value: parseFloat(((p.value / prev.value - 1) * 100).toFixed(2)) }]
  })
}

function computeParticipacao(pea: SeriesPoint[], pia: SeriesPoint[]): { date: string; value: number }[] {
  const piaMap = new Map(pia.map((p) => [p.date, p.value]))
  return pea
    .filter((p) => piaMap.has(p.date))
    .map((p) => ({ date: p.date, value: parseFloat(((p.value / piaMap.get(p.date)!) * 100).toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function computeCagedSaldo(adm: SeriesPoint[], deslig: SeriesPoint[]): { date: string; value: number }[] {
  const desMap = new Map(deslig.map((p) => [p.date, p.value]))
  return adm
    .filter((p) => desMap.has(p.date))
    .map((p) => ({ date: p.date, value: p.value - desMap.get(p.date)! }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function rollingSum12m(pts: { date: string; value: number }[]): { date: string; value: number }[] {
  const sorted = [...pts].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.flatMap((_, i) => {
    if (i < 11) return []
    const sum = sorted.slice(i - 11, i + 1).reduce((acc, p) => acc + p.value, 0)
    return [{ date: sorted[i].date, value: Math.round(sum) }]
  })
}

export default async function TrabalhoPage() {
  const [
    desempregoKv, rendimentoKv, massaKv,
    desempregoH, rendimentoH, massaH,
    piaH, peaH,
    admH, desligH,
    empAgroH, empIndH, empConstrH, empComH, empServH,
  ] = await Promise.all([
    getSeriesLatestTwo('24369'),
    getSeriesLatestTwo('24380'),
    getSeriesLatestTwo('28763'),
    getSeriesHistoryFrom('24369', FROM),
    getSeriesHistoryFrom('24380', FROM),
    getSeriesHistoryFrom('28763', FROM),
    getSeriesHistoryFrom('24370', FROM),
    getSeriesHistoryFrom('24378', FROM),
    getSeriesHistoryFrom('28544', FROM_CAGED),
    getSeriesHistoryFrom('28545', FROM_CAGED),
    getSeriesHistoryFrom('28554', FROM),
    getSeriesHistoryFrom('28555', FROM),
    getSeriesHistoryFrom('28546', FROM),
    getSeriesHistoryFrom('28558', FROM),
    getSeriesHistoryFrom('28559', FROM),
  ])

  const taxaParticipacao = computeParticipacao(peaH?.data ?? [], piaH?.data ?? [])
  const cagedSaldo       = computeCagedSaldo(admH?.data ?? [], desligH?.data ?? [])
  const cagedAcum12m     = rollingSum12m(cagedSaldo)
  const rendimentoYoY    = yoyGrowth(rendimentoH?.data ?? [])

  // KPI: última leitura CAGED saldo
  const cagedLatest = cagedSaldo.at(-1)?.value ?? null
  const cagedPrev   = cagedSaldo.at(-2)?.value ?? null
  const participKv  = {
    latest:   { date: taxaParticipacao.at(-1)?.date ?? '', value: taxaParticipacao.at(-1)?.value ?? 0 },
    previous: taxaParticipacao.at(-2) ? { date: taxaParticipacao.at(-2)!.date, value: taxaParticipacao.at(-2)!.value } : null,
  }

  return (
    <>
    <LaborDashboard
      data={{
        desempregoKv,
        rendimentoKv,
        massaKv,
        cagedLatest,
        cagedPrev,
        participKv,
        desemprego:       desempregoH?.data    ?? [],
        rendimento:       rendimentoH?.data    ?? [],
        massaSalarial:    massaH?.data         ?? [],
        taxaParticipacao,
        rendimentoYoY,
        cagedSaldo,
        cagedAcum12m,
        empAgro:   empAgroH?.data   ?? [],
        empInd:    empIndH?.data    ?? [],
        empConstr: empConstrH?.data ?? [],
        empCom:    empComH?.data    ?? [],
        empServ:   empServH?.data   ?? [],
      }}
    />
    <TabAiSummary tab="trabalho" />
  </>
  )
}
