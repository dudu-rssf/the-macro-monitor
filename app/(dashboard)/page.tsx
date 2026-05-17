export const dynamic = 'force-dynamic'

import { getSeriesLatestTwo } from '@/db/queries'
import { OverviewDashboard } from './_components/overview-dashboard'

export default async function HomePage() {
  const [
    ibcBr12mKv,
    desempregoKv,
    rendimentoKv,
    ipca12mKv,
    selicKv,
    dlspKv,
    dbggKv,
    primarioKv,
    primarioSemDesvalKv,
    inadimKv,
    spreadKv,
    usdBrlKv,
    embiKv,
    reservasKv,
  ] = await Promise.all([
    getSeriesLatestTwo('22065'),   // IBC-Br variação acumulada 12m
    getSeriesLatestTwo('24369'),   // Desemprego PNAD %
    getSeriesLatestTwo('24380'),   // Rendimento médio real
    getSeriesLatestTwo('13522'),   // IPCA acumulado 12m
    getSeriesLatestTwo('1178'),    // Selic anualizada
    getSeriesLatestTwo('4513'),    // DLSP % PIB
    getSeriesLatestTwo('13762'),   // DBGG % PIB
    getSeriesLatestTwo('5793'),    // Primário setor público % PIB (mensal)
    getSeriesLatestTwo('5788'),    // Primário sem desval cambial % PIB (12m)
    getSeriesLatestTwo('21082'),   // Inadimplência total %
    getSeriesLatestTwo('20786'),   // Spread médio p.p.
    getSeriesLatestTwo('10813'),   // USD/BRL PTAX
    getSeriesLatestTwo('11752'),   // EMBI+
    getSeriesLatestTwo('3546'),    // Reservas internacionais US$ mi
  ])

  // Juro real ex-post: Selic − IPCA 12m
  const selicNow  = selicKv?.latest.value  ?? null
  const ipca12Now = ipca12mKv?.latest.value ?? null
  const juroReal  = selicNow !== null && ipca12Now !== null ? selicNow - ipca12Now : null
  const juroRealPrev = selicKv?.previous && ipca12mKv?.previous
    ? selicKv.previous.value - ipca12mKv.previous.value
    : null

  return (
    <OverviewDashboard
      data={{
        ibcBr12m:        ibcBr12mKv,
        desemprego:      desempregoKv,
        rendimento:      rendimentoKv,
        ipca12m:         ipca12mKv,
        selic:           selicKv,
        juroReal:        { value: juroReal, prev: juroRealPrev, date: selicKv?.latest.date },
        dlsp:            dlspKv,
        dbgg:            dbggKv,
        primario:        primarioKv,
        primario12m:     primarioSemDesvalKv,
        inadim:          inadimKv,
        spread:          spreadKv,
        usdBrl:          usdBrlKv,
        embi:            embiKv,
        reservas:        reservasKv,
      }}
    />
  )
}
