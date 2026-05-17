export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { InflationDashboard } from './_components/inflation-dashboard'

const BCB_META_CENTRAL = 3.0
const BCB_META_TETO    = 4.5

// 10+ anos para todos os graficos
const FROM = new Date('2015-01-01')

export default async function InflacaoPage() {
  const [
    ipcaKv, ipca12mKv, nucleoMsKv, igpmKv,
    ipcaH, ipca15H, ipca12mH,
    nucleoMsH, nucleoMaH, nucleoExH, nucleoDpH, nucleoP55H,
    difusaoH,
    igpmH, igpdiH, ipamH, ipcmH, inccmH, inpcH,
    icbrGeralH, icbrAgroH, icbrMetalH, icbrEnergiaH,
  ] = await Promise.all([
    getSeriesLatestTwo('433'),    // IPCA kv
    getSeriesLatestTwo('13522'),  // IPCA 12m kv
    getSeriesLatestTwo('16121'),  // Nucleo MS kv
    getSeriesLatestTwo('188'),    // IGP-M kv
    getSeriesHistoryFrom('433',   FROM),   // IPCA
    getSeriesHistoryFrom('4449',  FROM),   // IPCA-15
    getSeriesHistoryFrom('13522', FROM),   // IPCA 12m
    getSeriesHistoryFrom('16121', FROM),   // Nucleo MS
    getSeriesHistoryFrom('27838', FROM),   // Nucleo MA
    getSeriesHistoryFrom('27839', FROM),   // Nucleo EX
    getSeriesHistoryFrom('11427', FROM),   // Nucleo DP
    getSeriesHistoryFrom('28750', FROM),   // Nucleo P55
    getSeriesHistoryFrom('11428', FROM),   // Difusao
    getSeriesHistoryFrom('188',   FROM),   // IGP-M
    getSeriesHistoryFrom('189',   FROM),   // IGP-DI
    getSeriesHistoryFrom('225',   FROM),   // IPA-M
    getSeriesHistoryFrom('191',   FROM),   // IPC-M
    getSeriesHistoryFrom('192',   FROM),   // INCC-M
    getSeriesHistoryFrom('4466',  FROM),   // INPC
    getSeriesHistoryFrom('27574', FROM),   // IC-Br Geral
    getSeriesHistoryFrom('27575', FROM),   // IC-Br Agro
    getSeriesHistoryFrom('27576', FROM),   // IC-Br Metal
    getSeriesHistoryFrom('27577', FROM),   // IC-Br Energia
  ])

  return (
    <InflationDashboard
      metaCentral={BCB_META_CENTRAL}
      metaTeto={BCB_META_TETO}
      data={{
        ipcaKv,
        ipca12mKv,
        nucleoMsKv,
        igpmKv,
        ipca:      ipcaH?.data   ?? [],
        ipca15:    ipca15H?.data  ?? [],
        ipca12m:   ipca12mH?.data ?? [],
        nucleoMs:  nucleoMsH?.data  ?? [],
        nucleoMa:  nucleoMaH?.data  ?? [],
        nucleoEx:  nucleoExH?.data  ?? [],
        nucleoDp:  nucleoDpH?.data  ?? [],
        nucleoP55: nucleoP55H?.data ?? [],
        difusao:   difusaoH?.data   ?? [],
        igpm:      igpmH?.data   ?? [],
        igpdi:     igpdiH?.data  ?? [],
        ipam:      ipamH?.data   ?? [],
        ipcm:      ipcmH?.data   ?? [],
        inccm:     inccmH?.data  ?? [],
        inpc:        inpcH?.data        ?? [],
        icbrGeral:   icbrGeralH?.data   ?? [],
        icbrAgro:    icbrAgroH?.data    ?? [],
        icbrMetal:   icbrMetalH?.data   ?? [],
        icbrEnergia: icbrEnergiaH?.data ?? [],
      }}
    />
  )
}
