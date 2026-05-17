import { db } from '../db/client'
import { macroSeriesMeta, macroSeriesData } from '../db/schema'
import { inArray, eq, count } from 'drizzle-orm'

async function main() {
  const codes = ['4513','13762','5727','5793','4649']
  const metas = await db.select().from(macroSeriesMeta).where(inArray(macroSeriesMeta.sourceCode, codes))
  for (const m of metas) {
    const [r] = await db.select({ n: count() }).from(macroSeriesData).where(eq(macroSeriesData.seriesId, m.id))
    console.log(m.sourceCode, '->', r.n, 'rows |', m.active ? 'active' : 'INACTIVE')
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
