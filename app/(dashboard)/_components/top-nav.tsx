'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/',                   label: 'Visão Geral' },
  { href: '/inflacao',           label: 'Inflação' },
  { href: '/politica-monetaria', label: 'Pol. Monetária' },
  { href: '/atividade',          label: 'Atividade' },
  { href: '/trabalho',           label: 'Trabalho' },
  { href: '/fiscal',             label: 'Fiscal' },
  { href: '/externo',            label: 'Externo' },
  { href: '/credito',            label: 'Crédito' },
  { href: '/mercados',           label: 'Mercados' },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-6 px-6 h-12">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase shrink-0">
          Macro BR
        </span>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const active = link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
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
      </div>
    </header>
  )
}
