-- ============================================================================
-- MONITOR MACRO BR — SCHEMA POSTGRES (Supabase)
-- ============================================================================
-- Execute esse arquivo no SQL Editor do Supabase em ordem.
-- Requer extensões: pgvector (para deduplicação semântica de notícias)
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector para embeddings

-- ============================================================================
-- 1. SÉRIES MACROECONÔMICAS
-- ============================================================================
-- Metadados de cada série (BCB SGS, IBGE SIDRA, Tesouro, IPEADATA)

CREATE TABLE macro_series_meta (
    id              SERIAL PRIMARY KEY,
    source          TEXT NOT NULL,         -- 'BCB_SGS', 'BCB_FOCUS', 'IBGE_SIDRA', 'IPEADATA', 'TESOURO'
    source_code     TEXT NOT NULL,         -- código original na fonte (ex: '433' para IPCA mensal)
    name            TEXT NOT NULL,         -- nome legível ('IPCA - Variação mensal')
    unit            TEXT,                  -- '%', '% a.a.', 'pontos', 'R$ bilhões'
    frequency       TEXT NOT NULL,         -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
    area            TEXT NOT NULL,         -- 'inflation', 'monetary', 'activity', 'labor', 'fiscal', 'external', 'credit', 'fx'
    description     TEXT,
    active          BOOLEAN DEFAULT true,
    last_fetch_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, source_code)
);

CREATE INDEX idx_series_meta_area ON macro_series_meta (area) WHERE active = true;

