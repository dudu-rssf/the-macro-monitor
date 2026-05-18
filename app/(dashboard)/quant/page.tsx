export const dynamic = 'force-dynamic'

import { getSeriesHistory, getSeriesHistoryFrom, getSeriesMonthly } from '@/db/queries'
import { hpTrend } from '@/lib/hp-filter'
import { QuantDashboard } from './_components/quant-dashboard'

const FROM_2001 = new Date('2001-01-01')

function sort<T extends { date: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.date.localeCompare(b.date))
}

function makeMap(pts: { date: string; value: number }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of pts) m.set(p.date.slice(0, 7), p.value)
  return m
}

function zScoreArr(vals: number[]): number[] {
  const n = vals.length
  if (n === 0) return []
  const mean = vals.reduce((a, b) => a + b, 0) / n
  const std  = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  return std === 0 ? vals.map(() => 0) : vals.map(v => parseFloat(((v - mean) / std).toFixed(3)))
}

function rollingCorrPair(
  dates: string[],
  a: (number | null)[],
  b: (number | null)[],
  win: number,
): (number | null)[] {
  return dates.map((_, i) => {
    if (i < win - 1) return null
    const xs: number[] = [], ys: number[] = []
    for (let j = i - win + 1; j <= i; j++) {
      if (a[j] != null && b[j] != null) { xs.push(a[j]!); ys.push(b[j]!) }
    }
    if (xs.length < win * 0.75) return null
    const mx = xs.reduce((s, v) => s + v, 0) / xs.length
    const my = ys.reduce((s, v) => s + v, 0) / ys.length
    const num = xs.reduce((s, v, k) => s + (v - mx) * (ys[k] - my), 0)
    const dx  = Math.sqrt(xs.reduce((s, v) => s + (v - mx) ** 2, 0))
    const dy  = Math.sqrt(ys.reduce((s, v) => s + (v - my) ** 2, 0))
    return dx === 0 || dy === 0 ? null : parseFloat((num / (dx * dy)).toFixed(3))
  })
}

async function fetchFocusSurprise(
  actuals: { date: string; value: number }[],
): Promise<{ date: string; actual: number; expected: number; surprise: number }[]> {
  try {
    const p = new URLSearchParams({
      '$format':  'json',
      '$top':     '2000',
      '$select':  'DataReferencia,Mediana,Data',
      '$filter':  "Indicador eq 'IPCA' and baseCalculo eq 0",
      '$orderby': 'DataReferencia desc,Data desc',
    })
    const res = await fetch(
      `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais?${p}`,
      { signal: AbortSignal.timeout(15_000), next: { revalidate: 900 } },
    )
    if (!res.ok) return []
    const json = await res.json()
    const rows: { DataReferencia: string; Mediana: number; Data: string }[] = json.value ?? []

    const byRef = new Map<string, number>()
    for (const row of rows) {
      const [mm, yyyy] = row.DataReferencia.split('/')
      const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).toISOString().slice(0, 10)
      if (row.Data <= lastDay) {
        const key = `${yyyy}-${mm.padStart(2, '0')}`
        if (!byRef.has(key)) byRef.set(key, row.Mediana)
      }
    }

    return actuals.flatMap(pt => {
      const key      = pt.date.slice(0, 7)
      const expected = byRef.get(key)
      if (expected == null) return []
      return [{ date: key, actual: pt.value, expected, surprise: parseFloat((pt.value - expected).toFixed(2)) }]
    })
  } catch {
    return []
  }
}

