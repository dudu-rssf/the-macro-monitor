export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { ActivityDashboard } from './_components/activity-dashboard'

const FROM = new Date('2001-01-01')

export default async function AtividadePage() {
  const [
    // KPIs
    ibcVarMKv, ibcVar12Kv, varejoKv, iccKv,
    // Visão Geral
    ibcSaH, ibcNsaH, ibcVarMH, ibcVar12H, pibNsaH, pibSaH, pibNomH,
    // Indústria
    pimTotalH, pimTransfH, pimCapH, pimIntermH, pimDurH, iciH,
    // Comércio
    varejoH, pmcCombH, pmcHiperH, pmcMovH, pmcFarmH, pmcInfoH, pmcVeicH, iccH,
    // Serviços
    icsH,
    // PIB Demanda
    pibConsH, pibExpH,
  ] = await Promise.all([
    // KPIs
    getSeriesLatestTwo('22063'),   // IBC-Br var% mensal
    getSeriesLatestTwo('22065'),   // IBC-Br var% 12m
    getSeriesLatestTwo('1455'),    // Varejo Ampliado
    getSeriesLatestTwo('22099'),   // ICC consumidor
    // Visão Geral
    getSeriesHistoryFrom('24364', FROM),  // IBC-Br c/ ajuste saz.
    getSeriesHistoryFrom('24363', FROM),  // IBC-Br s/ ajuste saz.
    getSeriesHistoryFrom('22063', FROM),  // IBC-Br var% mensal
    getSeriesHistoryFrom('22065', FROM),  // IBC-Br var% 12m
    getSeriesHistoryFrom('22109', FROM),  // PIB encadeado s/ aj. saz.
    getSeriesHistoryFrom('22110', FROM),  // PIB encadeado c/ aj. saz.
    getSeriesHistoryFrom('4380',  FROM),  // PIB nominal 12m (R$ mi)
    // Indústria
    getSeriesHistoryFrom('21859', FROM),  // PIM total
    getSeriesHistoryFrom('21861', FROM),  // PIM Transformação
    getSeriesHistoryFrom('21862', FROM),  // PIM Bens de Capital
    getSeriesHistoryFrom('21863', FROM),  // PIM Bens Intermediários
    getSeriesHistoryFrom('21864', FROM),  // PIM Bens de Consumo Duráveis
    getSeriesHistoryFrom('22023', FROM),  // ICI confiança indústria
    // Comércio
    getSeriesHistoryFrom('1455',  FROM),  // Varejo Ampliado
    getSeriesHistoryFrom('1408',  FROM),  // PMC Combustíveis
    getSeriesHistoryFrom('1409',  FROM),  // PMC Hipermercados/Alimentos
    getSeriesHistoryFrom('1411',  FROM),  // PMC Móveis e Eletro
    getSeriesHistoryFrom('1412',  FROM),  // PMC Farmácia e Perfumaria
    getSeriesHistoryFrom('1413',  FROM),  // PMC Informática e Comunicação
    getSeriesHistoryFrom('1416',  FROM),  // PMC Veículos e Peças
    getSeriesHistoryFrom('22099', FROM),  // ICC consumidor
    // Serviços
    getSeriesHistoryFrom('22021', FROM),  // ICS confiança serviços
    // PIB Demanda
    getSeriesHistoryFrom('22113', FROM),  // PIB Consumo das Famílias
    getSeriesHistoryFrom('22115', FROM),  // PIB Exportações
  ])

  return (
    <ActivityDashboard
      data={{
        ibcVarMKv,  ibcVar12Kv, varejoKv, iccKv,
        ibcSa:     ibcSaH?.data    ?? [],
        ibcNsa:    ibcNsaH?.data   ?? [],
        ibcVarM:   ibcVarMH?.data  ?? [],
        ibcVar12:  ibcVar12H?.data ?? [],
        pibNsa:    pibNsaH?.data   ?? [],
        pibSa:     pibSaH?.data    ?? [],
        pibNom:    pibNomH?.data   ?? [],
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
        pibExp:    pibExpH?.data    ?? [],
      }}
    />
  )
}