-- Dados das séries (uma linha por (série, data))
CREATE TABLE macro_series_data (
    series_id       INTEGER NOT NULL REFERENCES macro_series_meta(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    value           NUMERIC(20, 6) NOT NULL,
    inserted_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (series_id, date)
);

CREATE INDEX idx_series_data_date ON macro_series_data (date DESC);
CREATE INDEX idx_series_data_series_date ON macro_series_data (series_id, date DESC);

-- ============================================================================
-- 2. EXPECTATIVAS FOCUS (Boletim Focus do BCB)
-- ============================================================================

CREATE TABLE focus_expectations (
    indicator           TEXT NOT NULL,        -- 'ipca', 'selic', 'pib', 'cambio', 'igpm'
    reference_period    TEXT NOT NULL,        -- '2026', '2026-12', '2027' (depende do indicador)
    date                DATE NOT NULL,        -- data da expectativa
    median              NUMERIC(20, 6),
    mean                NUMERIC(20, 6),
    std_dev             NUMERIC(20, 6),
    min_value           NUMERIC(20, 6),
    max_value           NUMERIC(20, 6),
    num_responses       INTEGER,
    PRIMARY KEY (indicator, reference_period, date)
);

CREATE INDEX idx_focus_date ON focus_expectations (date DESC);

-- ============================================================================
-- 3. MERCADOS — TICKERS E QUOTES
-- ============================================================================

CREATE TABLE tickers (
    symbol          TEXT PRIMARY KEY,         -- 'IBOV', 'USDBRL=X', 'DI1F27', 'GC=F', 'BTC-USD'
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,            -- 'br_equity', 'br_rate', 'br_fx', 'us_equity', 'us_rate', 'commodity', 'crypto', 'risk'
    asset_type      TEXT,                     -- 'index', 'future', 'spot', 'rate', 'bond'
    source          TEXT NOT NULL,            -- 'yahoo', 'tesouro_direto', 'bcb_sgs', 'manual'
    source_code     TEXT,                     -- símbolo na fonte original
    active          BOOLEAN DEFAULT true,
    display_order   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickers_category ON tickers (category) WHERE active = true;

-- Última cotação (upsert constante — uma linha por ticker)
CREATE TABLE quotes_latest (
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

-- Snapshots intraday (a cada 10-15 min em pregão; rolling window de 7 dias)
CREATE TABLE quotes_intraday (
    symbol          TEXT NOT NULL REFERENCES tickers(symbol) ON DELETE CASCADE,
    ts              TIMESTAMPTZ NOT NULL,
    price           NUMERIC(20, 6) NOT NULL,
    volume          NUMERIC(20, 2),
    PRIMARY KEY (symbol, ts)
);

CREATE INDEX idx_intraday_ts ON quotes_intraday (ts DESC);

-- Closes diários (retidos permanentemente para análise histórica)
CREATE TABLE quotes_daily (
    symbol          TEXT NOT NULL REFERENCES tickers(symbol) ON DELETE CASCADE,
    date            DATE NOT NULL,
    open            NUMERIC(20, 6),
    high            NUMERIC(20, 6),
    low             NUMERIC(20, 6),
    close           NUMERIC(20, 6) NOT NULL,
    volume          NUMERIC(20, 2),
    PRIMARY KEY (symbol, date)
);

CREATE INDEX idx_daily_date ON quotes_daily (date DESC);

-- ============================================================================
-- 4. NOTÍCIAS (com deduplicação semântica via pgvector)
-- ============================================================================

CREATE TABLE news_sources (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,            -- 'Valor Econômico', 'Reuters Brasil', 'Brazil Journal'
    rss_url         TEXT,
    site_url        TEXT,
    category        TEXT,                     -- 'br_macro', 'br_markets', 'intl_macro', 'press_release', 'specialized'
    language        TEXT DEFAULT 'pt',        -- 'pt', 'en'
    active          BOOLEAN DEFAULT true,
    fetch_interval_min INTEGER DEFAULT 30
);

CREATE TABLE news_items (
    id              BIGSERIAL PRIMARY KEY,
    source_id       INTEGER REFERENCES news_sources(id),
    url             TEXT NOT NULL,
    url_hash        TEXT NOT NULL UNIQUE,     -- SHA256(url) para dedup exata
    title           TEXT NOT NULL,
    summary         TEXT,
    body            TEXT,
    author          TEXT,
    published_at    TIMESTAMPTZ NOT NULL,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Enriquecimento por IA
    ai_summary          TEXT,                 -- resumo em 2 frases
    relevance_score     SMALLINT,             -- 1-5 (3+ aparece por padrão)
    themes              TEXT[],               -- ['inflation', 'monetary_policy', 'fx']
    entities            TEXT[],               -- ['BCB', 'Petrobras', 'Lula', 'Powell']
    sentiment           TEXT,                 -- 'positive', 'negative', 'neutral'
    is_breaking         BOOLEAN DEFAULT false,
    ai_processed_at     TIMESTAMPTZ,

    -- Dedup semântica
    embedding           VECTOR(1024),         -- Voyage AI: 1024 dimensions
    duplicate_of        BIGINT REFERENCES news_items(id),  -- aponta pra notícia "canônica"

    read_at             TIMESTAMPTZ           -- marcação pessoal de lido
);

CREATE INDEX idx_news_published ON news_items (published_at DESC);
CREATE INDEX idx_news_relevance ON news_items (relevance_score DESC, published_at DESC) WHERE duplicate_of IS NULL;
CREATE INDEX idx_news_themes ON news_items USING GIN (themes);
CREATE INDEX idx_news_entities ON news_items USING GIN (entities);
CREATE INDEX idx_news_embedding ON news_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- 5. EVENTOS GEOPOLÍTICOS
-- ============================================================================

CREATE TABLE geo_events (
    id              BIGSERIAL PRIMARY KEY,
    source          TEXT NOT NULL,            -- 'GDELT', 'ACLED', 'POLYMARKET', 'CB_CALENDAR', 'ECON_CALENDAR'
    source_id       TEXT,                     -- ID na fonte original (pra dedup)
    event_date      TIMESTAMPTZ NOT NULL,
    country         TEXT,
    region          TEXT,                     -- 'americas', 'europe', 'asia', etc.
    category        TEXT,                     -- 'monetary_policy', 'election', 'conflict', 'sanctions', 'data_release', 'diplomatic', 'commodity_event'
    title           TEXT NOT NULL,
    description     TEXT,
    importance      SMALLINT,                 -- 1-5

    -- Impacto Brasil (gerado por IA)
    br_impact_inflation TEXT,                 -- 'up', 'down', 'neutral'
    br_impact_fx        TEXT,
    br_impact_flows     TEXT,
    br_impact_summary   TEXT,                 -- 1-2 frases explicativas

    raw_data        JSONB,                    -- payload original pra debug
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_date ON geo_events (event_date DESC);
CREATE INDEX idx_geo_importance ON geo_events (importance DESC, event_date DESC);
CREATE UNIQUE INDEX idx_geo_dedup ON geo_events (source, source_id) WHERE source_id IS NOT NULL;

-- ============================================================================
-- 6. PULSE — EVENTOS PONTUAIS DE MERCADO
-- ============================================================================

CREATE TABLE market_events (
    id              BIGSERIAL PRIMARY KEY,
    ts              TIMESTAMPTZ DEFAULT NOW(),
    event_date      DATE,                     -- pra earnings, dia do release
    category        TEXT NOT NULL,            -- 'earnings', 'ath', '52w_high', '52w_low', 'volume_spike', 'dividend', 'rating_change', 'cvm_filing', 'ipo', 'follow_on'
    symbol          TEXT REFERENCES tickers(symbol),
    company_name    TEXT,
    title           TEXT NOT NULL,
    description     TEXT,
    data            JSONB,                    -- dados específicos do evento (revenue, eps, dividend amount, etc.)
    importance      SMALLINT DEFAULT 3        -- 1-5, mantemos breakers em 5
);

CREATE INDEX idx_pulse_ts ON market_events (ts DESC);
CREATE INDEX idx_pulse_category ON market_events (category, ts DESC);

-- ============================================================================
-- 7. COMUNICADOS DE BANCOS CENTRAIS (Fed + BCB)
-- ============================================================================

CREATE TABLE cb_communications (
    id              BIGSERIAL PRIMARY KEY,
    bank            TEXT NOT NULL,            -- 'BCB', 'FED', 'ECB', 'BOE', 'BOJ', 'PBOC'
    doc_type        TEXT NOT NULL,            -- 'communique', 'minutes', 'inflation_report', 'speech', 'press_conf'
    meeting_date    DATE,
    published_at    TIMESTAMPTZ NOT NULL,
    url             TEXT,
    title           TEXT,
    full_text       TEXT,                     -- texto extraído do PDF/HTML
    speaker         TEXT,                     -- pra speeches

    -- Scoring de tom (preenchido por Claude API em v1, modelo próprio em v2)
    hawkishness_score   NUMERIC(5, 4),        -- -1.0 (super dovish) a +1.0 (super hawkish)
    score_confidence    NUMERIC(5, 4),        -- 0-1
    score_explanation   TEXT,                 -- justificativa em prosa
    model_version       TEXT,                 -- 'claude-sonnet-4.5-v1', 'fomc-adapted-pt-v1'
    scored_at           TIMESTAMPTZ,

    ai_summary          TEXT,                 -- resumo executivo dos pontos principais
    key_changes_vs_prev TEXT[],               -- mudanças vs comunicado anterior
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cb_published ON cb_communications (bank, published_at DESC);
CREATE INDEX idx_cb_score_history ON cb_communications (bank, meeting_date DESC) WHERE hawkishness_score IS NOT NULL;

-- ============================================================================
-- 8. BRIEFS DE IA (síntese diária)
-- ============================================================================

CREATE TABLE ai_briefs (
    id              BIGSERIAL PRIMARY KEY,
    brief_date      DATE NOT NULL,
    brief_type      TEXT NOT NULL,            -- 'daily_macro', 'on_demand', 'weekly_summary', 'event_reaction'
    title           TEXT,
    content         TEXT NOT NULL,            -- markdown
    summary         TEXT,                     -- TL;DR pra topo
    sources_used    JSONB,                    -- referências aos dados/notícias que entraram
    model           TEXT,                     -- 'claude-haiku-4.5', 'llama-3.3-70b-groq'
    tokens_used     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_briefs_date ON ai_briefs (brief_date DESC);
CREATE UNIQUE INDEX idx_briefs_daily_unique ON ai_briefs (brief_date) WHERE brief_type = 'daily_macro';

-- ============================================================================
-- 9. JOB EXECUTION LOG (observabilidade dos workers)
-- ============================================================================

CREATE TABLE job_runs (
    id              BIGSERIAL PRIMARY KEY,
    job_name        TEXT NOT NULL,            -- 'tier1_markets', 'tier2_news', 'tier3_macro', 'tier4_copom'
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ,
    status          TEXT,                     -- 'running', 'success', 'partial', 'failed'
    items_processed INTEGER DEFAULT 0,
    items_failed    INTEGER DEFAULT 0,
    error           TEXT,
    metadata        JSONB
);

CREATE INDEX idx_jobs_recent ON job_runs (job_name, started_at DESC);

-- ============================================================================
-- 10. VIEWS ÚTEIS
-- ============================================================================

-- Última quote com nome do ticker
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

-- Última observação de cada série
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

-- Feed de notícias (excluindo duplicatas)
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

-- ============================================================================
-- 11. ROW LEVEL SECURITY (para uso pessoal, só seu email tem acesso)
-- ============================================================================

-- Habilita RLS em tabelas que precisarem (deixa todas leitura aberta pra simplicidade
-- já que é uso pessoal e o auth é feito na camada da app)
-- Quando quiser fechar mais, adicione policies aqui.

-- Exemplo de policy futura (deixada comentada):
-- ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Only owner" ON news_items FOR ALL
--   USING (auth.jwt() ->> 'email' = 'seu@email.com');

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
-- Próximos passos:
-- 1. Rodar este arquivo no SQL Editor do Supabase
-- 2. Rodar scripts/seed-series.ts pra popular macro_series_meta
-- 3. Rodar scripts/seed-tickers.ts pra popular tickers
-- 4. Rodar scripts/seed-news-sources.ts pra popular news_sources
-- 5. Rodar scripts/backfill-bcb.ts pra baixar histórico inicial das séries
