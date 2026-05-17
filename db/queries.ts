import { db } from './client'
import { macroSeriesMeta, macroSeriesData } from './schema'
import { eq, desc } from 'drizzle-orm'

export interface SeriesPoint {
  date: string   // YYYY-MM-DD
  value: number
}

export interface SeriesResult {
  id: number
  sourceCode: string
  name: string
  unit: string | null
  frequency: string
  area: string
  data: SeriesPoint[]
}

export async function getSeriesHistory(
  sourceCode: string,
  limit = 24
): Promise<SeriesResult | null> {
  const [meta] = await db
    .select()
    .from(macroSeriesMeta)
    .where(eq(macroSeriesMeta.sourceCode, sourceCode))
    .limit(1)

  if (!meta) return null

  const rows = await db
    .select({ date: macroSeriesData.date, value: macroSeriesData.value })
    .from(macroSeriesData)
    .where(eq(macroSeriesData.seriesId, meta.id))
    .orderBy(desc(macroSeriesData.date))
    .limit(limit)

  return {
    id: meta.id,
    sourceCode: meta.sourceCode,
    name: meta.name,
    unit: meta.unit,
    frequency: meta.frequency,
    area: meta.area,
    data: rows.reverse().map((r) => ({
      date: r.date as string,
      value: parseFloat(r.value as string),
    })),
  }
}

// Retorna só o último valor e o anterior (para calcular variação)
export async function getSeriesLatestTwo(
  sourceCode: string
): Promise<{ latest: SeriesPoint; previous: SeriesPoint | null } | null> {
  const [meta] = await db
    .select({ id: macroSeriesMeta.id })
    .from(macroSeriesMeta)
    .where(eq(macroSeriesMeta.sourceCode, sourceCode))
    .limit(1)

  if (!meta) return null

  const rows = await db
    .select({ date: macroSeriesData.date, value: macroSeriesData.value })
    .from(macroSeriesData)
    .where(eq(macroSeriesData.seriesId, meta.id))
    .orderBy(desc(macroSeriesData.date))
    .limit(2)

  if (rows.length === 0) return null

  return {
    latest:   { date: rows[0].date as string, value: parseFloat(rows[0].value as string) },
    previous: rows[1] ? { date: rows[1].date as string, value: parseFloat(rows[1].value as string) } : null,
  }
}
