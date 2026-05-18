export const dynamic = 'force-dynamic'

import { getSeriesHistoryFrom, getSeriesLatestTwo, getSeriesMonthly } from '@/db/queries'
import { fetchFocusAnual } from '@/lib/sources/bcb-focus'
import { fetchEttj } from '@/lib/sources/anbima-ettj'
import { MonetaryDashboard } from './_components/monetary-dashboard'
import type { SeriesPoint } from '@/components/macro/types'

const FROM      = new Date('2015-01-01')
const FROM_LONG = new Date('2001-01-01')   // para ciclos COPOM e agregados (BMA desde 2001)

// ────────────────────────────────────────────────────────────────────────────
// Alinha duas séries mensais por data e computa a diferença (a - b)
function computeDiff(
  a: SeriesPoint[],
  b: SeriesPoint[]
): SeriesPoint[] {
  const bMap = new Map(b.map((p) => [p.date, p.value]))
  return a
    .filter((p) => bMap.has(p.date))
    .map((p) => ({ date: p.date, value: p.value - bMap.get(p.date)! }))
}

// Pega a mediana mais recente de cada ano de referência (Focus)
function latestByYear(
  rows: { referencePeriod: string; date: Date; median: number | null }[]
) {
  const map = new Map<string, { date: Date; median: number | null }>()
  for (const r of rows) {
    const existing = map.get(r.referencePeriod)
    if (!existing || r.date > existing.date) {
      map.set(r.referencePeriod, { date: r.date, median: r.median })
    }
  }
  return Array.from(map.entries())
    .map(([year, v]) => ({ year, median: v.median }))
    .sort((a, b) => a.year.localeCompare(b.year))
}

// ────────────────────────────────────────────────────────────────────────────
// Detecta ciclos COPOM a partir do histórico mensal da Selic
export interface CopomCycle {
  direction: 'hike' | 'cut'
  startDate: string
  endDate:   string
  startRate: number
  endRate:   number
  bps:       number          // positivo = alta, negativo = corte
  months:    number
  moves:     number          // quantas vezes a taxa mudou no ciclo
}

function detectCopomCycles(selic: SeriesPoint[]): CopomCycle[] {
  if (selic.length < 3) return []

  const cycles: CopomCycle[] = []

  // Encontra só os meses onde a taxa mudou (reunião com decisão)
  const changes: SeriesPoint[] = []
  for (let i = 1; i < selic.length; i++) {
    if (Math.abs(selic[i].value - selic[i - 1].value) > 0.01) {
      changes.push(selic[i])
    }
  }

  if (changes.length === 0) return []

  let cycleStart = selic[0]
  let prevRate   = selic[0].value
  let direction: 'hike' | 'cut' | null = null
  let moves = 0

  for (const point of changes) {
    const delta = point.value - prevRate
    const thisDir: 'hike' | 'cut' = delta > 0 ? 'hike' : 'cut'

    if (direction === null) {
      direction = thisDir
      cycleStart = { date: point.date, value: prevRate }
      moves = 1
    } else if (thisDir === direction) {
      moves++
    } else {
      // Mudança de direção — fecha o ciclo anterior
      const bps = Math.round((prevRate - cycleStart.value) * 100)
      if (Math.abs(bps) >= 25 && moves >= 2) {
        const startMonth = new Date(cycleStart.date)
        const endMonth   = new Date(point.date)
        const monthDiff  = (endMonth.getFullYear() - startMonth.getFullYear()) * 12
          + (endMonth.getMonth() - startMonth.getMonth())
        cycles.push({
          direction: bps > 0 ? 'hike' : 'cut',
          startDate: cycleStart.date,
          endDate:   point.date,
          startRate: cycleStart.value,
          endRate:   prevRate,
          bps:       Math.abs(bps),
          months:    monthDiff,
          moves,
        })
      }
      direction  = thisDir
      cycleStart = { date: point.date, value: prevRate }
      moves = 1
    }
    prevRate = point.value
  }

  // Fecha o último ciclo (se ainda em andamento)
  if (direction !== null && moves >= 2) {
    const bps = Math.round((prevRate - cycleStart.value) * 100)
    if (Math.abs(bps) >= 25) {
      const startMonth = new Date(cycleStart.date)
      const endMonth   = new Date(selic[selic.length - 1].date)
      const monthDiff  = (endMonth.getFullYear() - startMonth.getFullYear()) * 12
        + (endMonth.getMonth() - startMonth.getMonth())
      cycles.push({
        direction: bps > 0 ? 'hike' : 'cut',
        startDate: cycleStart.date,
        endDate:   selic[selic.length - 1].date,
        startRate: cycleStart.value,
        endRate:   prevRate,
        bps:       Math.abs(bps),
        months:    monthDiff,
        moves,
      })
    }
  }

  return cycles
}

