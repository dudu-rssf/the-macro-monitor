import Link from 'next/link'

const navLinks = [
  { href: '/inflacao',           label: 'Inflação' },
  { href: '/politica-monetaria', label: 'Pol. Monetária' },
  { href: '/atividade',          label: 'Atividade' },
  { href: '/trabalho',           label: 'Trabalho' },
  { href: '/fiscal',             label: 'Fiscal' },
  { href: '/externo',            label: 'Externo' },
  { href: '/credito',            label: 'Crédito' },
  { href: '/mercados',           label: 'Mercados' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-48 shrink-0 border-r border-border flex flex-col py-6 px-3 gap-1">
        <div className="px-3 mb-6">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Macro BR
          </span>
        </div>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
