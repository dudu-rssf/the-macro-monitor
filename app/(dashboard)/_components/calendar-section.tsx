'use client'

import { useMemo, useState, useEffect } from 'react'

type EventCategory =
  | 'inflacao'
  | 'atividade'
  | 'trabalho'
  | 'politica-monetaria'
  | 'fiscal'
  | 'externo'
  | 'credito'

interface CalEvent {
  date: string        // YYYY-MM-DD
  name: string
  detail: string
  category: EventCategory
  confirmed?: boolean // false = estimado
}

const CATEGORY_STYLE: Record<EventCategory, string> = {
  'inflacao':           'bg-orange-500/15 text-orange-400',
  'atividade':          'bg-blue-500/15 text-blue-400',
  'trabalho':           'bg-violet-500/15 text-violet-400',
  'politica-monetaria': 'bg-rose-500/15 text-rose-400',
  'fiscal':             'bg-yellow-500/15 text-yellow-400',
  'externo':            'bg-teal-500/15 text-teal-400',
  'credito':            'bg-emerald-500/15 text-emerald-400',
}

const CATEGORY_LABEL: Record<EventCategory, string> = {
  'inflacao':           'Inflação',
  'atividade':          'Atividade',
  'trabalho':           'Trabalho',
  'politica-monetaria': 'Pol. Monetária',
  'fiscal':             'Fiscal',
  'externo':            'Externo',
  'credito':            'Crédito',
}

// Calendário 2026 — fontes: BCB, IBGE, STN
// Datas marcadas como confirmed=false são estimadas com base no histórico de divulgação
const EVENTS: CalEvent[] = [
  // ── Maio 2026 ──────────────────────────────────────────────────────────────
  { date: '2026-05-08', name: 'IPCA',                  detail: 'ref. abr/2026',  category: 'inflacao',           confirmed: true  },
  { date: '2026-05-14', name: 'IBC-Br',                detail: 'ref. mar/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-05-22', name: 'CAGED',                 detail: 'ref. abr/2026',  category: 'trabalho',           confirmed: false },
  { date: '2026-05-26', name: 'Resultado Primário',    detail: 'ref. abr/2026',  category: 'fiscal',             confirmed: false },
  { date: '2026-05-28', name: 'Balanço de Pagamentos', detail: 'ref. abr/2026',  category: 'externo',            confirmed: false },
  { date: '2026-05-29', name: 'Nota de Crédito BCB',   detail: 'ref. abr/2026',  category: 'credito',            confirmed: false },

  // ── Junho 2026 ─────────────────────────────────────────────────────────────
  { date: '2026-06-10', name: 'IPCA',                  detail: 'ref. mai/2026',  category: 'inflacao',           confirmed: false },
  { date: '2026-06-11', name: 'IBC-Br',                detail: 'ref. abr/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-06-16', name: 'COPOM — Decisão',       detail: 'reunião 120ª',   category: 'politica-monetaria', confirmed: true  },
  { date: '2026-06-18', name: 'PNAD Contínua',         detail: 'T1 2026',        category: 'trabalho',           confirmed: false },
  { date: '2026-06-18', name: 'PIB',                   detail: 'T1 2026',        category: 'atividade',          confirmed: false },
  { date: '2026-06-24', name: 'CAGED',                 detail: 'ref. mai/2026',  category: 'trabalho',           confirmed: false },
  { date: '2026-06-25', name: 'Resultado Primário',    detail: 'ref. mai/2026',  category: 'fiscal',             confirmed: false },
  { date: '2026-06-25', name: 'DLSP / DBGG',           detail: 'ref. abr/2026',  category: 'fiscal',             confirmed: false },
  { date: '2026-06-26', name: 'Balanço de Pagamentos', detail: 'ref. mai/2026',  category: 'externo',            confirmed: false },

  // ── Julho 2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-09', name: 'IPCA',                  detail: 'ref. jun/2026',  category: 'inflacao',           confirmed: false },
  { date: '2026-07-14', name: 'IBC-Br',                detail: 'ref. mai/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-07-24', name: 'CAGED',                 detail: 'ref. jun/2026',  category: 'trabalho',           confirmed: false },
  { date: '2026-07-28', name: 'COPOM — Decisão',       detail: 'reunião 121ª',   category: 'politica-monetaria', confirmed: true  },
  { date: '2026-07-29', name: 'Resultado Primário',    detail: 'ref. jun/2026',  category: 'fiscal',             confirmed: false },
  { date: '2026-07-30', name: 'Balanço de Pagamentos', detail: 'ref. jun/2026',  category: 'externo',            confirmed: false },

  // ── Agosto 2026 ────────────────────────────────────────────────────────────
  { date: '2026-08-13', name: 'IPCA',                  detail: 'ref. jul/2026',  category: 'inflacao',           confirmed: false },
  { date: '2026-08-13', name: 'IBC-Br',                detail: 'ref. jun/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-08-20', name: 'PNAD Contínua',         detail: 'T2 2026',        category: 'trabalho',           confirmed: false },
  { date: '2026-08-25', name: 'CAGED',                 detail: 'ref. jul/2026',  category: 'trabalho',           confirmed: false },
  { date: '2026-08-27', name: 'Resultado Primário',    detail: 'ref. jul/2026',  category: 'fiscal',             confirmed: false },
  { date: '2026-08-27', name: 'DLSP / DBGG',           detail: 'ref. jun/2026',  category: 'fiscal',             confirmed: false },

  // ── Setembro 2026 ──────────────────────────────────────────────────────────
  { date: '2026-09-10', name: 'IPCA',                  detail: 'ref. ago/2026',  category: 'inflacao',           confirmed: false },
  { date: '2026-09-15', name: 'IBC-Br',                detail: 'ref. jul/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-09-15', name: 'COPOM — Decisão',       detail: 'reunião 122ª',   category: 'politica-monetaria', confirmed: true  },
  { date: '2026-09-24', name: 'CAGED',                 detail: 'ref. ago/2026',  category: 'trabalho',           confirmed: false },
  { date: '2026-09-25', name: 'PIB',                   detail: 'T2 2026',        category: 'atividade',          confirmed: false },

  // ── Outubro 2026 ───────────────────────────────────────────────────────────
  { date: '2026-10-08', name: 'IPCA',                  detail: 'ref. set/2026',  category: 'inflacao',           confirmed: false },
  { date: '2026-10-14', name: 'IBC-Br',                detail: 'ref. ago/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-10-22', name: 'CAGED',                 detail: 'ref. set/2026',  category: 'trabalho',           confirmed: false },
  { date: '2026-10-27', name: 'PNAD Contínua',         detail: 'T3 2026',        category: 'trabalho',           confirmed: false },

  // ── Novembro 2026 ──────────────────────────────────────────────────────────
  { date: '2026-11-04', name: 'COPOM — Decisão',       detail: 'reunião 123ª',   category: 'politica-monetaria', confirmed: true  },
  { date: '2026-11-12', name: 'IPCA',                  detail: 'ref. out/2026',  category: 'inflacao',           confirmed: false },
  { date: '2026-11-18', name: 'IBC-Br',                detail: 'ref. set/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-11-25', name: 'CAGED',                 detail: 'ref. out/2026',  category: 'trabalho',           confirmed: false },

  // ── Dezembro 2026 ──────────────────────────────────────────────────────────
  { date: '2026-12-09', name: 'IPCA',                  detail: 'ref. nov/2026',  category: 'inflacao',           confirmed: false },
  { date: '2026-12-09', name: 'COPOM — Decisão',       detail: 'reunião 124ª',   category: 'politica-monetaria', confirmed: true  },
  { date: '2026-12-10', name: 'IBC-Br',                detail: 'ref. out/2026',  category: 'atividade',          confirmed: false },
  { date: '2026-12-16', name: 'PIB',                   detail: 'T3 2026',        category: 'atividade',          confirmed: false },
]

