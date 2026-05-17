# Monitor Macro BR — Plano de Construção

> Dashboard pessoal de inteligência macroeconômica do Brasil. Agrega séries oficiais, notícias, eventos geopolíticos, mercados e sintetiza com IA. Pensado pra você economizar tempo de leitura/varredura diária e ficar atualizado em minutos.

---

## 0. TL;DR

- **Stack**: Next.js 15 + TypeScript + Tailwind + shadcn/ui + **Tremor** + Supabase (Postgres + pgvector) + Cloudflare Workers + (Groq grátis OU Anthropic API)
- **Tempo realista**: 6 semanas de trabalho consistente (10-15h/semana)
- **Custo**: R$ 0/mês na versão zero-budget pura; ~R$ 20-40/mês na versão "qualidade premium" com Anthropic API
- **Approach**: você **dirige** o Claude Code, não escreve código manualmente
- **Modelo de tom de BCs**: v1 usa Claude API; v2 (depois que dashboard estiver no ar) você adapta seu modelo FOMC pro BCB e faz swap
- **Hospedagem**: Vercel Hobby (frontend) + Supabase Free (DB + auth) + Cloudflare Workers Free (cron jobs)

---

## 1. Restrições assumidas

| Constraint | Implicação no projeto |
|---|---|
| Apenas pra você | Sem multi-tenancy, sem billing, auth simples (Supabase magic link com whitelist de 1 email) |
| Zero experiência Next.js/React | Stack precisa ser "Claude Code-friendly". Tremor + shadcn cobrem 80% da UI sem custom CSS. Você revisa e testa, Claude Code escreve. |
| Orçamento zero | Sem Vercel Pro, sem Twitter API, sem Anthropic se quiser literal zero (Groq cobre). Toda infra em free tiers. |
| Modelo treinado em FOMC, precisa adaptar pro BCB | Não bloqueia o dashboard. v1 usa Claude API; troca por modelo próprio em v2. |

---

## 2. Arquitetura geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FONTES DE DADOS                             │
│  BCB SGS │ IBGE SIDRA │ Tesouro │ B3 │ Yahoo │ RSS BR+Intl │ GDELT  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
         ┌───────────────────────────────────────────────┐
         │     CLOUDFLARE WORKERS (cron + ingestão)      │
         │  ┌──────────┬──────────┬──────────┬────────┐  │
         │  │ Tier 1   │ Tier 2   │ Tier 3   │ Tier 4 │  │
         │  │ 5-15min  │ 30min    │ 1x/dia   │ Evento │  │
         │  │ markets  │ news/RSS │ macro    │ Copom  │  │
         │  └──────────┴──────────┴──────────┴────────┘  │
         └─────────────────────┬─────────────────────────┘
                               │
                               ▼
         ┌───────────────────────────────────────────────┐
         │     SUPABASE (Postgres + pgvector + auth)     │
         │   Séries · Quotes · Notícias · Eventos · IA   │
         └─────────────────────┬─────────────────────────┘
                               │
                               ▼
         ┌───────────────────────────────────────────────┐
         │   NEXT.JS APP (Vercel) — Server Components    │
         │   ┌─────────────────────────────────────┐    │
         │   │   Home · Pulse · Mercados · Inflação│    │
         │   │   Atividade · Trabalho · Fiscal     │    │
         │   │   Política Monetária · Externo      │    │
         │   │   Crédito · Geopolítica · Notícias  │    │
         │   └─────────────────────────────────────┘    │
         └─────────────────────┬─────────────────────────┘
                               │
                               ▼
         ┌───────────────────────────────────────────────┐
         │  IA (Anthropic API ou Groq)                   │
         │  · Briefs diários                             │
         │  · Classificação de notícias                  │
         │  · Score de tom Fed/BCB (até v2)              │
         │  · Q&A natural sobre os dados                 │
         └───────────────────────────────────────────────┘
