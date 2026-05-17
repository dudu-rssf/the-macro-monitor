'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import type { EnrichedEvent, EventCategory } from '@/app/api/calendar/route'

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

function fmt(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(y, m - 1, d))
}

function getISOWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function monthLabel(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

function ValueBadge({ actual, expected, unit, decimals }: {
  actual: number | null; expected: number | null; unit: string; decimals: number
}) {
  if (actual !== null) {
    return (
      <span className="ml-auto shrink-0 flex items-center gap-0.5 text-[10px] font-mono text-emerald-400 font-semibold">
        {actual.toFixed(decimals)}{unit}
        <span className="text-emerald-500">✓</span>
      </span>
    )
  }
  if (expected !== null) {
    return (
      <span className="ml-auto shrink-0 text-[10px] font-mono text-muted-foreground/70">
        exp. {expected.toFixed(decimals)}{unit}
      </span>
    )
  }
  return null
}

function EventRow({ ev, todayStr }: { ev: EnrichedEvent; todayStr: string }) {
  const isPast  = ev.date < todayStr
  const isToday = ev.date === todayStr

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
      isToday ? 'bg-muted border border-border' : isPast ? 'opacity-50' : ''
    }`}>
      <span className={`text-[10px] font-mono w-11 shrink-0 ${
        isToday ? 'text-foreground font-semibold' : 'text-muted-foreground'
      }`}>
        {fmt(ev.date)}
      </span>

      <span className={`text-[10px] px-1 py-0.5 rounded shrink-0 ${CATEGORY_STYLE[ev.category]}`}>
        {CATEGORY_LABEL[ev.category]}
      </span>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium leading-tight truncate">{ev.name}</span>
        <span className="text-[10px] text-muted-foreground">{ev.detail}{!ev.confirmed ? ' *' : ''}</span>
      </div>

      {isToday && !ev.actual && (
        <span className="text-[10px] font-semibold text-amber-400 shrink-0">hoje</span>
      )}

      <ValueBadge
        actual={ev.actual}
        expected={ev.expected}
        unit={ev.unit}
        decimals={ev.decimals}
      />
    </div>
  )
}

export function CalendarSection() {
  const [events,     setEvents]     = useState<EnrichedEvent[]>([])
  const [todayStr,   setTodayStr]   = useState('')
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    fetch('/api/calendar')
      .then(r => r.json())
      .then((data: EnrichedEvent[]) => {
        setEvents(data)
        setLoading(false)
        setRefreshing(false)
      })
      .catch(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setTodayStr(d.toISOString().slice(0, 10))
    load()
    const handler = () => load(true)
    window.addEventListener('macro:refresh', handler)
    return () => window.removeEventListener('macro:refresh', handler)
  }, [load])

  if (!todayStr || loading) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Calendário Econômico</h2>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Week boundaries
  const weekStart    = getISOWeekStart(new Date(todayStr))
  const weekEnd      = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartStr = toDateStr(weekStart)
  const weekEndStr   = toDateStr(weekEnd)

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))

  const pastOutsideWeek = sorted.filter(e => e.date < weekStartStr).slice(-4).reverse()
  const thisWeek        = sorted.filter(e => e.date >= weekStartStr && e.date <= weekEndStr)
  const future          = sorted.filter(e => e.date > weekEndStr)

  // Group future by month
  const byMonth = new Map<string, EnrichedEvent[]>()
  for (const ev of future) {
    const key = ev.date.slice(0, 7)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(ev)
  }

  const releasedThisWeek = thisWeek.filter(e => e.date <= todayStr).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Calendário Econômico</h2>
        <div className="flex items-center gap-2 ml-auto">
          {releasedThisWeek > 0 && (
            <span className="text-[10px] text-emerald-400 font-mono">
              {releasedThisWeek} divulgad{releasedThisWeek === 1 ? 'o' : 'os'} essa semana
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Atualizar calendário"
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[520px] flex flex-col gap-3 pr-1">

        {/* Eventos recentes (semanas anteriores) */}
        {pastOutsideWeek.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium px-1">
              Recentes
            </span>
            {pastOutsideWeek.map((ev, i) => (
              <EventRow key={i} ev={ev} todayStr={todayStr} />
            ))}
          </div>
        )}

        {/* Esta semana — acumula divulgações + mostra próximos */}
        {thisWeek.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium px-1">
              Esta semana · {fmt(weekStartStr)} – {fmt(weekEndStr)}
            </span>
            {thisWeek.map((ev, i) => (
              <EventRow key={i} ev={ev} todayStr={todayStr} />
            ))}
          </div>
        )}

        {/* Próximas semanas agrupadas por mês */}
        {Array.from(byMonth.entries()).map(([monthKey, evs]) => (
          <div key={monthKey} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium px-1 capitalize">
              {monthLabel(monthKey + '-01')}
            </span>
            {evs.map((ev, i) => (
              <EventRow key={i} ev={ev} todayStr={todayStr} />
            ))}
          </div>
        ))}

        <p className="text-[10px] text-muted-foreground/40 text-center pt-1">
          * datas estimadas · exp. = expectativa BCB Focus (mediana)
        </p>
      </div>
    </div>
  )
}