function fmt(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(y, m - 1, d))
}

function monthLabel(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

export function CalendarSection() {
  const [todayStr, setTodayStr] = useState('')

  useEffect(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setTodayStr(d.toISOString().slice(0, 10))
  }, [])

  const { upcoming, past } = useMemo(() => {
    if (!todayStr) return { upcoming: EVENTS.slice().sort((a, b) => a.date.localeCompare(b.date)), past: [] }
    const sorted = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date))
    return {
      upcoming: sorted.filter(e => e.date >= todayStr),
      past:     sorted.filter(e => e.date <  todayStr).slice(-3).reverse(),
    }
  }, [todayStr])

  const byMonth = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of upcoming) {
      const key = ev.date.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [upcoming])

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Calendário Econômico</h2>

      <div className="overflow-y-auto max-h-[480px] flex flex-col gap-4 pr-1">
        {/* Últimos eventos */}
        {past.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium px-1">
              Recentes
            </span>
            {past.map((ev, i) => (
              <EventRow key={i} ev={ev} today={todayStr} />
            ))}
          </div>
        )}

        {/* Próximos eventos agrupados por mês */}
        {Array.from(byMonth.entries()).map(([monthKey, evs]) => (
          <div key={monthKey} className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium px-1 capitalize">
              {monthLabel(monthKey + '-01')}
            </span>
            {evs.map((ev, i) => (
              <EventRow key={i} ev={ev} today={todayStr} />
            ))}
          </div>
        ))}

        <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
          * datas estimadas com base no histórico de divulgação
        </p>
      </div>
    </div>
  )
}

function EventRow({ ev, today }: { ev: CalEvent; today: string }) {
  const isPast  = ev.date < today
  const isToday = ev.date === today

  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md ${
      isToday ? 'bg-muted border border-border' : isPast ? 'opacity-40' : ''
    }`}>
      <span className={`text-[10px] font-mono w-12 shrink-0 pt-0.5 ${
        isToday ? 'text-foreground font-semibold' : 'text-muted-foreground'
      }`}>
        {fmt(ev.date)}
      </span>

      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_STYLE[ev.category]}`}>
        {CATEGORY_LABEL[ev.category]}
      </span>

      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium leading-tight truncate">{ev.name}</span>
        <span className="text-[10px] text-muted-foreground">{ev.detail}{!ev.confirmed ? ' *' : ''}</span>
      </div>

      {isToday && (
        <span className="ml-auto text-[10px] font-semibold text-amber-400 shrink-0">hoje</span>
      )}
    </div>
  )
}