```

---

## 3. Stack final

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend framework | **Next.js 15** (App Router) | Padrão da indústria; Claude Code domina; SSR pra dashboards rápidos |
| Linguagem | **TypeScript** | Detecta erros antes de você sofrer; obrigatório com Claude Code (ele acerta mais com types) |
| Styling | **Tailwind CSS v4** | Padrão; documentação extensa; Claude Code domina |
| Components | **shadcn/ui** + **Tremor** | shadcn: ~50 blocos prontos (cards, tables, forms); Tremor: ~30 componentes específicos de dashboard financeiro |
| Gráficos | **Tremor charts** (built-in Recharts) | Já vem com Tremor; tema escuro; padrão Bloomberg-like |
| Database | **Supabase Postgres** | Free 500MB; pgvector incluído (dedup semântica de notícias); auth grátis; pg_cron disponível |
| ORM | **Drizzle ORM** | TypeScript-first; melhor que Prisma pra performance; Claude Code lê schema e gera queries |
| Workers / Cron | **Cloudflare Workers + Cron Triggers** | 100k req/dia grátis; granularidade por minuto; perfeito pra ingestão multi-tier |
| IA briefs | **Anthropic Claude Haiku 4.5** (~R$ 5-15/mês) OU **Groq Llama 3.3 70B** (R$ 0) | Haiku custo-benefício monstro; Groq se zero literal |
| Embeddings (dedup) | **Voyage AI** (free tier) ou **Cloudflare Vectorize** | Pra deduplicar notícias por similaridade semântica |
| Hosting frontend | **Vercel Hobby** | Grátis; deploy via git push |
| Tunnel modelo local (v2) | **Cloudflare Tunnel** | Grátis; expõe FastAPI rodando no seu PC com segurança |

---

## 4. Infraestrutura zero-budget — detalhes

### Vercel Hobby (frontend)
- Grátis. Limites: 100GB bandwidth/mês, sem cron com granularidade fina.
- **Cron fica fora do Vercel** (vai pro Cloudflare).

### Supabase Free
- 500MB Postgres, 2GB bandwidth, 50k MAU (você é 1).
- Habilitar: `pgvector`, `pg_cron`, `pg_net` (pra fetch dentro do DB se quiser).
- Auth: magic link com email whitelist (só seu email).

### Cloudflare Workers Free
- 100.000 requests/dia, 10ms CPU por request.
- Cron Triggers: até 5 por worker, granularidade `* * * * *` (1 minuto).
- Workers KV grátis: 1GB storage, 100k reads/dia (cache leve).

### Decisão Groq vs Anthropic

| Tarefa | Groq (R$ 0) | Anthropic (~R$ 20/mês) |
|---|---|---|
| Brief diário (1x/dia) | Llama 3.3 70B — OK | Claude Sonnet — superior |
| Classificação de notícias (~1k/dia) | Llama 3.1 8B — bom | Claude Haiku — excelente |
| Tagging de entidades | Llama 8B — ok com prompt bom | Haiku — superior |
| Score de tom (Fed/BCB) | Llama 70B — bom | Sonnet — excelente |
| Q&A sob demanda | Llama 70B — bom | Sonnet — superior |

**Recomendação**: **começa 100% Groq**. Se em 2-3 semanas você sentir que a qualidade dos briefs tá deixando a desejar (provável pros briefs mais nuançados), upgrade Anthropic só pro brief e tagging mais sensível (~R$ 15/mês). Mantém Groq pro grosso da classificação.

---

## 5. Repo skeleton

```
macro-br/
├── app/                              # Next.js App Router
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Sidebar + topbar
│   │   ├── page.tsx                  # Home — snapshot + brief
│   │   ├── pulse/page.tsx            # Eventos pontuais
│   │   ├── mercados/page.tsx
│   │   ├── inflacao/page.tsx
│   │   ├── atividade/page.tsx
│   │   ├── trabalho/page.tsx
│   │   ├── politica-monetaria/page.tsx
│   │   ├── fiscal/page.tsx
│   │   ├── externo/page.tsx
│   │   ├── credito/page.tsx
│   │   ├── geopolitica/page.tsx
│   │   ├── noticias/page.tsx
│   │   └── briefs/page.tsx
│   ├── login/page.tsx                # Supabase magic link
│   ├── api/
│   │   ├── briefs/route.ts           # gerar brief sob demanda
│   │   └── chat/route.ts             # Q&A sobre dados
│   └── layout.tsx
├── components/
│   ├── ui/                           # shadcn components
│   ├── charts/                       # wrappers de Tremor
│   ├── series-card.tsx
│   ├── news-feed.tsx
│   ├── pulse-feed.tsx
│   └── ...
├── db/
│   ├── schema.ts                     # Drizzle schema (gerado do schema.sql)
│   ├── queries.ts
│   └── client.ts
├── lib/
│   ├── supabase/
│   ├── ai/
│   │   ├── groq.ts
│   │   ├── anthropic.ts
│   │   ├── classify.ts               # classificação de notícias
│   │   ├── brief.ts                  # geração de brief
│   │   └── tone.ts                   # score de tom (Fed + BCB via Claude)
│   ├── sources/
│   │   ├── bcb-sgs.ts                # cliente API SGS
│   │   ├── bcb-focus.ts              # Olinda/Focus
│   │   ├── ibge-sidra.ts
│   │   ├── tesouro.ts
│   │   ├── yahoo.ts
│   │   ├── rss.ts                    # parser genérico
│   │   ├── gdelt.ts
│   │   └── b3.ts
│   └── utils.ts
├── workers/                          # Cloudflare Workers
│   ├── tier1-markets/
│   │   ├── src/index.ts              # cron a cada 10 min em pregão
│   │   └── wrangler.toml
│   ├── tier2-news/
│   │   ├── src/index.ts              # cron a cada 30 min
│   │   └── wrangler.toml
│   ├── tier3-daily/
│   │   ├── src/index.ts              # cron diário 9h BR
│   │   └── wrangler.toml
│   └── tier4-events/
│       ├── src/index.ts              # event-driven (Copom etc)
│       └── wrangler.toml
├── scripts/
│   ├── seed-series.ts                # popula macro_series_meta
│   ├── backfill-bcb.ts               # baixa histórico inicial
│   └── seed-tickers.ts
├── public/
├── .env.local                        # template em .env.example
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 6. Estratégia pro modelo de tom de BCs

