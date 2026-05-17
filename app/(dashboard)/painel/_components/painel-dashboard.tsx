'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { ServiceStatus } from '@/app/api/health/route'

interface HealthData {
  checkedAt: string
  services:  ServiceStatus[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s atrás`
  return `${Math.floor(s / 60)}min atrás`
}

function latencyColor(ms: number | null): string {
  if (ms === null) return 'text-muted-foreground'
  if (ms < 500)  return 'text-emerald-400'
  if (ms < 1500) return 'text-amber-400'
  return 'text-red-400'
}

function ServiceRow({ svc }: { svc: ServiceStatus }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
      {svc.ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
      )}
      <span className="text-sm flex-1 leading-tight">{svc.name}</span>
      {svc.detail && (
        <span className="text-[10px] text-red-400/80 truncate max-w-[180px]" title={svc.detail}>
          {svc.detail}
        </span>
      )}
      <span className={`text-[11px] font-mono shrink-0 ${svc.ok ? latencyColor(svc.latencyMs) : 'text-muted-foreground/60'}`}>
        {svc.latencyMs !== null ? `${svc.latencyMs}ms` : '—'}
      </span>
    </div>
  )
}

function ServiceGroup({ name, services }: { name: string; services: ServiceStatus[] }) {
  const allOk    = services.every(s => s.ok)
  const someOk   = services.some(s => s.ok)
  const statusColor = allOk ? 'text-emerald-400' : someOk ? 'text-amber-400' : 'text-red-400'
  const statusText  = allOk ? 'Operacional' : someOk ? 'Degradado' : 'Fora do ar'

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{name}</h3>
        <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
      </div>
      <div className="flex flex-col">
        {services.map(svc => (
          <ServiceRow key={svc.name} svc={svc} />
        ))}
      </div>
    </div>
  )
}

function SummaryBar({ services }: { services: ServiceStatus[] }) {
  const ok    = services.filter(s => s.ok).length
  const total = services.length
  const allOk = ok === total

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
      allOk ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
    }`}>
      {allOk ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
      )}
      <div>
        <p className="text-sm font-semibold">
          {allOk ? 'Todos os serviços operacionais' : `${ok} de ${total} serviços operacionais`}
        </p>
        <p className="text-xs text-muted-foreground">
          {allOk ? 'Nenhuma falha detectada.' : `${total - ok} serviço${total - ok > 1 ? 's' : ''} com problema.`}
        </p>
      </div>
    </div>
  )
}

export function PainelDashboard() {
  const [data,      setData]      = useState<HealthData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    fetch('/api/health')
      .then(r => r.json())
      .then((d: HealthData) => {
        setData(d)
        setLoading(false)
        setRefreshing(false)
      })
      .catch(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => {
    load()
    const handler = () => load(true)
    window.addEventListener('macro:refresh', handler)
    return () => window.removeEventListener('macro:refresh', handler)
  }, [load])

  // Group services by group
  const groups = data
    ? Array.from(
        data.services.reduce((acc, svc) => {
          if (!acc.has(svc.group)) acc.set(svc.group, [])
          acc.get(svc.group)!.push(svc)
          return acc
        }, new Map<string, ServiceStatus[]>())
      )
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Painel de Controle</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Status dos serviços e conexões externas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.checkedAt && (
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(data.checkedAt)}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
            Verificar agora
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && data && (
        <div className="flex flex-col gap-4">
          <SummaryBar services={data.services} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(([group, svcs]) => (
              <ServiceGroup key={group} name={group} services={svcs} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