// ────────────────────────────────────────────────────────────────────────────
// Metas de inflação BCB (1999-2026) — dados oficiais
// { year, center, lower, upper, realized | null }
export const INFLATION_TARGETS = [
  { year: 1999, center: 8.00, lower: 6.00, upper: 10.00, realized: 8.94  },
  { year: 2000, center: 6.00, lower: 4.00, upper:  8.00, realized: 5.97  },
  { year: 2001, center: 4.00, lower: 2.00, upper:  6.00, realized: 7.67  },
  { year: 2002, center: 3.50, lower: 1.50, upper:  5.50, realized: 12.53 },
  { year: 2003, center: 8.50, lower: 6.50, upper: 11.00, realized: 9.30  },  // meta ajustada
  { year: 2004, center: 5.50, lower: 3.00, upper:  8.00, realized: 7.60  },
  { year: 2005, center: 4.50, lower: 2.00, upper:  7.00, realized: 5.69  },
  { year: 2006, center: 4.50, lower: 2.50, upper:  6.50, realized: 3.14  },
  { year: 2007, center: 4.50, lower: 2.50, upper:  6.50, realized: 4.46  },
  { year: 2008, center: 4.50, lower: 2.50, upper:  6.50, realized: 5.90  },
  { year: 2009, center: 4.50, lower: 2.50, upper:  6.50, realized: 4.31  },
  { year: 2010, center: 4.50, lower: 2.50, upper:  6.50, realized: 5.91  },
  { year: 2011, center: 4.50, lower: 2.50, upper:  6.50, realized: 6.50  },
  { year: 2012, center: 4.50, lower: 2.50, upper:  6.50, realized: 5.84  },
  { year: 2013, center: 4.50, lower: 2.50, upper:  6.50, realized: 5.91  },
  { year: 2014, center: 4.50, lower: 2.50, upper:  6.50, realized: 6.41  },
  { year: 2015, center: 4.50, lower: 2.50, upper:  6.50, realized: 10.67 },
  { year: 2016, center: 4.50, lower: 2.50, upper:  6.50, realized: 6.29  },
  { year: 2017, center: 4.50, lower: 3.00, upper:  6.00, realized: 2.95  },
  { year: 2018, center: 4.50, lower: 3.00, upper:  6.00, realized: 3.75  },
  { year: 2019, center: 4.25, lower: 2.75, upper:  5.75, realized: 4.31  },
  { year: 2020, center: 4.00, lower: 2.50, upper:  5.50, realized: 4.52  },
  { year: 2021, center: 3.75, lower: 2.25, upper:  5.25, realized: 10.06 },
  { year: 2022, center: 3.50, lower: 2.00, upper:  5.00, realized: 5.79  },
  { year: 2023, center: 3.25, lower: 1.75, upper:  4.75, realized: 4.62  },
  { year: 2024, center: 3.00, lower: 1.50, upper:  4.50, realized: 4.83  },
  { year: 2025, center: 3.00, lower: 1.50, upper:  4.50, realized: null  },
  { year: 2026, center: 3.00, lower: 1.50, upper:  4.50, realized: null  },
]

// ────────────────────────────────────────────────────────────────────────────
export default async function PoliticaMonetariaPage() {
  const [
    selicKv, ipca12mKv, embiKv,
    selicH, ipca12mH, diOverH,
    selicLongH,
    m1H, m2H, bmaH, compH, m3H, m4H, baseRestritoH,
    embiH,
    focusIpcaRaw, focusSelicRaw,
    ettj,
  ] = await Promise.all([
    getSeriesLatestTwo('4189'),
    getSeriesLatestTwo('13522'),
    getSeriesLatestTwo('11752'),
    getSeriesHistoryFrom('4189',  FROM),
    getSeriesHistoryFrom('13522', FROM),
    getSeriesMonthly('4389', FROM),
    getSeriesHistoryFrom('4189',  FROM_LONG),   // Selic longa para ciclos COPOM
    getSeriesHistoryFrom('1786',  FROM_LONG),   // M1
    getSeriesHistoryFrom('1788',  FROM_LONG),   // M2
    getSeriesHistoryFrom('1833',  FROM_LONG),   // BMA
    getSeriesHistoryFrom('17633', FROM_LONG),   // Compulsórios
    getSeriesHistoryFrom('27815', FROM_LONG),   // M3
    getSeriesHistoryFrom('27813', FROM_LONG),   // M4
    getSeriesMonthly('1782',    FROM_LONG),     // Base Restrita diária → mensal (para multiplicador)
    getSeriesMonthly('11752', FROM),            // EMBI+ risco-Brasil
    fetchFocusAnual('IPCA',  30).catch(() => []),
    fetchFocusAnual('Selic', 30).catch(() => []),
    fetchEttj().catch(() => ({ pre: [], ipca: [], impl: [] })),
  ])

  const selicData  = selicH?.data  ?? []
  const ipca12Data = ipca12mH?.data ?? []
  const realRate   = computeDiff(selicData, ipca12Data)

  const currentYear = new Date().getFullYear()
  const focusIpca  = latestByYear(focusIpcaRaw).filter((r) => Number(r.year) >= currentYear)
  const focusSelic = latestByYear(focusSelicRaw).filter((r) => Number(r.year) >= currentYear)

  const copomCycles = detectCopomCycles(selicLongH?.data ?? [])

  const m1Data  = m1H?.data  ?? []
  const bmaData = bmaH?.data ?? []

  return (
    <MonetaryDashboard
      data={{
        selicKv,
        ipca12mKv,
        embiKv,
        selic:    selicData,
        ipca12m:  ipca12Data,
        realRate,
        diOver:   diOverH,
        focusIpca,
        focusSelic,
        copomCycles,
        inflationTargets: INFLATION_TARGETS,
        m1:      m1Data,
        m2:      m2H?.data  ?? [],
        bma:     bmaData,
        comp:    compH?.data ?? [],
        m3:           m3H?.data           ?? [],
        m4:           m4H?.data           ?? [],
        baseRestrito: baseRestritoH       ?? [],
        embi:         embiH,
        ettj,
      }}
    />
  )
}