Seu modelo atual é FOMC (Fed). Pra ter scoring de BCB, vai precisar adaptar — re-treinar com dataset em português de comunicados/atas do BCB rotulados em hawkish-dovish. Isso é um projeto à parte.

**Plano em fases**:

**Fase 1 (v1 do dashboard — semanas 1-6)**: Score de tom **100% via Claude API** pra Fed e BCB.
- Você cria um prompt estruturado (rubrica de classificação hawkish-dovish, exemplos few-shot)
- Cada novo comunicado/ata é processado: Claude retorna score -1 (super dovish) a +1 (super hawkish) + justificativa
- Salva em `cb_communications.hawkishness_score` com `model_version = 'claude-v1-prompt'`
- Custa quase nada: ~16 eventos/ano Fed + ~24 BCB = 40 chamadas/ano. Centavos.

**Fase 2 (v2 — depois que dashboard tá no ar)**: Adaptar seu modelo FOMC pro BCB.
- Dataset: 20+ anos de atas/comunicados do BCB (públicos, parseáveis dos PDFs)
- Rotulagem: você pode usar Claude pra gerar labels iniciais (~500 documentos), depois reviewa manualmente
- Re-treina seu modelo no dataset BR
- Hospeda no seu PC com FastAPI + Cloudflare Tunnel (gratuito, seguro)
- Swap no dashboard: muda a chamada de `tone.ts` da API Claude pro seu endpoint
- `model_version = 'fomc-adapted-pt-v1'`

**Fase 3 (futuro)**: comparar os dois (Claude vs modelo treinado) lado a lado, ver qual prevê melhor reações de mercado.

A interface do dashboard fica idêntica nos 3 estágios. Só o data layer muda.

---

## 7. Cronograma 6 semanas

Cada semana assume ~12h de trabalho seu + Claude Code escrevendo.

