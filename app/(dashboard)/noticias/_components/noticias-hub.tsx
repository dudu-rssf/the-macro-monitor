'use client'

import { useState } from 'react'
import { NewsSection }        from '../../_components/news-section'
import { GeopoliticsSection } from '../../geopolitica/_components/geopolitics-section'
import { NegociosSection }    from '../../negocios/_components/negocios-section'

const TABS = [
  { id: 'economia',    label: 'Economia'    },
  { id: 'geopolitica', label: 'Geopolítica' },
  { id: 'negocios',    label: 'Negócios'    },
] as const

type Tab = typeof TABS[number]['id']

export function NoticiasHub() {
  const [tab, setTab] = useState<Tab>('economia')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              tab === t.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'economia'    && <NewsSection />}
        {tab === 'geopolitica' && <GeopoliticsSection />}
        {tab === 'negocios'    && <NegociosSection />}
      </div>
    </div>
  )
}
