export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo } from '@/db/queries'
import { CreditDashboard } from './_components/credit-dashboard'

const FROM = new Date('2003-01-01')

export default async function CreditoPage() {
  const [
    totalKv, inadimKv, spreadKv, compRendaKv,
    totalH, pfH, pjH,
    inadimTotalH, inadimPfH, inadimPjH,
    spreadH, spreadPfH,
    compRendaH,
    taxaTotalH, taxaPfH,
    endividamentoH,
  ] = await Promise.all([
    getSeriesLatestTwo('20631'),
    getSeriesLatestTwo('21082'),
    getSeriesLatestTwo('20786'),
    getSeriesLatestTwo('19882'),
    getSeriesHistoryFrom('20631', FROM),   // Saldo total R$ mi
    getSeriesHistoryFrom('20622', FROM),   // Saldo PF R$ mi
    getSeriesHistoryFrom('20623', FROM),   // Saldo PJ R$ mi
    getSeriesHistoryFrom('21082', FROM),   // Inadimplência total %
    getSeriesHistoryFrom('21084', FROM),   // Inadimplência PF %
    getSeriesHistoryFrom('21086', FROM),   // Inadimplência PJ %
    getSeriesHistoryFrom('20786', FROM),   // Spread total p.p.
    getSeriesHistoryFrom('20787', FROM),   // Spread PF p.p.
    getSeriesHistoryFrom('19882', FROM),   // Comprometimento de renda %
    getSeriesHistoryFrom('20714', FROM),   // Taxa de juros total % a.a.
    getSeriesHistoryFrom('20751', FROM),   // Taxa de juros PF % a.a.
    getSeriesHistoryFrom('29037', FROM),   // Endividamento famílias % renda bruta
  ])

  return (
    <CreditDashboard
      data={{
        totalKv, inadimKv, spreadKv, compRendaKv,
        total:        totalH?.data        ?? [],
        pf:           pfH?.data           ?? [],
        pj:           pjH?.data           ?? [],
        inadimTotal:  inadimTotalH?.data  ?? [],
        inadimPf:     inadimPfH?.data     ?? [],
        inadimPj:     inadimPjH?.data     ?? [],
        spread:       spreadH?.data       ?? [],
        spreadPf:     spreadPfH?.data     ?? [],
        compRenda:    compRendaH?.data    ?? [],
        taxaTotal:    taxaTotalH?.data    ?? [],
        taxaPf:       taxaPfH?.data       ?? [],
        endividamento: endividamentoH?.data ?? [],
      }}
    />
  )
}