export default async function QuantPage() {
  const [
    ibcSaH, ipca12H, selicPts, embiPts, usdPts, spreadPfPts,
    dlspH, primH, ibcBr12H, desempH, ipcaMH,
  ] = await Promise.all([
    getSeriesHistoryFrom('24364', FROM_2001),  // IBC-Br SA (long history for HP)
    getSeriesHistory('13522', 72),             // IPCA 12m (monthly series)
    getSeriesMonthly('1178',  FROM_2001),      // Selic: daily→monthly, one per month, no dupes
    getSeriesMonthly('11752', FROM_2001),      // EMBI+: daily→monthly, long history for correlations
    getSeriesMonthly('10813', FROM_2001),      // USD/BRL: daily→monthly, long history for correlations
    getSeriesMonthly('20786', FROM_2001),      // Spread PF: daily→monthly for FCI
    getSeriesHistory('4513',  72),             // DLSP % PIB (monthly)
    getSeriesHistory('5788',  72),             // Primário % PIB (monthly)
    getSeriesHistory('22065', 72),             // IBC-Br 12m (monthly)
    getSeriesHistory('24369', 72),             // Desemprego (monthly)
    getSeriesHistory('433',   36),             // IPCA mensal (Focus surprise)
  ])

  // ── 1. HIATO DO PRODUTO ──────────────────────────────────────────────
  const ibcSaPts  = sort(ibcSaH?.data ?? [])
  const ibcVals   = ibcSaPts.map(p => p.value)
  const trend     = hpTrend(ibcVals, 14400)   // λ=14400 for monthly
  const hiatoData = ibcSaPts.map((p, i) => ({
    date:   p.date.slice(0, 7),
    actual: p.value,
    trend:  parseFloat(trend[i].toFixed(2)),
    gap:    parseFloat(((p.value / trend[i] - 1) * 100).toFixed(2)),
  })).slice(-72)

  // ── 2. REGRA DE TAYLOR ───────────────────────────────────────────────
  // i* = r* + π + 1.5*(π − π*) + 0.5*gap
  const R_STAR     = 4.5   // BCB neutral real rate estimate
  const PI_TARGET  = 3.0   // BCB meta 2025
  const ALPHA      = 1.5
  const BETA       = 0.5

  // selicPts from getSeriesMonthly: one observation per month, no duplicates
  const sortedSelicPts = sort(selicPts)
  const ipca12Pts      = sort(ipca12H?.data ?? [])
  const gapMap         = new Map(hiatoData.map(p => [p.date, p.gap]))
  const ipca12Map      = makeMap(ipca12Pts)
  const selicMap       = makeMap(sortedSelicPts)

  const taylorData = sortedSelicPts.map(pt => {
    const d    = pt.date.slice(0, 7)
    const ipca = ipca12Map.get(d)
    if (ipca == null) return null
    const gap    = gapMap.get(d) ?? 0
    const taylor = R_STAR + ipca + ALPHA * (ipca - PI_TARGET) + BETA * gap
    return {
      date:      d,
      selic:     pt.value,
      taylor:    parseFloat(taylor.toFixed(2)),
      infGap:    parseFloat((ipca - PI_TARGET).toFixed(2)),
      outputGap: parseFloat(gap.toFixed(2)),
    }
  }).filter((p): p is NonNullable<typeof p> => p !== null).slice(-60)

  // ── 3. SURPRESA FOCUS ───────────────────────────────────────────────
  const ipcaMPts     = sort(ipcaMH?.data ?? [])
  const surpriseData = await fetchFocusSurprise(ipcaMPts)

  // ── 4. DECOMPOSIÇÃO DA DÍVIDA ───────────────────────────────────────
  const dlspPts  = sort(dlspH?.data ?? [])
  const primPts  = sort(primH?.data ?? [])
  const primMap  = makeMap(primPts)
  const ibcMap   = makeMap(sort(ibcBr12H?.data ?? []))

  const debtData = dlspPts.slice(1).map((pt, i) => {
    const d       = pt.date.slice(0, 7)
    const dNow    = pt.value
    const dPrev   = dlspPts[i].value
    const r       = selicMap.get(d)
    const gReal   = ibcMap.get(d)
    const pi      = ipca12Map.get(d)
    const s       = primMap.get(d)
    if (r == null || gReal == null || pi == null || s == null) return null

    const gNom            = gReal + pi
    const interestContrib = parseFloat(((r / 100 / 12) * dPrev).toFixed(3))
    const growthContrib   = parseFloat((-(gNom / 100 / 12) * dPrev).toFixed(3))
    const primaryContrib  = parseFloat((-s / 12).toFixed(3))
    const total           = parseFloat((dNow - dPrev).toFixed(3))
    const residual        = parseFloat((total - interestContrib - growthContrib - primaryContrib).toFixed(3))
    return { date: d, dlsp: dNow, delta: total, interestContrib, growthContrib, primaryContrib, residual }
  }).filter((p): p is NonNullable<typeof p> => p !== null).slice(-48)

  // ── 5. CORRELAÇÕES ROLANTES (24m window) ────────────────────────────
  const embiMap   = makeMap(sort(embiPts))
  const usdMap    = makeMap(sort(usdPts))
  const desempMap = makeMap(sort(desempH?.data ?? []))

  const CORR_WIN = 24
  const corrBase  = ipca12Pts.map(p => p.date.slice(0, 7))
  const cIPCA     = ipca12Pts.map(p => p.value)
  const cSelic    = corrBase.map(d => selicMap.get(d) ?? null)
  const cEMBI     = corrBase.map(d => embiMap.get(d)  ?? null)
  const cUSD      = corrBase.map(d => usdMap.get(d)   ?? null)
  const cIBC      = corrBase.map(d => ibcMap.get(d)   ?? null)
  const cUnemp    = corrBase.map(d => desempMap.get(d) ?? null)

  const corrSelicIPCA = rollingCorrPair(corrBase, cSelic, cIPCA,  CORR_WIN)
  const corrEMBIUSD   = rollingCorrPair(corrBase, cEMBI,  cUSD,   CORR_WIN)
  const corrIBCUnemp  = rollingCorrPair(corrBase, cIBC,   cUnemp, CORR_WIN)

  const corrData = corrBase.map((date, i) => ({
    date,
    selicIpca: corrSelicIPCA[i],
    embiUsd:   corrEMBIUSD[i],
    ibcUnemp:  corrIBCUnemp[i],
  })).filter(p => p.selicIpca != null || p.embiUsd != null || p.ibcUnemp != null).slice(-48)

  // ── 6. FCI ──────────────────────────────────────────────────────────
  // Weights: Selic 30%, Spread PF 25%, USD/BRL 25%, EMBI 20%
  const spreadMap = makeMap(sort(spreadPfPts))
  const fciDates  = corrBase
  const fciSelic  = fciDates.map(d => selicMap.get(d)  ?? null)
  const fciSpread = fciDates.map(d => spreadMap.get(d) ?? null)
  const fciUSD    = cUSD
  const fciEMBI   = cEMBI

  const fciComplete = fciDates.map((date, i) => {
    const s = fciSelic[i], sp = fciSpread[i], u = fciUSD[i], e = fciEMBI[i]
    if (s == null || sp == null || u == null || e == null) return null
    return { date, s, sp, u, e }
  }).filter((p): p is NonNullable<typeof p> => p !== null)

  const zS  = zScoreArr(fciComplete.map(p => p.s))
  const zSp = zScoreArr(fciComplete.map(p => p.sp))
  const zU  = zScoreArr(fciComplete.map(p => p.u))
  const zE  = zScoreArr(fciComplete.map(p => p.e))

  const fciData = fciComplete.map((p, i) => ({
    date:    p.date,
    fci:     parseFloat((0.30 * zS[i] + 0.25 * zSp[i] + 0.25 * zU[i] + 0.20 * zE[i]).toFixed(3)),
    selicZ:  zS[i],
    spreadZ: zSp[i],
    usdZ:    zU[i],
    embiZ:   zE[i],
  })).slice(-48)

  return (
    <QuantDashboard
      data={{ hiatoData, taylorData, surpriseData, debtData, corrData, fciData }}
    />
  )
}