### Semana 1 — Setup + Inflação (a aba mais importante pra começar)

**Objetivos**:
- Projeto rodando localmente
- Supabase configurado, schema aplicado
- Cliente BCB SGS funcionando
- Aba **Inflação** com IPCA mensal, IPCA 12m, núcleos, expectativas Focus, toggle 2y/5y/10y

**Steps**:
1. Inicializar repo com `npx create-next-app@latest macro-br --typescript --tailwind --app`
2. Instalar shadcn/ui (`npx shadcn@latest init`) e Tremor (`npm i @tremor/react`)
3. Criar projeto Supabase, copiar credenciais pro `.env.local`
4. Rodar `schema.sql` no Supabase SQL Editor
5. Setup Drizzle ORM apontando pro Supabase
6. Implementar `lib/sources/bcb-sgs.ts` (cliente da API SGS)
7. Implementar `lib/sources/bcb-focus.ts` (Boletim Focus via Olinda)
8. Rodar `scripts/seed-series.ts` populando `macro_series_meta` com as 45 séries
9. Rodar `scripts/backfill-bcb.ts` baixando 10 anos de histórico
10. Construir página `/inflacao` com cards de Tremor + line charts

**Prompts modelo pro Claude Code** (Semana 1):
```
Implementa o cliente da API SGS do BCB em lib/sources/bcb-sgs.ts.
Endpoint base: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json
Funções: fetchSeries(code: number, start?: Date, end?: Date) → { date, value }[]
Trata rate limit, retries com backoff exponencial, parse de data DD/MM/YYYY.
```

### Semana 2 — Atividade + Trabalho + Infra de cron

**Objetivos**:
- Páginas `/atividade` e `/trabalho` no ar
- Cloudflare Workers Tier 3 (cron diário) rodando, ingestindo todas as séries
- Backfill completo no DB

**Steps**:
1. Criar conta Cloudflare, instalar Wrangler CLI
2. Criar worker `tier3-daily` que roda 9h BR todos dias úteis, ingere todas as séries do BCB/IBGE/Tesouro com mudanças
3. Implementar `lib/sources/ibge-sidra.ts`
4. Implementar `lib/sources/tesouro.ts` (Tesouro Transparente — fiscal)
5. Páginas `/atividade` (PIB, IBC-Br, PIM, PMC, PMS) e `/trabalho` (PNAD, CAGED)
6. Componente reutilizável `<SeriesCard>` com chart, badge de variação, link pra detalhe

### Semana 3 — Política Monetária + Briefs de IA

**Objetivos**:
- Aba `/politica-monetaria` completa: Selic histórica, curva DI, NTN-B, Focus pras 8 próximas reuniões, calendário Copom
- Pipeline de score de tom via Claude funcionando
- Brief diário de IA gerado às 9h05 BR

**Steps**:
1. Worker Tier 4 (event-driven): cron checa diariamente se Copom liberou comunicado/ata novo. Se sim, baixa PDF, extrai texto, passa pro Claude pra scoring.
2. Implementar `lib/ai/tone.ts` com prompt estruturado de scoring hawkish-dovish (rubrica + few-shot)
3. Componente de timeline mostrando histórico de scores ao longo dos anos
4. Worker do brief diário (Tier 3 estendido): coleta últimas 24h de dados macro + manchetes top-relevantes + eventos geo + variações de mercado → manda pro Claude/Groq → salva em `ai_briefs`
5. Card de brief na Home

### Semana 4 — Notícias + Pulse + Geopolítica

**Objetivos**:
- Aba `/noticias` com agregador completo + classificação IA + dedup semântica
- Aba `/pulse` com eventos pontuais (earnings, ATH, volume anormal, comunicados B3)
- Aba `/geopolitica` com timeline de eventos macro-relevantes

