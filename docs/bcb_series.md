# Séries do BCB SGS — Top 45 pra Monitor Macro BR

Catálogo das séries macroeconômicas iniciais a popular em `macro_series_meta`.

**Endpoint base BCB SGS:**
```
https://api.bcb.gov.br/dados/serie/bcdata.sgs.{CODIGO}/dados?formato=json
https://api.bcb.gov.br/dados/serie/bcdata.sgs.{CODIGO}/dados?formato=json&dataInicial=01/01/2014&dataFinal=01/01/2026
```

**Catálogo oficial pra verificar/expandir:** https://www3.bcb.gov.br/sgspub/

> ⚠️ Os códigos abaixo são os mais usados e estáveis. Verifique cada um antes de produção via Sistema Gerenciador de Séries Temporais (link acima). Em raros casos o BCB descontinua códigos antigos e cria substitutos.

---

## 🔥 INFLAÇÃO

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 433 | IPCA — Variação mensal | mensal | % | O headline |
| 13522 | IPCA acumulado em 12 meses | mensal | % | Comparar com meta (3% + tolerância) |
| 4449 | IPCA-15 — Variação mensal | mensal | % | Prévia do IPCA |
| 7478 | IPCA-15 — Acumulado 12m | mensal | % | |
| 188 | IGP-M — Variação mensal | mensal | % | Inflação no atacado; usado em aluguéis |
| 189 | IGP-DI — Variação mensal | mensal | % | |
| 4466 | INPC — Variação mensal | mensal | % | Inflação domicílios baixa renda |
| 16121 | Núcleo IPCA — Médias aparadas com suavização | mensal | % | Núcleo preferido pelo BCB |
| 27838 | Núcleo IPCA — Médias aparadas sem suavização | mensal | % | |
| 27839 | Núcleo IPCA — Por exclusão | mensal | % | Tira monitorados + alimentos in natura |
| 11428 | Difusão do IPCA | mensal | % | % de itens com alta; mede dispersão |

---

## 🏛️ POLÍTICA MONETÁRIA

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 432 | Meta Taxa Selic | irregular | % a.a. | Mudanças nas reuniões do Copom |
| 12 | Taxa Selic diária | diária | % a.a. | Selic efetiva diária |
| 1178 | Selic anualizada base 252 | diária | % a.a. | |
| 4189 | Selic acumulada no mês | mensal | % | |
| 7806 | DI over | diária | % a.a. | Taxa interbancária |

---

## 💵 CÂMBIO

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 1 | USD/BRL — PTAX compra | diária | R$/US$ | Taxa oficial BCB |
| 10813 | USD/BRL — PTAX venda | diária | R$/US$ | |
| 21619 | EUR/BRL — PTAX compra | diária | R$/€ | |
| 21620 | EUR/BRL — PTAX venda | diária | R$/€ | |

---

## 📈 ATIVIDADE ECONÔMICA

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 24364 | IBC-Br — Índice (com ajuste sazonal) | mensal | índice | Proxy mensal do PIB |
| 24363 | IBC-Br — Sem ajuste sazonal | mensal | índice | |
| 21859 | Produção industrial geral — IBGE | mensal | índice | Via SGS, dado original do IBGE |
| 28503 | PIB — Acumulado em 4 trimestres | trimestral | R$ milhões | |
| 22099 | Confiança do consumidor — FGV | mensal | pontos | |
| 22023 | Confiança da indústria — FGV | mensal | pontos | |

> **Para PIB detalhado, PNAD, PIM/PMC/PMS use IBGE SIDRA direto** — APIs em `https://servicodados.ibge.gov.br/api/docs/agregados`. SGS espelha alguns dados do IBGE com lag.

---

## 👥 MERCADO DE TRABALHO

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 24369 | Taxa de desocupação — PNAD Contínua | mensal | % | Headline desemprego |
| 24380 | Rendimento médio real habitual | mensal | R$ | Renda real do trabalho |
| 28763 | Massa salarial real ampliada | mensal | R$ milhões | Massa de rendimento |

> **CAGED (saldo de empregos formais)** não tem código SGS direto. Puxa do **Ministério do Trabalho via API**: `http://pdet.mte.gov.br/`.

---

