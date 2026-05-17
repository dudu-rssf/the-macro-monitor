import { NextResponse } from 'next/server'
import { getSeriesLatestTwo } from '@/db/queries'

export const revalidate = 900
export const dynamic = 'force-dynamic'

export type EventCategory =
  | 'inflacao' | 'atividade' | 'trabalho'
  | 'politica-monetaria' | 'fiscal' | 'externo' | 'credito'

export interface EnrichedEvent {
  date: string
  name: string
  detail: string
  category: EventCategory
  confirmed: boolean
  unit: string
  decimals: number
  actual: number | null      // valor real do DB (quando já divulgado)
  actualDate: string | null  // data de referência do dado no DB
  expected: number | null    // expectativa BCB Focus (quando disponível)
}

interface RawEvent {
  date: string
  name: string
  detail: string
  category: EventCategory
  confirmed?: boolean
  seriesCode?: string
  focusKey?: 'ipca' | 'igpm'
  focusRef?: string    // "MM/YYYY" para Focus mensal
  unit?: string
  decimals?: number
}

// ─── Calendário completo de divulgações 2026 ─────────────────────────────────
// Fontes: BCB, IBGE, STN — datas sem confirmed=true são estimadas
const EVENTS: RawEvent[] = [
  // ── Maio 2026 ──────────────────────────────────────────────────────────────
  { date: '2026-05-08', name: 'IPCA',                    detail: 'ref. abr/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '04/2026', unit: '%',      decimals: 2, confirmed: true  },
  { date: '2026-05-08', name: 'INPC',                    detail: 'ref. abr/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2, confirmed: true  },
  { date: '2026-05-08', name: 'Núcleos IPCA',            detail: 'ref. abr/2026',  category: 'inflacao',           seriesCode: '16121', unit: '%',      decimals: 2, confirmed: true  },
  { date: '2026-05-14', name: 'IBC-Br',                  detail: 'ref. mar/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-05-21', name: 'IPCA-15',                 detail: 'ref. mai/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '05/2026', unit: '%', decimals: 2 },
  { date: '2026-05-22', name: 'CAGED',                   detail: 'ref. abr/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-05-22', name: 'PNAD Contínua',           detail: 'ref. mar/2026',  category: 'trabalho',           seriesCode: '24369', unit: '%',      decimals: 1 },
  { date: '2026-05-26', name: 'Resultado Primário',      detail: 'ref. abr/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-05-26', name: 'DLSP / DBGG',             detail: 'ref. mar/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },
  { date: '2026-05-26', name: 'Reservas Internacionais', detail: 'ref. abr/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-05-28', name: 'Balanço de Pagamentos',   detail: 'ref. abr/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-05-29', name: 'Nota de Crédito BCB',     detail: 'ref. abr/2026',  category: 'credito',            seriesCode: '21082', unit: '%',      decimals: 2 },
  { date: '2026-05-29', name: 'IGP-M',                   detail: 'ref. mai/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '05/2026', unit: '%', decimals: 2 },

  // ── Junho 2026 ─────────────────────────────────────────────────────────────
  { date: '2026-06-10', name: 'IPCA',                    detail: 'ref. mai/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '05/2026', unit: '%', decimals: 2 },
  { date: '2026-06-10', name: 'INPC',                    detail: 'ref. mai/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2 },
  { date: '2026-06-10', name: 'Núcleos IPCA',            detail: 'ref. mai/2026',  category: 'inflacao',           seriesCode: '16121', unit: '%',      decimals: 2 },
  { date: '2026-06-11', name: 'IBC-Br',                  detail: 'ref. abr/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-06-11', name: 'IGP-DI',                  detail: 'ref. mai/2026',  category: 'inflacao',           seriesCode: '189',   unit: '%',      decimals: 2 },
  { date: '2026-06-16', name: 'COPOM — Decisão Selic',   detail: 'reunião 120ª',   category: 'politica-monetaria', seriesCode: '1178',  unit: '% a.a.', decimals: 2, confirmed: true  },
  { date: '2026-06-18', name: 'PNAD Contínua',           detail: 'T1 2026',        category: 'trabalho',           seriesCode: '24369', unit: '%',      decimals: 1 },
  { date: '2026-06-18', name: 'PIB',                     detail: 'T1 2026',        category: 'atividade',          unit: '%',      decimals: 1, confirmed: true  },
  { date: '2026-06-19', name: 'Reservas Internacionais', detail: 'ref. mai/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-06-23', name: 'IPCA-15',                 detail: 'ref. jun/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '06/2026', unit: '%', decimals: 2 },
  { date: '2026-06-24', name: 'CAGED',                   detail: 'ref. mai/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-06-25', name: 'Resultado Primário',      detail: 'ref. mai/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-06-25', name: 'DLSP / DBGG',             detail: 'ref. abr/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },
  { date: '2026-06-26', name: 'Balanço de Pagamentos',   detail: 'ref. mai/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-06-26', name: 'Nota de Crédito BCB',     detail: 'ref. mai/2026',  category: 'credito',            seriesCode: '21082', unit: '%',      decimals: 2 },
  { date: '2026-06-30', name: 'IGP-M',                   detail: 'ref. jun/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '06/2026', unit: '%', decimals: 2 },

  // ── Julho 2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-09', name: 'IPCA',                    detail: 'ref. jun/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '06/2026', unit: '%', decimals: 2 },
  { date: '2026-07-09', name: 'INPC',                    detail: 'ref. jun/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2 },
  { date: '2026-07-09', name: 'Núcleos IPCA',            detail: 'ref. jun/2026',  category: 'inflacao',           seriesCode: '16121', unit: '%',      decimals: 2 },
  { date: '2026-07-10', name: 'IGP-DI',                  detail: 'ref. jun/2026',  category: 'inflacao',           seriesCode: '189',   unit: '%',      decimals: 2 },
  { date: '2026-07-14', name: 'IBC-Br',                  detail: 'ref. mai/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-07-21', name: 'Reservas Internacionais', detail: 'ref. jun/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-07-23', name: 'IPCA-15',                 detail: 'ref. jul/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '07/2026', unit: '%', decimals: 2 },
  { date: '2026-07-24', name: 'CAGED',                   detail: 'ref. jun/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-07-28', name: 'COPOM — Decisão Selic',   detail: 'reunião 121ª',   category: 'politica-monetaria', seriesCode: '1178',  unit: '% a.a.', decimals: 2, confirmed: true  },
  { date: '2026-07-29', name: 'Resultado Primário',      detail: 'ref. jun/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-07-29', name: 'DLSP / DBGG',             detail: 'ref. mai/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },
  { date: '2026-07-30', name: 'Balanço de Pagamentos',   detail: 'ref. jun/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-07-30', name: 'Nota de Crédito BCB',     detail: 'ref. jun/2026',  category: 'credito',            seriesCode: '21082', unit: '%',      decimals: 2 },
  { date: '2026-07-31', name: 'IGP-M',                   detail: 'ref. jul/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '07/2026', unit: '%', decimals: 2 },
  { date: '2026-07-31', name: 'PNAD Contínua',           detail: 'T2 2026',        category: 'trabalho',           seriesCode: '24369', unit: '%',      decimals: 1 },

  // ── Agosto 2026 ────────────────────────────────────────────────────────────
  { date: '2026-08-13', name: 'IPCA',                    detail: 'ref. jul/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '07/2026', unit: '%', decimals: 2 },
  { date: '2026-08-13', name: 'INPC',                    detail: 'ref. jul/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2 },
  { date: '2026-08-13', name: 'Núcleos IPCA',            detail: 'ref. jul/2026',  category: 'inflacao',           seriesCode: '16121', unit: '%',      decimals: 2 },
  { date: '2026-08-13', name: 'IBC-Br',                  detail: 'ref. jun/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-08-14', name: 'IGP-DI',                  detail: 'ref. jul/2026',  category: 'inflacao',           seriesCode: '189',   unit: '%',      decimals: 2 },
  { date: '2026-08-19', name: 'Reservas Internacionais', detail: 'ref. jul/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-08-20', name: 'PNAD Contínua',           detail: 'ref. jun/2026',  category: 'trabalho',           seriesCode: '24369', unit: '%',      decimals: 1 },
  { date: '2026-08-21', name: 'IPCA-15',                 detail: 'ref. ago/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '08/2026', unit: '%', decimals: 2 },
  { date: '2026-08-25', name: 'CAGED',                   detail: 'ref. jul/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-08-27', name: 'Resultado Primário',      detail: 'ref. jul/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-08-27', name: 'DLSP / DBGG',             detail: 'ref. jun/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },
  { date: '2026-08-28', name: 'Balanço de Pagamentos',   detail: 'ref. jul/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-08-28', name: 'Nota de Crédito BCB',     detail: 'ref. jul/2026',  category: 'credito',            seriesCode: '21082', unit: '%',      decimals: 2 },
  { date: '2026-08-31', name: 'IGP-M',                   detail: 'ref. ago/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '08/2026', unit: '%', decimals: 2 },

  // ── Setembro 2026 ──────────────────────────────────────────────────────────
  { date: '2026-09-10', name: 'IPCA',                    detail: 'ref. ago/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '08/2026', unit: '%', decimals: 2 },
  { date: '2026-09-10', name: 'INPC',                    detail: 'ref. ago/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2 },
  { date: '2026-09-10', name: 'Núcleos IPCA',            detail: 'ref. ago/2026',  category: 'inflacao',           seriesCode: '16121', unit: '%',      decimals: 2 },
  { date: '2026-09-11', name: 'IGP-DI',                  detail: 'ref. ago/2026',  category: 'inflacao',           seriesCode: '189',   unit: '%',      decimals: 2 },
  { date: '2026-09-15', name: 'IBC-Br',                  detail: 'ref. jul/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-09-15', name: 'COPOM — Decisão Selic',   detail: 'reunião 122ª',   category: 'politica-monetaria', seriesCode: '1178',  unit: '% a.a.', decimals: 2, confirmed: true  },
  { date: '2026-09-18', name: 'Reservas Internacionais', detail: 'ref. ago/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-09-22', name: 'IPCA-15',                 detail: 'ref. set/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '09/2026', unit: '%', decimals: 2 },
  { date: '2026-09-24', name: 'CAGED',                   detail: 'ref. ago/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-09-25', name: 'PIB',                     detail: 'T2 2026',        category: 'atividade',          unit: '%',      decimals: 1 },
  { date: '2026-09-25', name: 'PNAD Contínua',           detail: 'ref. ago/2026',  category: 'trabalho',           seriesCode: '24369', unit: '%',      decimals: 1 },
  { date: '2026-09-25', name: 'Balanço de Pagamentos',   detail: 'ref. ago/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-09-25', name: 'Nota de Crédito BCB',     detail: 'ref. ago/2026',  category: 'credito',            seriesCode: '21082', unit: '%',      decimals: 2 },
  { date: '2026-09-30', name: 'IGP-M',                   detail: 'ref. set/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '09/2026', unit: '%', decimals: 2 },
  { date: '2026-09-30', name: 'Resultado Primário',      detail: 'ref. ago/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-09-30', name: 'DLSP / DBGG',             detail: 'ref. jul/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },

  // ── Outubro 2026 ───────────────────────────────────────────────────────────
  { date: '2026-10-08', name: 'IPCA',                    detail: 'ref. set/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '09/2026', unit: '%', decimals: 2 },
  { date: '2026-10-08', name: 'INPC',                    detail: 'ref. set/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2 },
  { date: '2026-10-08', name: 'Núcleos IPCA',            detail: 'ref. set/2026',  category: 'inflacao',           seriesCode: '16121', unit: '%',      decimals: 2 },
  { date: '2026-10-09', name: 'IGP-DI',                  detail: 'ref. set/2026',  category: 'inflacao',           seriesCode: '189',   unit: '%',      decimals: 2 },
  { date: '2026-10-14', name: 'IBC-Br',                  detail: 'ref. ago/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-10-20', name: 'Reservas Internacionais', detail: 'ref. set/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-10-22', name: 'CAGED',                   detail: 'ref. set/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-10-22', name: 'IPCA-15',                 detail: 'ref. out/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '10/2026', unit: '%', decimals: 2 },
  { date: '2026-10-27', name: 'PNAD Contínua',           detail: 'T3 2026',        category: 'trabalho',           seriesCode: '24369', unit: '%',      decimals: 1 },
  { date: '2026-10-29', name: 'Resultado Primário',      detail: 'ref. set/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-10-29', name: 'DLSP / DBGG',             detail: 'ref. ago/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },
  { date: '2026-10-29', name: 'Balanço de Pagamentos',   detail: 'ref. set/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-10-29', name: 'Nota de Crédito BCB',     detail: 'ref. set/2026',  category: 'credito',            seriesCode: '21082', unit: '%',      decimals: 2 },
  { date: '2026-10-30', name: 'IGP-M',                   detail: 'ref. out/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '10/2026', unit: '%', decimals: 2 },

  // ── Novembro 2026 ──────────────────────────────────────────────────────────
  { date: '2026-11-04', name: 'COPOM — Decisão Selic',   detail: 'reunião 123ª',   category: 'politica-monetaria', seriesCode: '1178',  unit: '% a.a.', decimals: 2, confirmed: true  },
  { date: '2026-11-12', name: 'IPCA',                    detail: 'ref. out/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '10/2026', unit: '%', decimals: 2 },
  { date: '2026-11-12', name: 'INPC',                    detail: 'ref. out/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2 },
  { date: '2026-11-12', name: 'Núcleos IPCA',            detail: 'ref. out/2026',  category: 'inflacao',           seriesCode: '16121', unit: '%',      decimals: 2 },
  { date: '2026-11-13', name: 'IGP-DI',                  detail: 'ref. out/2026',  category: 'inflacao',           seriesCode: '189',   unit: '%',      decimals: 2 },
  { date: '2026-11-18', name: 'IBC-Br',                  detail: 'ref. set/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-11-19', name: 'Reservas Internacionais', detail: 'ref. out/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-11-20', name: 'IPCA-15',                 detail: 'ref. nov/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '11/2026', unit: '%', decimals: 2 },
  { date: '2026-11-25', name: 'CAGED',                   detail: 'ref. out/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-11-26', name: 'Resultado Primário',      detail: 'ref. out/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-11-26', name: 'DLSP / DBGG',             detail: 'ref. set/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },
  { date: '2026-11-26', name: 'Balanço de Pagamentos',   detail: 'ref. out/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-11-27', name: 'Nota de Crédito BCB',     detail: 'ref. out/2026',  category: 'credito',            seriesCode: '21082', unit: '%',      decimals: 2 },
  { date: '2026-11-30', name: 'IGP-M',                   detail: 'ref. nov/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '11/2026', unit: '%', decimals: 2 },

  // ── Dezembro 2026 ──────────────────────────────────────────────────────────
  { date: '2026-12-09', name: 'IPCA',                    detail: 'ref. nov/2026',  category: 'inflacao',           seriesCode: '433',   focusKey: 'ipca', focusRef: '11/2026', unit: '%', decimals: 2 },
  { date: '2026-12-09', name: 'INPC',                    detail: 'ref. nov/2026',  category: 'inflacao',           seriesCode: '4466',  unit: '%',      decimals: 2 },
  { date: '2026-12-09', name: 'COPOM — Decisão Selic',   detail: 'reunião 124ª',   category: 'politica-monetaria', seriesCode: '1178',  unit: '% a.a.', decimals: 2, confirmed: true  },
  { date: '2026-12-10', name: 'IBC-Br',                  detail: 'ref. out/2026',  category: 'atividade',          seriesCode: '22065', unit: '%',      decimals: 2 },
  { date: '2026-12-16', name: 'PIB',                     detail: 'T3 2026',        category: 'atividade',          unit: '%',      decimals: 1 },
  { date: '2026-12-18', name: 'IPCA-15',                 detail: 'ref. dez/2026',  category: 'inflacao',           seriesCode: '4449',  focusKey: 'ipca', focusRef: '12/2026', unit: '%', decimals: 2 },
  { date: '2026-12-18', name: 'Reservas Internacionais', detail: 'ref. nov/2026',  category: 'externo',            seriesCode: '3546',  unit: 'US$ mi', decimals: 0 },
  { date: '2026-12-22', name: 'CAGED',                   detail: 'ref. nov/2026',  category: 'trabalho',           unit: 'k postos', decimals: 0 },
  { date: '2026-12-22', name: 'PNAD Contínua',           detail: 'T4 2026',        category: 'trabalho',           seriesCode: '24369', unit: '%',      decimals: 1 },
  { date: '2026-12-23', name: 'Resultado Primário',      detail: 'ref. nov/2026',  category: 'fiscal',             seriesCode: '5788',  unit: '% PIB',  decimals: 2 },
  { date: '2026-12-23', name: 'DLSP / DBGG',             detail: 'ref. out/2026',  category: 'fiscal',             seriesCode: '4513',  unit: '% PIB',  decimals: 1 },
  { date: '2026-12-29', name: 'Balanço de Pagamentos',   detail: 'ref. nov/2026',  category: 'externo',            seriesCode: '22701', unit: 'US$ mi', decimals: 0 },
  { date: '2026-12-30', name: 'IGP-M',                   detail: 'ref. dez/2026',  category: 'inflacao',           seriesCode: '188',   focusKey: 'igpm', focusRef: '12/2026', unit: '%', decimals: 2 },
]

// ─── BCB Focus API ────────────────────────────────────────────────────────────
const FOCUS_BASE = 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata'

async function fetchFocus(): Promise<{
  ipca:  Record<string, number>   // "MM/YYYY" → mediana
  igpm:  Record<string, number>
  selic: number | null            // expectativa mais recente próxima reunião
}> {
  const [ipcaR, igpmR, selicR] = await Promise.allSettled([
    fetch(`${FOCUS_BASE}/ExpectativaMercadoMensais?%24filter=Indicador%20eq%20%27IPCA%27%20and%20baseCalculo%20eq%200&%24top=60&%24format=application%2Fjson%3Bcharset%3Dutf-8&%24orderby=Data%20desc&%24select=DataReferencia%2CMediana`, { signal: AbortSignal.timeout(8_000) }),
    fetch(`${FOCUS_BASE}/ExpectativaMercadoMensais?%24filter=Indicador%20eq%20%27IGP-M%27%20and%20baseCalculo%20eq%200&%24top=60&%24format=application%2Fjson%3Bcharset%3Dutf-8&%24orderby=Data%20desc&%24select=DataReferencia%2CMediana`, { signal: AbortSignal.timeout(8_000) }),
    fetch(`${FOCUS_BASE}/ExpectativaMercadoSelic?%24top=10&%24format=application%2Fjson%3Bcharset%3Dutf-8&%24orderby=Data%20desc&%24select=Reuniao%2CMediana`, { signal: AbortSignal.timeout(8_000) }),
  ])

  const ipca:  Record<string, number> = {}
  const igpm:  Record<string, number> = {}
  let   selic: number | null = null

  if (ipcaR.status === 'fulfilled' && ipcaR.value.ok) {
    const d = await ipcaR.value.json() as { value: { DataReferencia: string; Mediana: number }[] }
    for (const row of d.value) if (!ipca[row.DataReferencia]) ipca[row.DataReferencia] = row.Mediana
  }
  if (igpmR.status === 'fulfilled' && igpmR.value.ok) {
    const d = await igpmR.value.json() as { value: { DataReferencia: string; Mediana: number }[] }
    for (const row of d.value) if (!igpm[row.DataReferencia]) igpm[row.DataReferencia] = row.Mediana
  }
  if (selicR.status === 'fulfilled' && selicR.value.ok) {
    const d = await selicR.value.json() as { value: { Reuniao: string; Mediana: number }[] }
    selic = d.value[0]?.Mediana ?? null
  }

  return { ipca, igpm, selic }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET() {
  // Unique series codes to query
  const codes = [...new Set(EVENTS.map(e => e.seriesCode).filter(Boolean))] as string[]

  const [dbResults, focus] = await Promise.all([
    Promise.all(codes.map(c => getSeriesLatestTwo(c).catch(() => null))),
    fetchFocus().catch(() => ({ ipca: {}, igpm: {}, selic: null })),
  ])

  // Map: seriesCode → { value, date }
  const latestByCode = new Map<string, { value: number; date: string }>()
  codes.forEach((code, i) => {
    const r = dbResults[i]
    if (r?.latest) latestByCode.set(code, { value: r.latest.value, date: r.latest.date })
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const enriched: EnrichedEvent[] = EVENTS.map(ev => {
    const isPast = ev.date <= todayStr
    const db     = ev.seriesCode ? latestByCode.get(ev.seriesCode) : undefined

    // Actual value: show only when event date has passed (data should be in DB)
    let actual: number | null = null
    let actualDate: string | null = null
    if (isPast && db) {
      actual     = db.value
      actualDate = db.date
    }

    // Expected from Focus
    let expected: number | null = null
    if (!isPast) {
      if (ev.focusKey === 'ipca' && ev.focusRef) expected = focus.ipca[ev.focusRef] ?? null
      if (ev.focusKey === 'igpm' && ev.focusRef) expected = focus.igpm[ev.focusRef] ?? null
      if (ev.category === 'politica-monetaria')   expected = focus.selic
    }

    return {
      date:      ev.date,
      name:      ev.name,
      detail:    ev.detail,
      category:  ev.category,
      confirmed: ev.confirmed ?? false,
      unit:      ev.unit      ?? '%',
      decimals:  ev.decimals  ?? 2,
      actual,
      actualDate,
      expected,
    }
  })

  const sorted = enriched.sort((a, b) => a.date.localeCompare(b.date))
  return NextResponse.json(sorted)
}
