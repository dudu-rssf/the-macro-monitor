'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

const navLinks = [
  { href: '/',                   label: 'Visão Geral',    },
  { href: '/inflacao',           label: 'Inflação',       },
  { href: '/politica-monetaria', label: 'Pol. Monetária', },
  { href: '/atividade',          label: 'Atividade',      },
  { href: '/trabalho',           label: 'Trabalho',       },
  { href: '/fiscal',             label: 'Fiscal',         },
  { href: '/externo',            label: 'Externo',        },
  { href: '/credito',            label: 'Crédito',        },
  { href: '/mercados',           label: 'Mercados',       },
  { href: '/quant',              label: 'Quant',          },
  { href: '/geopolitica',        label: 'Geopolítica',    },
  { href: '/painel',             label: 'Painel',         },
]

export function TopNav() {
  const pathname   = usePathname()
  const router     = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  function handleRefresh() {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('macro:refresh'))
    router.refresh()
    setTimeout(() => setRefreshing(false), 1200)
  }

  return (
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
  )
}
