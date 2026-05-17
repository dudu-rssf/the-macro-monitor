import { NextResponse } from 'next/server'
import { fetchEttj, type EttjPoint } from '@/lib/sources/anbima-ettj'

export const dynamic = 'force-dynamic'

// ── helpers ────────────────────────────────────────────────────────────

function bdUntil(target: Date): number {
  const calDays = Math.max(0, Math.round((target.getTime() - Date.now()) / 86_400_000))
  return Math.round(calDays * 5 / 7)
}

// Linear interpolation on the ETTJ curve at a given business-day target
function interpolate(points: EttjPoint[], targetBd: number): number | null {
  if (points.length === 0) return null
  const s = [...points].sort((a, b) => a.bd - b.bd)
  if (targetBd <= s[0].bd)             return s[0].rate
  if (targetBd >= s[s.length - 1].bd)  return s[s.length - 1].rate
  const lo = [...s].reverse().find(p => p.bd <= targetBd)!
  const hi = s.find(p => p.bd >= targetBd)!
  const t  = (targetBd - lo.bd) / (hi.bd - lo.bd)
  return parseFloat((lo.rate + t * (hi.rate - lo.rate)).toFixed(4))
}

export interface HorizonRate {
  label: string
  bd:    number
  impl:  number | null   // inflação implícita
  pre:   number | null   // juros pré-fixados (NTN-F)
  real:  number | null   // juro real (NTN-B)
}

export interface ExpectationsData {
  horizons: HorizonRate[]
  curve: {   // full curve for chart
    months: number
    impl:   number | null
    pre:    number | null
    real:   number | null
  }[]
  curveDate: string    // date of ANBIMA data (today, since it's intraday)
  fetchedAt: string
}

export async function GET() {
  try {
    const ettj = await fetchEttj()

    const now       = new Date()
    const curYear   = now.getFullYear()
    const end2026   = new Date(2026, 11, 31)
    const end2027   = new Date(2027, 11, 31)
    const in5y      = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate())
    const in10y     = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate())

    const bd2026 = bdUntil(end2026)
    const bd2027 = bdUntil(end2027)
    const bd5y   = bdUntil(in5y)
    const bd10y  = bdUntil(in10y)

    // Fixed standard horizons + year-end targets
    const horizonDefs: { label: string; bd: number }[] = [
      { label: '1 ano',         bd: 252   },
      { label: '2 anos',        bd: 504   },
      { label: `Fin. ${curYear + 1} (${curYear + 1 <= 2026 ? '2026' : curYear + 1})`, bd: bd2026 },
      { label: `Fin. ${curYear + 2}`, bd: bd2027 },
      { label: '5 anos',        bd: bd5y  },
      { label: '10 anos',       bd: bd10y },
    ]

    // Deduplicate if years overlap with standard horizons
    const horizons: HorizonRate[] = []
    const seenBd = new Set<number>()
    for (const h of horizonDefs) {
      const snap = Math.round(h.bd / 21) * 21   // round to nearest month-bucket
      if (seenBd.has(snap)) continue
      seenBd.add(snap)
      horizons.push({
        label: h.label,
        bd:    h.bd,
        impl:  interpolate(ettj.impl, h.bd),
        pre:   interpolate(ettj.pre,  h.bd),
        real:  interpolate(ettj.ipca, h.bd),
      })
    }

    // Full curve (vertex points) for the chart
    const allBd = Array.from(new Set([
      ...ettj.impl.map(p => p.bd),
      ...ettj.pre.map(p => p.bd),
      ...ettj.ipca.map(p => p.bd),
    ])).sort((a, b) => a - b)

    const curve = allBd.map(bd => {
      const months = Math.round(bd / 21)
      return {
        months,
        impl: ettj.impl.find(p => p.bd === bd)?.rate ?? null,
        pre:  ettj.pre.find(p => p.bd === bd)?.rate  ?? null,
        real: ettj.ipca.find(p => p.bd === bd)?.rate ?? null,
      }
    })

    return NextResponse.json({
      horizons,
      curve,
      curveDate: now.toISOString().slice(0, 10),
      fetchedAt: now.toISOString(),
    } satisfies ExpectationsData)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
