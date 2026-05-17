export interface EttjPoint {
  bd: number      // business days to maturity
  months: number  // approximate months
  rate: number    // % a.a.
}

export interface EttjCurve {
  pre:   EttjPoint[]   // NTN-F prefixada (zero coupon)
  ipca:  EttjPoint[]   // NTN-B IPCA+ (real yield)
  impl:  EttjPoint[]   // inflação implícita = pre - ipca (apenas vértices comuns)
}

// Vértices para exibir no gráfico (dias úteis aproximados)
const VERTICES_BD = [21, 42, 63, 126, 189, 252, 378, 504, 756, 1008, 1260, 1764, 2520]
const BD_TO_MONTHS: Record<number, number> = {
  21: 1, 42: 2, 63: 3, 126: 6, 189: 9, 252: 12,
  378: 18, 504: 24, 756: 36, 1008: 48, 1260: 60, 1764: 84, 2520: 120,
}

function parseEttjXml(xml: string): Map<number, number> {
  const result = new Map<number, number>()
  // <categories> block: <category name='N' .../>  (x-axis = business day index 1-based)
  // <dataset> blocks: <set value='RATE'/> in same order as categories
  const catMatches = [...xml.matchAll(/<category name='(\d+)'/g)]
  const setMatches = [...xml.matchAll(/<set value='([^']+)'/g)]

  // First dataset is smooth (all BDs); second dataset is vertices only
  // Both have same length as categories block
  // Take second dataset if it exists, otherwise first
  const totalCats = catMatches.length

  // split datasets by finding </dataset> boundaries
  const datasets = xml.split('</dataset>')
  // Use first non-empty dataset with matching set count
  for (const block of datasets) {
    const sets = [...block.matchAll(/<set value='([^']+)'/g)]
    if (sets.length === totalCats) {
      catMatches.forEach((cat, i) => {
        const bd   = parseInt(cat[1])
        const rate = parseFloat(sets[i][1])
        result.set(bd, rate)
      })
      break
    }
  }

  return result
}

function sampleAtVertices(bdMap: Map<number, number>): EttjPoint[] {
  return VERTICES_BD
    .map((bd) => {
      // find closest available bd in map
      let closest = bd
      let minDist = Infinity
      for (const k of bdMap.keys()) {
        const d = Math.abs(k - bd)
        if (d < minDist) { minDist = d; closest = k }
      }
      const rate = bdMap.get(closest)
      if (rate === undefined) return null
      return { bd, months: BD_TO_MONTHS[bd] ?? Math.round(bd / 21), rate }
    })
    .filter((p): p is EttjPoint => p !== null)
}

export async function fetchEttj(): Promise<EttjCurve> {
  const BASE = 'https://www.anbima.com.br/informacoes/est-termo/xml'

  const [preXml, ipcaXml] = await Promise.all([
    fetch(`${BASE}/CurvaZero_PREF.xml`).then((r) => r.text()).catch(() => ''),
    fetch(`${BASE}/CurvaZero_IPCA.xml`).then((r) => r.text()).catch(() => ''),
  ])

  const preBd   = preXml  ? parseEttjXml(preXml)  : new Map<number, number>()
  const ipcaBd  = ipcaXml ? parseEttjXml(ipcaXml) : new Map<number, number>()

  const pre  = sampleAtVertices(preBd)
  const ipca = sampleAtVertices(ipcaBd)

  // inflação implícita nos vértices comuns
  const impl: EttjPoint[] = []
  for (const p of pre) {
    const i = ipca.find((x) => x.bd === p.bd)
    if (i) impl.push({ bd: p.bd, months: p.months, rate: parseFloat((p.rate - i.rate).toFixed(4)) })
  }

  return { pre, ipca, impl }
}
