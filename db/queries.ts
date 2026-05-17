import { db } from './client'
import { macroSeriesMeta, macroSeriesData } from './schema'
import { eq, desc, and, gte, sql } from 'drizzle-orm'

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

// Para séries diárias: reamostrage para mensal (último valor de cada mês)
export async function getSeriesMonthly(
  sourceCode: string,
  from: Date
): Promise<SeriesPoint[]> {
  const [meta] = await db
    .select({ id: macroSeriesMeta.id })
    .from(macroSeriesMeta)
    .where(eq(macroSeriesMeta.sourceCode, sourceCode))
    .limit(1)

  if (!meta) return []

  const fromStr = from.toISOString().split('T')[0]

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (date_trunc('month', date::date))
      date::text AS date,
      value::text AS value
    FROM macro_series_data
    WHERE series_id = ${meta.id} AND date >= ${fromStr}
    ORDER BY date_trunc('month', date::date), date DESC
  `)

  return (rows as unknown as { date: string; value: string }[])
    .map((r) => ({ date: r.date.slice(0, 10), value: parseFloat(r.value) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getSeriesHistoryFrom(
  sourceCode: string,
  from: Date
): Promise<SeriesResult | null> {
  const [meta] = await db
    .select()
    .from(macroSeriesMeta)
    .where(eq(macroSeriesMeta.sourceCode, sourceCode))
    .limit(1)

  if (!meta) return null

  const fromStr = from.toISOString().split('T')[0]
  const rows = await db
    .select({ date: macroSeriesData.date, value: macroSeriesData.value })
    .from(macroSeriesData)
    .where(and(
      eq(macroSeriesData.seriesId, meta.id),
      gte(macroSeriesData.date, fromStr)
    ))
    .orderBy(macroSeriesData.date)

  return {
    id: meta.id,
    sourceCode: meta.sourceCode,
    name: meta.name,
    unit: meta.unit,
    frequency: meta.frequency,
    area: meta.area,
    data: rows.map((r) => ({
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