**Steps**:
1. Criar `news_sources` com lista de RSS (~30 fontes BR + intl)
2. Worker Tier 2: cron 30 min, parseia RSS, dedup por URL hash, classifica via Groq (theme + relevance + entities + sentiment), gera embedding via Voyage, dedup semântica por cosine similarity > 0.92
3. UI de notícias: feed paginado, filtros por tema/relevância, busca, marcação de read/unread
4. Worker Pulse: monitora calendário de earnings (Yahoo Finance), calcula ATH/52w highs do `quotes_daily`, ingere comunicados CVM Empresas.NET
5. Worker Geo: ingere GDELT (events database) filtrando por relevância macro, calendário CB internacional, calendário econômico

### Semana 5 — Mercados + Fiscal + Externo + Crédito

**Objetivos**:
- Worker Tier 1 (markets near-real-time) rodando
- Aba `/mercados` completa
- Abas `/fiscal`, `/externo`, `/credito`

**Steps**:
1. Implementar `lib/sources/yahoo.ts` (yahoo-finance2 npm)
2. Worker Tier 1: cron 10 min em horário de pregão BR (9h-18h dias úteis), atualiza `quotes_latest` e `quotes_intraday` pros ~40 tickers
3. UI mercados: grid de cards por categoria (BR equity, BR rates, FX, US, commodities, risco)
4. Sparklines de 30d em cada card (Tremor `SparkAreaChart`)
5. Abas fiscal/externo/crédito reaproveitam `<SeriesCard>` da Semana 2

### Semana 6 — Polish + Mobile + Deploy

**Objetivos**:
- App responsivo (mobile decente — tu vai consultar no celular)
- Deploy em produção
- Domínio configurado

**Steps**:
1. Audit de responsividade: ajustar grid breakpoints, sidebar vira drawer no mobile
2. Dark mode tweaks (Tremor já vem dark, mas refinar acentos pra estética Bloomberg-like)
3. Adicionar página `/briefs` com histórico
4. Implementar Q&A: chat lateral que aceita pergunta tipo "como tá a inflação de serviços vs bens?" e Claude responde consultando o DB
5. Deploy Vercel via `vercel --prod`
6. Comprar domínio (Cloudflare Registrar é o mais barato — ~R$ 50/ano) — opcional, pode usar subdomínio Vercel grátis
7. Setup de monitoramento simples: tabela `job_runs` mostra status dos workers; um endpoint `/api/health` que checa se workers rodaram nas últimas 24h

---

## 8. Como dirigir o Claude Code (essencial pra você)

Você não vai escrever código. Vai escrever **prompts** pro Claude Code. Algumas regras:

### Princípios

1. **Um arquivo por vez**: não peça "crie todo o app". Peça "crie `lib/sources/bcb-sgs.ts` com X funções, tipos Y, tratando Z".
2. **Sempre dá contexto**: aponta o arquivo de schema, o tipo já existente, o estilo de código. Claude Code lê o repo, mas explicitar acelera.
3. **Test-as-you-go**: depois de cada feature, peça pro Claude Code rodar `npm run dev` e validar visualmente. Reporta o que ver.
4. **Commits pequenos**: a cada feature funcional, `git add && git commit`. Permite rollback fácil.
5. **Read the diffs**: você não precisa entender tudo, mas leia os diffs. Pergunte "por que essa linha?" quando algo parecer estranho. É como você aprende.

### Template de prompt útil

```
Contexto: estou construindo um dashboard macro BR. Schema do DB em db/schema.ts.
Stack: Next.js 15 App Router, Drizzle, Supabase, Tremor.

Tarefa: implementar a aba /inflacao em app/(dashboard)/inflacao/page.tsx.

Requisitos:
- Server Component (não Client) — buscar dados no server
- Query Drizzle: pegar séries 433 (IPCA mensal), 13522 (IPCA 12m), 27863 (núcleo EX3)
- Layout: 3 cards no topo (cada série, valor atual + variação) usando Tremor Card
- Abaixo: chart Tremor AreaChart com toggle 2y/5y/10y/all (Client Component separado)
- Tema dark, tipografia financial — fonte mono para números
- Se a série não tiver dados, mostra skeleton

Não implemente o toggle ainda — só renderiza 10y por enquanto. Vou pedir o toggle depois.
```

### Quando emperrar

