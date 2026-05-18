export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo, getSeriesMonthly } from '@/db/queries'
import { ExternalDashboard } from './_components/external-dashboard'

const FROM      = new Date('2003-01-01')
const FROM_2015 = new Date('2015-01-01')

export default async function ExternoPage() {
  const [
    balancaKv, reservasKv, embiKv, usdBrlKv,
    balancaH, servicosH, rendaPrimH, rendaSecH, transCorrH, contaFinH,
    reservasH, embiH,
    usdBrlH, eurBrlH,
    reerH,
  ] = await Promise.all([
    getSeriesLatestTwo('22701'),
    getSeriesLatestTwo('3546'),
    getSeriesLatestTwo('11752'),
    getSeriesLatestTwo('10813'),
    getSeriesHistoryFrom('22701', FROM),   // Saldo Comercial
    getSeriesHistoryFrom('22702', FROM),   // Serviços
    getSeriesHistoryFrom('22703', FROM),   // Renda Primária
    getSeriesHistoryFrom('22704', FROM),   // Renda Secundária
    getSeriesHistoryFrom('22707', FROM),   // Transações Correntes
    getSeriesHistoryFrom('22706', FROM),   // Conta Financeira
    getSeriesMonthly('3546',  FROM),       // Reservas Internacionais
    getSeriesMonthly('11752', FROM_2015),  // EMBI+
    getSeriesMonthly('10813', FROM_2015),  // USD/BRL PTAX
    getSeriesMonthly('21620', FROM_2015),  // EUR/BRL PTAX
    getSeriesHistoryFrom('11753', FROM),   // REER IPCA
  ])

  return (
    <ExternalDashboard
      data={{
        balancaKv,
        reservasKv,
        embiKv,
        usdBrlKv,
        balanca:      balancaH?.data    ?? [],
        servicos:     servicosH?.data   ?? [],
        rendaPrim:    rendaPrimH?.data  ?? [],
        rendaSec:     rendaSecH?.data   ?? [],
        transCorr:    transCorrH?.data  ?? [],
        contaFin:     contaFinH?.data   ?? [],
        reservas:     reservasH,
        embi:         embiH,
        usdBrl:       usdBrlH,
        eurBrl:       eurBrlH,
        reer:         reerH?.data       ?? [],
      }}
    />
  )
}