## 🏦 FISCAL

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 4513 | DLSP — Dívida Líquida Setor Público (% PIB) | mensal | % do PIB | |
| 13762 | DBGG — Dívida Bruta Governo Geral (% PIB) | mensal | % do PIB | A métrica que o mercado olha mais |
| 5727 | Resultado primário governo central | mensal | R$ milhões | |
| 5793 | Resultado primário setor público consolidado | mensal | R$ milhões | Inclui estados e municípios |
| 4649 | Necessidade financiamento setor público | mensal | R$ milhões | NFSP nominal |

---

## 💳 CRÉDITO

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 20631 | Saldo total das operações de crédito | mensal | R$ milhões | |
| 20622 | Saldo crédito PF | mensal | R$ milhões | |
| 20623 | Saldo crédito PJ | mensal | R$ milhões | |
| 21082 | Inadimplência total (acima 90 dias) | mensal | % | |
| 21084 | Inadimplência PF | mensal | % | |
| 21086 | Inadimplência PJ | mensal | % | |
| 20786 | Spread médio das operações de crédito | mensal | p.p. | |
| 20402 | Endividamento das famílias (% renda 12m) | mensal | % | |
| 19882 | Comprometimento de renda das famílias | mensal | % | |

---

## 🌍 SETOR EXTERNO

| Código | Indicador | Frequência | Unidade | Notas |
|--------|-----------|------------|---------|-------|
| 22707 | Balanço de Pagamentos — Transações correntes | mensal | US$ milhões | |
| 22701 | Balança comercial — Saldo | mensal | US$ milhões | |
| 22689 | Investimento direto no país (IDP) | mensal | US$ milhões | |
| 3546 | Reservas internacionais — Total | diária | US$ milhões | |
| 11752 | Risco-Brasil — EMBI+ (J.P. Morgan) | diária | pontos-base | Sem SGS direto; vale usar fonte externa |

> **EMBI+** pode não estar em SGS — alternativas: scraper Tesouro, manual import. Confirmar disponibilidade.

---

## 📊 EXPECTATIVAS (FOCUS) — Use API Olinda separadamente

Não passa pelo SGS. Endpoint dedicado:

```
https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$format=json
https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoTrimestrais?$format=json
```

**Indicadores cobertos pela Focus**:
- IPCA (anual e mensal próximos 12-18 meses)
- Selic (ao final de cada ano + ao final do exercício corrente)
- PIB (anual)
- Câmbio (anual e fim de ano)
- IGP-M
- Conta corrente (% PIB)
- Resultado primário (% PIB)
- Dívida líquida (% PIB)

Esses dados vão na tabela `focus_expectations`, com refresh diário às 9h via cron Tier 3.

---

## Resumo — Total de séries iniciais

| Área | # Séries |
|------|----------|
| Inflação | 11 |
| Política Monetária | 5 |
| Câmbio | 4 |
| Atividade | 6 |
| Trabalho | 3 |
| Fiscal | 5 |
| Crédito | 9 |
| Setor Externo | 5 |
| **Subtotal SGS** | **48** |
| Expectativas (Focus, fora SGS) | ~8 indicadores × N períodos |

---

## Script de seed (referência rápida)

Estrutura sugerida pro `scripts/seed-series.ts`:

```typescript
import { db } from '@/db/client';
import { macroSeriesMeta } from '@/db/schema';

const series = [
  // Inflação
  { source: 'BCB_SGS', source_code: '433', name: 'IPCA - Variação mensal', unit: '%', frequency: 'monthly', area: 'inflation' },
  { source: 'BCB_SGS', source_code: '13522', name: 'IPCA acumulado 12 meses', unit: '%', frequency: 'monthly', area: 'inflation' },
  // ... resto das séries acima
];

await db.insert(macroSeriesMeta).values(series).onConflictDoNothing();
```

## Notas finais sobre uso

- **Backfill inicial**: baixe ~10 anos pra séries mensais (custa pouco) e ~5 anos pra diárias (USD/BRL etc.)
- **Rate limit BCB**: ~10 req/segundo sem auth. Use `p-limit` ou similar.
- **Datas BCB vêm em DD/MM/YYYY** — sempre parsear com cuidado.
- **Valores vêm como string** — converter pra `Number` antes de inserir.
- **Algumas séries têm gaps históricos** — não assuma série contínua.
- **Para séries com revisão (PIB, IBC-Br)**: sempre re-puxa últimos 12 meses no cron diário, faz UPSERT.

