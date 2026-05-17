import {
  pgTable,
  serial,
  bigserial,
  text,
  boolean,
  integer,
  smallint,
  numeric,
  date,
  timestamp,
  jsonb,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core'

// Tipo customizado para colunas pgvector
const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').map(Number)
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
})

// ---- 1. SERIES MACROECONOMICAS ----

export const macroSeriesMeta = pgTable('macro_series_meta', {
  id:           serial('id').primaryKey(),
  source:       text('source').notNull(),
  sourceCode:   text('source_code').notNull(),
  name:         text('name').notNull(),
  unit:         text('unit'),
  frequency:    text('frequency').notNull(),
  area:         text('area').notNull(),
  description:  text('description'),
  active:       boolean('active').default(true),
  lastFetchAt:  timestamp('last_fetch_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const macroSeriesData = pgTable('macro_series_data', {
  seriesId:   integer('series_id').notNull().references(() => macroSeriesMeta.id, { onDelete: 'cascade' }),
  date:       date('date').notNull(),
  value:      numeric('value', { precision: 20, scale: 6 }).notNull(),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
}, (t) => [primaryKey({ columns: [t.seriesId, t.date] })])

// ---- 2. EXPECTATIVAS FOCUS ----

export const focusExpectations = pgTable('focus_expectations', {
  indicator:        text('indicator').notNull(),
  referencePeriod:  text('reference_period').notNull(),
  date:             date('date').notNull(),
  median:           numeric('median', { precision: 20, scale: 6 }),
  mean:             numeric('mean', { precision: 20, scale: 6 }),
  stdDev:           numeric('std_dev', { precision: 20, scale: 6 }),
  minValue:         numeric('min_value', { precision: 20, scale: 6 }),
  maxValue:         numeric('max_value', { precision: 20, scale: 6 }),
  numResponses:     integer('num_responses'),
}, (t) => [primaryKey({ columns: [t.indicator, t.referencePeriod, t.date] })])

// ---- 3. MERCADOS ----

export const tickers = pgTable('tickers', {
  symbol:       text('symbol').primaryKey(),
  name:         text('name').notNull(),
  category:     text('category').notNull(),
  assetType:    text('asset_type'),
  source:       text('source').notNull(),
  sourceCode:   text('source_code'),
  active:       boolean('active').default(true),
  displayOrder: integer('display_order').default(0),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const quotesLatest = pgTable('quotes_latest', {
  symbol:      text('symbol').primaryKey().references(() => tickers.symbol, { onDelete: 'cascade' }),
  price:       numeric('price', { precision: 20, scale: 6 }).notNull(),
  prevClose:   numeric('prev_close', { precision: 20, scale: 6 }),
  changePctD:  numeric('change_pct_d', { precision: 10, scale: 4 }),
  changePctW:  numeric('change_pct_w', { precision: 10, scale: 4 }),
  changePctM:  numeric('change_pct_m', { precision: 10, scale: 4 }),
  changePctY:  numeric('change_pct_y', { precision: 10, scale: 4 }),
  volume:      numeric('volume', { precision: 20, scale: 2 }),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull(),
})

export const quotesIntraday = pgTable('quotes_intraday', {
  symbol:  text('symbol').notNull().references(() => tickers.symbol, { onDelete: 'cascade' }),
  ts:      timestamp('ts', { withTimezone: true }).notNull(),
  price:   numeric('price', { precision: 20, scale: 6 }).notNull(),
  volume:  numeric('volume', { precision: 20, scale: 2 }),
}, (t) => [primaryKey({ columns: [t.symbol, t.ts] })])

export const quotesDaily = pgTable('quotes_daily', {
  symbol:  text('symbol').notNull().references(() => tickers.symbol, { onDelete: 'cascade' }),
  date:    date('date').notNull(),
  open:    numeric('open', { precision: 20, scale: 6 }),
  high:    numeric('high', { precision: 20, scale: 6 }),
  low:     numeric('low', { precision: 20, scale: 6 }),
  close:   numeric('close', { precision: 20, scale: 6 }).notNull(),
  volume:  numeric('volume', { precision: 20, scale: 2 }),
}, (t) => [primaryKey({ columns: [t.symbol, t.date] })])

// ---- 4. NOTICIAS ----

export const newsSources = pgTable('news_sources', {
  id:                serial('id').primaryKey(),
  name:              text('name').notNull(),
  rssUrl:            text('rss_url'),
  siteUrl:           text('site_url'),
  category:          text('category'),
  language:          text('language').default('pt'),
  active:            boolean('active').default(true),
  fetchIntervalMin:  integer('fetch_interval_min').default(30),
})

export const newsItems = pgTable('news_items', {
  id:             bigserial('id', { mode: 'number' }).primaryKey(),
  sourceId:       integer('source_id').references(() => newsSources.id),
  url:            text('url').notNull(),
  urlHash:        text('url_hash').notNull().unique(),
  title:          text('title').notNull(),
  summary:        text('summary'),
  body:           text('body'),
  author:         text('author'),
  publishedAt:    timestamp('published_at', { withTimezone: true }).notNull(),
  fetchedAt:      timestamp('fetched_at', { withTimezone: true }).defaultNow(),
  aiSummary:      text('ai_summary'),
  relevanceScore: smallint('relevance_score'),
  themes:         text('themes').array(),
  entities:       text('entities').array(),
  sentiment:      text('sentiment'),
  isBreaking:     boolean('is_breaking').default(false),
  aiProcessedAt:  timestamp('ai_processed_at', { withTimezone: true }),
  embedding:      vector('embedding', { dimensions: 1024 }),
  duplicateOf:    bigserial('duplicate_of', { mode: 'number' }),
  readAt:         timestamp('read_at', { withTimezone: true }),
})

// ---- 5. EVENTOS GEOPOLITICOS ----

export const geoEvents = pgTable('geo_events', {
  id:                 bigserial('id', { mode: 'number' }).primaryKey(),
  source:             text('source').notNull(),
  sourceId:           text('source_id'),
  eventDate:          timestamp('event_date', { withTimezone: true }).notNull(),
  country:            text('country'),
  region:             text('region'),
  category:           text('category'),
  title:              text('title').notNull(),
  description:        text('description'),
  importance:         smallint('importance'),
  brImpactInflation:  text('br_impact_inflation'),
  brImpactFx:         text('br_impact_fx'),
  brImpactFlows:      text('br_impact_flows'),
  brImpactSummary:    text('br_impact_summary'),
  rawData:            jsonb('raw_data'),
  createdAt:          timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ---- 6. PULSE ----

export const marketEvents = pgTable('market_events', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  ts:          timestamp('ts', { withTimezone: true }).defaultNow(),
  eventDate:   date('event_date'),
  category:    text('category').notNull(),
  symbol:      text('symbol').references(() => tickers.symbol),
  companyName: text('company_name'),
  title:       text('title').notNull(),
  description: text('description'),
  data:        jsonb('data'),
  importance:  smallint('importance').default(3),
})

// ---- 7. COMUNICADOS DE BANCOS CENTRAIS ----

export const cbCommunications = pgTable('cb_communications', {
  id:                  bigserial('id', { mode: 'number' }).primaryKey(),
  bank:                text('bank').notNull(),
  docType:             text('doc_type').notNull(),
  meetingDate:         date('meeting_date'),
  publishedAt:         timestamp('published_at', { withTimezone: true }).notNull(),
  url:                 text('url'),
  title:               text('title'),
  fullText:            text('full_text'),
  speaker:             text('speaker'),
  hawkishnessScore:    numeric('hawkishness_score', { precision: 5, scale: 4 }),
  scoreConfidence:     numeric('score_confidence', { precision: 5, scale: 4 }),
  scoreExplanation:    text('score_explanation'),
  modelVersion:        text('model_version'),
  scoredAt:            timestamp('scored_at', { withTimezone: true }),
  aiSummary:           text('ai_summary'),
  keyChangesVsPrev:    text('key_changes_vs_prev').array(),
  createdAt:           timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ---- 8. BRIEFS DE IA ----

export const aiBriefs = pgTable('ai_briefs', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  briefDate:   date('brief_date').notNull(),
  briefType:   text('brief_type').notNull(),
  title:       text('title'),
  content:     text('content').notNull(),
  summary:     text('summary'),
  sourcesUsed: jsonb('sources_used'),
  model:       text('model'),
  tokensUsed:  integer('tokens_used'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ---- 9. JOB LOG ----

export const jobRuns = pgTable('job_runs', {
  id:             bigserial('id', { mode: 'number' }).primaryKey(),
  jobName:        text('job_name').notNull(),
  startedAt:      timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt:     timestamp('finished_at', { withTimezone: true }),
  status:         text('status'),
  itemsProcessed: integer('items_processed').default(0),
  itemsFailed:    integer('items_failed').default(0),
  error:          text('error'),
  metadata:       jsonb('metadata'),
})

// ---- TIPOS INFERIDOS (usados nas pages e components) ----

export type SeriesMeta = typeof macroSeriesMeta.$inferSelect
export type SeriesData = typeof macroSeriesData.$inferSelect
export type FocusExpectation = typeof focusExpectations.$inferSelect
export type Ticker = typeof tickers.$inferSelect
export type QuoteLatest = typeof quotesLatest.$inferSelect
export type NewsItem = typeof newsItems.$inferSelect
export type AiBrief = typeof aiBriefs.$inferSelect
export type JobRun = typeof jobRuns.$inferSelect
