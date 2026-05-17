import { NextResponse } from 'next/server'
import { getSeriesLatestTwo } from '@/db/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try { return await p } catch { return null }
}

export async function GET() {
  const [
    ibcBr12m, desemprego, rendimento, ipca12m, selic,
    dlsp, dbgg, primario, primario12m,
    inadim, spread, usdBrl, embi, reservas,
  ] = await Promise.all([
    safe(getSeriesLatestTwo('22065')),
    safe(getSeriesLatestTwo('24369')),
    safe(getSeriesLatestTwo('24380')),
    safe(getSeriesLatestTwo('13522')),
    safe(getSeriesLatestTwo('1178')),
    safe(getSeriesLatestTwo('4513')),
    safe(getSeriesLatestTwo('13762')),
    safe(getSeriesLatestTwo('5793')),
    safe(getSeriesLatestTwo('5788')),
    safe(getSeriesLatestTwo('21082')),
    safe(getSeriesLatestTwo('20786')),
    safe(getSeriesLatestTwo('10813')),
    safe(getSeriesLatestTwo('11752')),
    safe(getSeriesLatestTwo('3546')),
  ])

  const selicNow  = selic?.latest.value  ?? null
  const ipca12Now = ipca12m?.latest.value ?? null
  const juroReal  = selicNow !== null && ipca12Now !== null ? selicNow - ipca12Now : null
  const juroRealPrev = selic?.previous && ipca12m?.previous
    ? selic.previous.value - ipca12m.previous.value : null

  return NextResponse.json({
    ibcBr12m, desemprego, rendimento, ipca12m, selic,
    juroReal: { value: juroReal, prev: juroRealPrev, date: selic?.latest.date ?? null },
    dlsp, dbgg, primario, primario12m,
    inadim, spread, usdBrl, embi, reservas,
  })
}
