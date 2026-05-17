export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { ActivityDashboard } from './_components/activity-dashboard'
import type { SeriesPoint } from '@/components/macro/types'

const FROM = new Date('2001-01-01')

function yoyGrowth(pts: SeriesPoint[]): { date: string; value: number }[] {
  if (pts.length < 5) return []
  const sorted = [...pts].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.flatMap((p, i) => {
    if (i < 4) return []
    const prev = sorted[i - 4]
    return [{ date: p.date, value: parseFloat(((p.value / prev.value - 1) * 100).toFixed(2)) }]
  })
}

export default async function AtividadePage() {
  const [
    // KPIs
    ibcVarMKv, ibcVar12Kv, varejoKv, iccKv,
    // Visão Geral
    ibcSaH, ibcNsaH, ibcVarMH, ibcVar12H, pibNsaH, pibSaH, pibNomH,
    // VAB Setorial
    vabAgroH, vabIndH, vabServH,
    // Indústria
    pimTotalH, pimTransfH, pimCapH, pimIntermH, pimDurH, iciH,
    // Comércio
    varejoH, pmcCombH, pmcHiperH, pmcMovH, pmcFarmH, pmcInfoH, pmcVeicH, iccH,
    // Serviços
    icsH,
    // PIB Demanda
    pibConsH, pibGovH, pibFbcfH, pibExpH,
    // Condições Financeiras
    spreadPfH, spreadPjH,
  ] = await Promise.all([
    // KPIs
    getSeriesLatestTwo('22063'),
    getSeriesLatestTwo('22065'),
    getSeriesLatestTwo('1455'),
    getSeriesLatestTwo('22099'),
    // Visão Geral
    getSeriesHistoryFrom('24364', FROM),
    getSeriesHistoryFrom('24363', FROM),
    getSeriesHistoryFrom('22063', FROM),
    getSeriesHistoryFrom('22065', FROM),
    getSeriesHistoryFrom('22109', FROM),
    getSeriesHistoryFrom('22110', FROM),
    getSeriesHistoryFrom('4380',  FROM),
    // VAB Setorial
    getSeriesHistoryFrom('22103', FROM),
    getSeriesHistoryFrom('22096', FROM),
    getSeriesHistoryFrom('22097', FROM),
    // Indústria
    getSeriesHistoryFrom('21859', FROM),
    getSeriesHistoryFrom('21861', FROM),
    getSeriesHistoryFrom('21862', FROM),
    getSeriesHistoryFrom('21863', FROM),
    getSeriesHistoryFrom('21864', FROM),
    getSeriesHistoryFrom('22023', FROM),
    // Comércio
    getSeriesHistoryFrom('1455',  FROM),
    getSeriesHistoryFrom('1408',  FROM),
    getSeriesHistoryFrom('1409',  FROM),
    getSeriesHistoryFrom('1411',  FROM),
    getSeriesHistoryFrom('1412',  FROM),
    getSeriesHistoryFrom('1413',  FROM),
    getSeriesHistoryFrom('1416',  FROM),
    getSeriesHistoryFrom('22099', FROM),
    // Serviços
    getSeriesHistoryFrom('22021', FROM),
    // PIB Demanda
    getSeriesHistoryFrom('22113', FROM),
    getSeriesHistoryFrom('22114', FROM),
    getSeriesHistoryFrom('22111', FROM),
    getSeriesHistoryFrom('22115', FROM),
    // Condições Financeiras
    getSeriesHistoryFrom('20786', FROM),
    getSeriesHistoryFrom('20787', FROM),
  ])

  // Crescimento anual (YoY, %) trimestral
  const pibGrowth  = yoyGrowth(pibSaH?.data ?? [])
  const agroGrowth = yoyGrowth(vabAgroH?.data ?? [])
  const indGrowth  = yoyGrowth(vabIndH?.data ?? [])
  const servGrowth = yoyGrowth(vabServH?.data ?? [])

  return (
    <ActivityDashboard
      data={{
        ibcVarMKv, ibcVar12Kv, varejoKv, iccKv,
        ibcSa:     ibcSaH?.data    ?? [],
        ibcNsa:    ibcNsaH?.data   ?? [],
        ibcVarM:   ibcVarMH?.data  ?? [],
        ibcVar12:  ibcVar12H?.data ?? [],
        pibNsa:    pibNsaH?.data   ?? [],
        pibSa:     pibSaH?.data    ?? [],
        pibNom:    pibNomH?.data   ?? [],
        pibGrowth,
        vabAgro:       vabAgroH?.data ?? [],
        vabInd:        vabIndH?.data  ?? [],
        vabServ:       vabServH?.data ?? [],
        agroGrowth,
        indGrowth,
        servGrowth,
        pimTotal:  pimTotalH?.data  ?? [],
        pimTransf: pimTransfH?.data ?? [],
        pimCap:    pimCapH?.data    ?? [],
        pimInterm: pimIntermH?.data ?? [],
        pimDur:    pimDurH?.data    ?? [],
        ici:       iciH?.data       ?? [],
        varejo:    varejoH?.data    ?? [],
        pmcComb:   pmcCombH?.data   ?? [],
        pmcHiper:  pmcHiperH?.data  ?? [],
        pmcMov:    pmcMovH?.data    ?? [],
        pmcFarm:   pmcFarmH?.data   ?? [],
        pmcInfo:   pmcInfoH?.data   ?? [],
        pmcVeic:   pmcVeicH?.data   ?? [],
        icc:       iccH?.data       ?? [],
        ics:       icsH?.data       ?? [],
        pibCons:   pibConsH?.data   ?? [],
        pibGov:    pibGovH?.data    ?? [],
        pibFbcf:   pibFbcfH?.data   ?? [],
        pibExp:    pibExpH?.data    ?? [],
        spreadPf:  spreadPfH?.data  ?? [],
        spreadPj:  spreadPjH?.data  ?? [],
      }}
    />
  )
}
