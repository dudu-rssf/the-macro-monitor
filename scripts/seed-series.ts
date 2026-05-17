import 'dotenv/config'
import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'

const series = [
  // Inflacao
  { source: 'BCB_SGS', sourceCode: '433',   name: 'IPCA - Variacao mensal',                     unit: '%',          frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '13522', name: 'IPCA acumulado 12 meses',                    unit: '%',          frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '4449',  name: 'IPCA-15 - Variacao mensal',                  unit: '%',          frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '7478',  name: 'IPCA-15 - Acumulado 12m',                    unit: '%',          frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '188',   name: 'IGP-M - Variacao mensal',                    unit: '%',          frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '189',   name: 'IGP-DI - Variacao mensal',                   unit: '%',          frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '4466',  name: 'INPC - Variacao mensal',                     unit: '%',          frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '16121', name: 'Nucleo IPCA - Medias aparadas com suavizacao', unit: '%',        frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '27838', name: 'Nucleo IPCA - Medias aparadas sem suavizacao', unit: '%',        frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '27839', name: 'Nucleo IPCA - Por exclusao',                  unit: '%',         frequency: 'monthly',   area: 'inflation' },
  { source: 'BCB_SGS', sourceCode: '11428', name: 'Difusao do IPCA',                            unit: '%',          frequency: 'monthly',   area: 'inflation' },
  // Politica Monetaria
  { source: 'BCB_SGS', sourceCode: '432',   name: 'Meta Taxa Selic',                            unit: '% a.a.',     frequency: 'irregular', area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '12',    name: 'Taxa Selic diaria',                          unit: '% a.a.',     frequency: 'daily',     area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '1178',  name: 'Selic anualizada base 252',                  unit: '% a.a.',     frequency: 'daily',     area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '4189',  name: 'Selic acumulada no mes',                     unit: '%',          frequency: 'monthly',   area: 'monetary' },
  { source: 'BCB_SGS', sourceCode: '7806',  name: 'DI over',                                    unit: '% a.a.',     frequency: 'daily',     area: 'monetary' },
  // Cambio
  { source: 'BCB_SGS', sourceCode: '1',     name: 'USD/BRL - PTAX compra',                      unit: 'R$/US$',     frequency: 'daily',     area: 'fx' },
  { source: 'BCB_SGS', sourceCode: '10813', name: 'USD/BRL - PTAX venda',                       unit: 'R$/US$',     frequency: 'daily',     area: 'fx' },
  { source: 'BCB_SGS', sourceCode: '21619', name: 'EUR/BRL - PTAX compra',                      unit: 'R$/EUR',     frequency: 'daily',     area: 'fx' },
  { source: 'BCB_SGS', sourceCode: '21620', name: 'EUR/BRL - PTAX venda',                       unit: 'R$/EUR',     frequency: 'daily',     area: 'fx' },
  // Atividade
  { source: 'BCB_SGS', sourceCode: '24364', name: 'IBC-Br - Com ajuste sazonal',                unit: 'indice',     frequency: 'monthly',   area: 'activity' },
  { source: 'BCB_SGS', sourceCode: '24363', name: 'IBC-Br - Sem ajuste sazonal',                unit: 'indice',     frequency: 'monthly',   area: 'activity' },
  { source: 'BCB_SGS', sourceCode: '21859', name: 'Producao industrial geral - IBGE',           unit: 'indice',     frequency: 'monthly',   area: 'activity' },
  { source: 'BCB_SGS', sourceCode: '28503', name: 'PIB - Acumulado em 4 trimestres',            unit: 'R$ milhoes', frequency: 'quarterly', area: 'activity' },
  { source: 'BCB_SGS', sourceCode: '22099', name: 'Confianca do consumidor - FGV',              unit: 'pontos',     frequency: 'monthly',   area: 'activity' },
  { source: 'BCB_SGS', sourceCode: '22023', name: 'Confianca da industria - FGV',               unit: 'pontos',     frequency: 'monthly',   area: 'activity' },
  // Trabalho
  { source: 'BCB_SGS', sourceCode: '24369', name: 'Taxa de desocupacao - PNAD Continua',        unit: '%',          frequency: 'monthly',   area: 'labor' },
  { source: 'BCB_SGS', sourceCode: '24380', name: 'Rendimento medio real habitual',             unit: 'R$',         frequency: 'monthly',   area: 'labor' },
  { source: 'BCB_SGS', sourceCode: '28763', name: 'Massa salarial real ampliada',               unit: 'R$ milhoes', frequency: 'monthly',   area: 'labor' },
  // Fiscal
  { source: 'BCB_SGS', sourceCode: '4513',  name: 'DLSP - Divida Liquida Setor Publico (%PIB)', unit: '% do PIB',   frequency: 'monthly',   area: 'fiscal' },
  { source: 'BCB_SGS', sourceCode: '13762', name: 'DBGG - Divida Bruta Governo Geral (%PIB)',   unit: '% do PIB',   frequency: 'monthly',   area: 'fiscal' },
  { source: 'BCB_SGS', sourceCode: '5727',  name: 'Resultado primario governo central',         unit: 'R$ milhoes', frequency: 'monthly',   area: 'fiscal' },
  { source: 'BCB_SGS', sourceCode: '5793',  name: 'Resultado primario setor publico consolidado', unit: 'R$ milhoes', frequency: 'monthly', area: 'fiscal' },
  { source: 'BCB_SGS', sourceCode: '4649',  name: 'Necessidade de financiamento setor publico', unit: 'R$ milhoes', frequency: 'monthly',   area: 'fiscal' },
  // Credito
  { source: 'BCB_SGS', sourceCode: '20631', name: 'Saldo total operacoes de credito',           unit: 'R$ milhoes', frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '20622', name: 'Saldo credito PF',                           unit: 'R$ milhoes', frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '20623', name: 'Saldo credito PJ',                           unit: 'R$ milhoes', frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '21082', name: 'Inadimplencia total (acima 90 dias)',         unit: '%',          frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '21084', name: 'Inadimplencia PF',                           unit: '%',          frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '21086', name: 'Inadimplencia PJ',                           unit: '%',          frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '20786', name: 'Spread medio operacoes de credito',          unit: 'p.p.',       frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '20402', name: 'Endividamento das familias (%renda 12m)',    unit: '%',          frequency: 'monthly',   area: 'credit' },
  { source: 'BCB_SGS', sourceCode: '19882', name: 'Comprometimento de renda das familias',      unit: '%',          frequency: 'monthly',   area: 'credit' },
  // Setor Externo
  { source: 'BCB_SGS', sourceCode: '22707', name: 'Balanco de Pagamentos - Transacoes correntes', unit: 'US$ milhoes', frequency: 'monthly', area: 'external' },
  { source: 'BCB_SGS', sourceCode: '22701', name: 'Balanca comercial - Saldo',                  unit: 'US$ milhoes', frequency: 'monthly',  area: 'external' },
  { source: 'BCB_SGS', sourceCode: '22689', name: 'Investimento direto no pais (IDP)',          unit: 'US$ milhoes', frequency: 'monthly',  area: 'external' },
  { source: 'BCB_SGS', sourceCode: '3546',  name: 'Reservas internacionais - Total',            unit: 'US$ milhoes', frequency: 'daily',    area: 'external' },
  { source: 'BCB_SGS', sourceCode: '11752', name: 'Risco-Brasil - EMBI+ JP Morgan',             unit: 'pontos-base', frequency: 'daily',    area: 'external' },
]

async function main() {
  console.log(`Inserindo ${series.length} series em macro_series_meta...`)

  const result = await db
    .insert(macroSeriesMeta)
    .values(series)
    .onConflictDoNothing()

  console.log('Seed concluido.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Erro no seed:', err)
  process.exit(1)
})