- **Erro de TypeScript que não some**: cola o erro completo no chat. Claude Code costuma resolver em 1-2 iterações.
- **Layout esquisito**: tira screenshot, anexa, descreve o que queria.
- **API externa retornando coisa diferente do esperado**: peça pro Claude Code adicionar `console.log` e rodar o script de novo, depois ajustar.
- **Quando o Claude Code começa a "alucinar" mudanças que não pediu**: para tudo, rollback (`git reset`), reescreve o prompt mais específico.

---

## 9. Próximos passos pós-v1

**v2 (mês 2-3)**:
- Adaptar seu modelo FOMC pro BCB (re-treino com dataset português)
- Substituir scoring de tom Claude → modelo próprio
- Comparação histórica Claude-score vs modelo-score
- Twitter API se quiser injetar handles macro (Basic R$ 500/mês — só se justificar)
- Anomaly detection: alertas quando série macro desvia mais que 2σ do esperado
- Backtests: "como minha tese atual teria performado se aplicada em 2018?"

**v3 (mês 4+)**:
- WebSocket real-time pra markets em pregão (Supabase Realtime)
- App mobile (mesmo codebase via Capacitor ou React Native + reuso da API)
- Exportação de relatórios em PDF (tipo um "memo macro" semanal pra você levar pra reunião na InFinance)
- Integração com seu Obsidian: cada brief diário vira nota no vault automaticamente

---

## 10. Quick start (depois que você baixar os arquivos)

```bash
# 1. Cria o projeto
npx create-next-app@latest macro-br --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd macro-br

# 2. Instala dependências core
npm install @tremor/react @supabase/supabase-js drizzle-orm postgres
npm install -D drizzle-kit @types/node

# 3. shadcn/ui
npx shadcn@latest init
npx shadcn@latest add card button table tabs select badge skeleton

# 4. Cria conta no Supabase, copia URL + anon key + service role
# Cole no .env.local (template em .env.example)

# 5. No SQL Editor do Supabase, cola e roda o schema.sql

# 6. Cria conta Cloudflare (free), instala Wrangler
npm install -g wrangler
wrangler login

# 7. Roda o dev server
npm run dev

# Aí você abre o Claude Code no diretório e começa a Semana 1.
```

---

## Apêndice A: Variáveis de ambiente (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres

# AI
GROQ_API_KEY=gsk_...               # grátis, app aqui: https://console.groq.com
ANTHROPIC_API_KEY=sk-ant-...       # opcional, para upgrade de qualidade
VOYAGE_API_KEY=pa-...              # grátis, para embeddings de notícias

# Auth
NEXT_PUBLIC_ALLOWED_EMAIL=seu@email.com   # whitelist de 1 email
```

## Apêndice B: Recursos úteis

- **BCB API SGS**: https://www.bcb.gov.br/estatisticas/historicoestatisticas (catálogo de séries)
- **BCB API Olinda (Focus)**: https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/aplicacao
- **IBGE SIDRA**: https://servicodados.ibge.gov.br/api/docs
- **Tesouro Transparente**: https://www.tesourotransparente.gov.br/ckan/api/
- **Yahoo Finance (npm)**: https://github.com/gadicc/node-yahoo-finance2
- **Tremor docs**: https://tremor.so
- **shadcn/ui**: https://ui.shadcn.com
- **Drizzle docs**: https://orm.drizzle.team
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Calendário Copom**: https://www.bcb.gov.br/publicacoes/atascopom

## Apêndice C: Notas finais

- **Não tenta fazer tudo perfeito na semana 1.** O objetivo da semana 1 é ter UMA aba funcionando ponta-a-ponta. A partir dali, o resto é repetição do mesmo padrão.
- **Commit cedo, commit frequente.** Cada feature funcional vira um commit. Se o Claude Code quebrar algo, `git reset` é seu amigo.
- **Resista à tentação de adicionar features durante a construção.** Anota tudo em um `TODO.md` separado. Termina o v1 primeiro.
- **Quando v1 estiver no ar e você estiver usando diariamente**, aí decide o que vale ou não construir no v2 baseado em uso real.
