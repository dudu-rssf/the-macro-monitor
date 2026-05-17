import { Suspense } from 'react'
import { Sparkles } from 'lucide-react'
import { getTabSummary } from '@/lib/get-tab-summary'

async function AiContent({ tab }: { tab: string }) {
  const { bullets, generatedAt } = await getTabSummary(tab)
  if (bullets.length === 0) return null

  const date = generatedAt
    ? new Date(generatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      })
    : null

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold">Análise IA</span>
          <span className="text-xs text-muted-foreground">· atualiza diariamente</span>
        </div>
        {date && (
          <span className="text-xs text-muted-foreground">gerado em {date}</span>
        )}
      </div>
      <ul className="space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-violet-400 mt-0.5 shrink-0">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AiSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 mt-6 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-muted" />
        <div className="w-24 h-3.5 rounded bg-muted" />
        <div className="w-32 h-3 rounded bg-muted/60" />
      </div>
      <div className="space-y-2.5">
        {[90, 75, 85, 70, 80].map((w, i) => (
          <div key={i} className="h-3.5 rounded bg-muted" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

export function TabAiSummary({ tab }: { tab: string }) {
  return (
    <Suspense fallback={<AiSkeleton />}>
      <AiContent tab={tab} />
    </Suspense>
  )
}
