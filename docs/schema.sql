-- Monitor Macro BR: Schema Postgres (Supabase)
-- Script idempotente: seguro de rodar multiplas vezes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. SERIES MACROECONOMICAS

CREATE TABLE IF NOT EXISTS macro_series_meta (
    id              SERIAL PRIMARY KEY,
    source          TEXT NOT NULL,
    source_code     TEXT NOT NULL,
    name            TEXT NOT NULL,
    unit            TEXT,
    frequency       TEXT NOT NULL,
    area            TEXT NOT NULL,
    description     TEXT,
    active          BOOLEAN DEFAULT true,
    last_fetch_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, source_code)
);

CREATE INDEX IF NOT EXISTS idx_series_meta_area ON macro_series_meta (area) WHERE active = true;

CREATE TABLE IF NOT EXISTS macro_series_data (
    series_id       INTEGER NOT NULL REFERENCES macro_series_meta(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    value           NUMERIC(20, 6) NOT NULL,
    inserted_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (series_id, date)
);

CREATE INDEX IF NOT EXISTS idx_series_data_date ON macro_series_data (date DESC);
CREATE INDEX IF NOT EXISTS idx_series_data_series_date ON macro_series_data (series_id, date DESC);

-- 2. EXPECTATIVAS FOCUS

CREATE TABLE IF NOT EXISTS focus_expectations (
    indicator           TEXT NOT NULL,
    reference_period    TEXT NOT NULL,
    date                DATE NOT NULL,
    median              NUMERIC(20, 6),
    mean                NUMERIC(20, 6),
    std_dev             NUMERIC(20, 6),
    min_value           NUMERIC(20, 6),
    max_value           NUMERIC(20, 6),
    num_responses       INTEGER,
    PRIMARY KEY (indicator, reference_period, date)
);

CREATE INDEX IF NOT EXISTS idx_focus_date ON focus_expectations (date DESC);

-- 3. MERCADOS

CREATE TABLE IF NOT EXISTS tickers (
    symbol          TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    asset_type      TEXT,
    source          TEXT NOT NULL,
    source_code     TEXT,
    active          BOOLEAN DEFAULT true,
    display_order   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickers_category ON tickers (category) WHERE active = true;

CREATE TABLE IF NOT EXISTS quotes_latest (
    symbol          TEXT PRIMARY KEY REFERENCES tickers(symbol) ON DELETE CASCADE,
    price           NUMERIC(20, 6) NOT NULL,
    prev_close      NUMERIC(20, 6),
    change_pct_d    NUMERIC(10, 4),
    change_pct_w    NUMERIC(10, 4),
    change_pct_m    NUMERIC(10, 4),
    change_pct_y    NUMERIC(10, 4),
    volume          NUMERIC(20, 2),
    updated_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes_intraday (
    symbol          TEXT NOT NULL REFERENCES tickers(symbol) ON DELETE CASCADE,
    ts              TIMESTAMPTZ NOT NULL,
    price           NUMERIC(20, 6) NOT NULL,
    volume          NUMERIC(20, 2),
    PRIMARY KEY (symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_intraday_ts ON quotes_intraday (ts DESC);

CREATE TABLE IF NOT EXISTS quotes_daily (
    symbol          TEXT NOT NULL REFERENCES tickers(symbol) ON DELETE CASCADE,
    date            DATE NOT NULL,
    open            NUMERIC(20, 6),
    high            NUMERIC(20, 6),
    low             NUMERIC(20, 6),
    close           NUMERIC(20, 6) NOT NULL,
    volume          NUMERIC(20, 2),
    PRIMARY KEY (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_date ON quotes_daily (date DESC);

-- 4. NOTICIAS

CREATE TABLE IF NOT EXISTS news_sources (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    rss_url         TEXT,
    site_url        TEXT,
    category        TEXT,
    language        TEXT DEFAULT 'pt',
    active          BOOLEAN DEFAULT true,
    fetch_interval_min INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS news_items (
    id              BIGSERIAL PRIMARY KEY,
    source_id       INTEGER REFERENCES news_sources(id),
    url             TEXT NOT NULL,
    url_hash        TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    summary         TEXT,
    body            TEXT,
    author          TEXT,
    published_at    TIMESTAMPTZ NOT NULL,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    ai_summary          TEXT,
    relevance_score     SMALLINT,
    themes              TEXT[],
    entities            TEXT[],
    sentiment           TEXT,
    is_breaking         BOOLEAN DEFAULT false,
    ai_processed_at     TIMESTAMPTZ,
    embedding           VECTOR(1024),
    duplicate_of        BIGINT REFERENCES news_items(id),
    read_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_relevance ON news_items (relevance_score DESC, published_at DESC) WHERE duplicate_of IS NULL;
CREATE INDEX IF NOT EXISTS idx_news_themes ON news_items USING GIN (themes);
CREATE INDEX IF NOT EXISTS idx_news_entities ON news_items USING GIN (entities);
-- idx_news_embedding: criar depois que houver dados na tabela
-- CREATE INDEX IF NOT EXISTS idx_news_embedding ON news_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. EVENTOS GEOPOLITICOS

CREATE TABLE IF NOT EXISTS geo_events (
    id              BIGSERIAL PRIMARY KEY,
    source          TEXT NOT NULL,
    source_id       TEXT,
    event_date      TIMESTAMPTZ NOT NULL,
    country         TEXT,
    region          TEXT,
    category        TEXT,
    title           TEXT NOT NULL,
    description     TEXT,
    importance      SMALLINT,
    br_impact_inflation TEXT,
    br_impact_fx        TEXT,
    br_impact_flows     TEXT,
    br_impact_summary   TEXT,
    raw_data        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_date ON geo_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_geo_importance ON geo_events (importance DESC, event_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_dedup ON geo_events (source, source_id) WHERE source_id IS NOT NULL;

-- 6. PULSE

CREATE TABLE IF NOT EXISTS market_events (
    id              BIGSERIAL PRIMARY KEY,
    ts              TIMESTAMPTZ DEFAULT NOW(),
    event_date      DATE,
    category        TEXT NOT NULL,
    symbol          TEXT REFERENCES tickers(symbol),
    company_name    TEXT,
    title           TEXT NOT NULL,
    description     TEXT,
    data            JSONB,
    importance      SMALLINT DEFAULT 3
);

CREATE INDEX IF NOT EXISTS idx_pulse_ts ON market_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_category ON market_events (category, ts DESC);

-- 7. COMUNICADOS DE BANCOS CENTRAIS

CREATE TABLE IF NOT EXISTS cb_communications (
    id              BIGSERIAL PRIMARY KEY,
    bank            TEXT NOT NULL,
    doc_type        TEXT NOT NULL,
    meeting_date    DATE,
    published_at    TIMESTAMPTZ NOT NULL,
    url             TEXT,
    title           TEXT,
    full_text       TEXT,
    speaker         TEXT,
    hawkishness_score   NUMERIC(5, 4),
    score_confidence    NUMERIC(5, 4),
    score_explanation   TEXT,
    model_version       TEXT,
    scored_at           TIMESTAMPTZ,
    ai_summary          TEXT,
    key_changes_vs_prev TEXT[],
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_published ON cb_communications (bank, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_cb_score_history ON cb_communications (bank, meeting_date DESC) WHERE hawkishness_score IS NOT NULL;

-- 8. BRIEFS DE IA

CREATE TABLE IF NOT EXISTS ai_briefs (
    id              BIGSERIAL PRIMARY KEY,
    brief_date      DATE NOT NULL,
    brief_type      TEXT NOT NULL,
    title           TEXT,
    content         TEXT NOT NULL,
    summary         TEXT,
    sources_used    JSONB,
    model           TEXT,
    tokens_used     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefs_date ON ai_briefs (brief_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_briefs_daily_unique ON ai_briefs (brief_date) WHERE brief_type = 'daily_macro';

-- 9. JOB LOG

CREATE TABLE IF NOT EXISTS job_runs (
    id              BIGSERIAL PRIMARY KEY,
    job_name        TEXT NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ,
    status          TEXT,
    items_processed INTEGER DEFAULT 0,
    items_failed    INTEGER DEFAULT 0,
    error           TEXT,
    metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_jobs_recent ON job_runs (job_name, started_at DESC);

-- 10. VIEWS

CREATE OR REPLACE VIEW v_quotes_with_meta AS
SELECT
    q.symbol,
    t.name,
    t.category,
    t.asset_type,
    q.price,
    q.change_pct_d,
    q.change_pct_w,
    q.change_pct_m,
    q.change_pct_y,
    q.updated_at
FROM quotes_latest q
JOIN tickers t ON t.symbol = q.symbol
WHERE t.active = true;

CREATE OR REPLACE VIEW v_series_latest AS
SELECT DISTINCT ON (m.id)
    m.id AS series_id,
    m.source,
    m.source_code,
    m.name,
    m.unit,
    m.area,
    m.frequency,
    d.date AS latest_date,
    d.value AS latest_value
FROM macro_series_meta m
LEFT JOIN macro_series_data d ON d.series_id = m.id
WHERE m.active = true
ORDER BY m.id, d.date DESC;

CREATE OR REPLACE VIEW v_news_feed AS
SELECT
    n.id,
    n.title,
    n.ai_summary,
    n.published_at,
    n.relevance_score,
    n.themes,
    n.entities,
    n.sentiment,
    n.is_breaking,
    n.url,
    s.name AS source_name,
    s.category AS source_category,
    n.read_at IS NOT NULL AS is_read
FROM news_items n
JOIN news_sources s ON s.id = n.source_id
WHERE n.duplicate_of IS NULL
  AND n.relevance_score >= 3;
