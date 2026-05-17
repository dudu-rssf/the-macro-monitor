'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { SummaryPanel } from './summary-panel'

const navLinks = [
  { href: '/',                   label: 'Visão Geral',  tab: 'visao'              },
  { href: '/inflacao',           label: 'Inflação',     tab: 'inflacao'           },
  { href: '/politica-monetaria', label: 'Pol. Monetária', tab: 'politica-monetaria' },
  { href: '/atividade',          label: 'Atividade',    tab: 'atividade'          },
  { href: '/trabalho',           label: 'Trabalho',     tab: 'trabalho'           },
  { href: '/fiscal',             label: 'Fiscal',       tab: 'fiscal'             },
  { href: '/externo',            label: 'Externo',      tab: 'externo'            },
  { href: '/credito',            label: 'Crédito',      tab: 'credito'            },
  { href: '/mercados',           label: 'Mercados',     tab: 'mercados'           },
  { href: '/quant',              label: 'Quant',        tab: null                 },
  { href: '/painel',             label: 'Painel',       tab: null                 },
]

function activeTab(pathname: string): string | null {
  const link = navLinks.find(l =>
    l.href === '/' ? pathname === '/' : pathname === l.href || pathname.startsWith(l.href + '/')
  )
  // If link not found, assume visao; if tab is explicitly null, return null (no summary for that page)
  if (!link) return 'visao'
  return link.tab
}

export function TopNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [refreshing,     setRefreshing]     = useState(false)
  const [summaryOpen,    setSummaryOpen]    = useState(false)
  const currentTab = activeTab(pathname)

  function handleRefresh() {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('macro:refresh'))
    router.refresh()
    setTimeout(() => setRefreshing(false), 1200)
  }

  return (
    <>
      <header className="border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-4 px-6 h-12">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase shrink-0">
            Macro BR
          </span>
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
            {navLinks.map((link) => {
              const active = link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                    active
                      ? 'text-foreground bg-muted font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            {currentTab !== null && (
              <button
                onClick={() => setSummaryOpen(true)}
                title="Gerar resumo IA desta aba"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Resumo IA
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Atualizar dados da aba"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {summaryOpen && currentTab && (
        <SummaryPanel tab={currentTab} onClose={() => setSummaryOpen(false)} />
      )}
    </>
  )
}
