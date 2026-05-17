'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Sparkles, RefreshCw, Send } from 'lucide-react'

type Tab = 'geral' | 'recente' | 'perguntar'

interface AiData {
  bullets:     string[]
  generatedAt: string | null
  error?:      string
}

interface AskData {
  answer:      string
  generatedAt: string | null
  error?:      string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  return `${h}h atrás`
}

function BulletPanel({ data, loading, onRetry }: {
  data:    AiData | null
  loading: boolean
  onRetry: () => void
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted/40 animate-pulse"
            style={{ width: `${65 + (i * 7) % 30}%` }}
          />
        ))}
      </div>
    )
  }

  if (data?.error || !data?.bullets?.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-xs text-muted-foreground text-center">
          {data?.error
            ? `Erro: ${data.error}`
            : 'Nenhuma análise disponível.'}
        </p>
        <button
          onClick={onRetry}
          className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.bullets.map((bullet, i) => (
        <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
          <span className="text-violet-400/70 shrink-0 mt-0.5 font-semibold">•</span>
          <span className="text-foreground/90">{bullet}</span>
        </li>
      ))}
    </ul>
  )
}

const EXAMPLE_QUESTIONS = [
  'O juro real brasileiro está alto ou baixo historicamente?',
  'Qual o principal risco fiscal do Brasil agora?',
  'O câmbio atual reflete os fundamentos?',
]

function PerguntarPanel() {
  const [question,  setQuestion]  = useState('')
  const [result,    setResult]    = useState<AskData | null>(null)
  const [loading,   setLoading]   = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function ask(q: string) {
    const trimmed = q.trim()
    if (!trimmed || loading) return
    setQuestion(trimmed)
    setLoading(true)
    setResult(null)
    fetch('/api/ai-context/ask', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question: trimmed }),
    })
      .then(r => r.json())
      .then((d: AskData) => { setResult(d); setLoading(false) })
      .catch(e  => { setResult({ answer: '', error: String(e), generatedAt: null }); setLoading(false) })
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ask(question)
    }
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Sugestões */}
      {!result && !loading && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-muted-foreground/60">Exemplos:</p>
          {EXAMPLE_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="text-left text-[11px] text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted/50 transition-colors leading-snug"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Resposta */}
      {loading && (
        <div className="flex flex-col gap-2.5 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3.5 rounded bg-muted/40 animate-pulse" style={{ width: `${60 + (i * 9) % 35}%` }} />
          ))}
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <p className="text-[10px] text-muted-foreground/60 font-medium italic truncate">
            &ldquo;{question}&rdquo;
          </p>
          <div className="flex-1 overflow-y-auto pr-1">
            {result.error && !result.answer ? (
              <p className="text-xs text-red-400/80">Erro: {result.error}</p>
            ) : (
              <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">{result.answer}</p>
            )}
          </div>
          <button
            onClick={() => { setResult(null); setQuestion('') }}
            className="self-start text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Nova pergunta
          </button>
        </div>
      )}

      {/* Input */}
      {!result && (
        <div className="mt-auto flex gap-2 items-end pt-1">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Faça uma pergunta macroeconômica... (Enter para enviar)"
            rows={2}
            className="flex-1 resize-none rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          />
          <button
            onClick={() => ask(question)}
            disabled={!question.trim() || loading}
            className="shrink-0 p-2 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function AiContextSection() {
  const [tab, setTab] = useState<Tab>('geral')

  const [geralData,    setGeralData]    = useState<AiData | null>(null)
  const [geralLoading, setGeralLoading] = useState(true)

  const [recentData,    setRecentData]    = useState<AiData | null>(null)
  const [recentLoading, setRecentLoading] = useState(false)
  const recentFetched = useRef(false)

  function loadGeral() {
    setGeralLoading(true)
    fetch('/api/ai-context')
      .then(r => r.json())
      .then((d: AiData) => { setGeralData(d); setGeralLoading(false) })
      .catch(e => { setGeralData({ bullets: [], generatedAt: null, error: String(e) }); setGeralLoading(false) })
  }

  function loadRecente() {
    setRecentLoading(true)
    fetch('/api/ai-context/recent')
      .then(r => r.json())
      .then((d: AiData) => { setRecentData(d); setRecentLoading(false); recentFetched.current = true })
      .catch(e => { setRecentData({ bullets: [], generatedAt: null, error: String(e) }); setRecentLoading(false) })
  }

  useEffect(() => { loadGeral() }, [])

  useEffect(() => {
    if (tab === 'recente' && !recentFetched.current) loadRecente()
  }, [tab])

  const TABS = [
    { key: 'geral'     as Tab, label: 'Panorama Geral'   },
    { key: 'recente'   as Tab, label: 'Panorama Recente'  },
    { key: 'perguntar' as Tab, label: 'Perguntar'         },
  ]

  const activeData    = tab === 'geral' ? geralData    : recentData
  const activeLoading = tab === 'geral' ? geralLoading : recentLoading
  const activeLoad    = tab === 'geral' ? loadGeral    : loadRecente

  const TAB_DESC: Record<Tab, string> = {
    geral:     'Visão geral do cenário macro — contexto, tendências e implicações.',
    recente:   'Últimos dados divulgados — surpresas, outliers e o que está mudando agora.',
    perguntar: 'Tire dúvidas macroeconômicas com IA, com base nos dados atuais do Brasil.',
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <h2 className="text-sm font-semibold">Contexto IA</h2>
        {tab !== 'perguntar' && (
          <div className="ml-auto flex items-center gap-2">
            {activeData?.generatedAt && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {timeAgo(activeData.generatedAt)}
              </span>
            )}
            <button
              onClick={activeLoad}
              disabled={activeLoading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Atualizar análise"
            >
              <RefreshCw className={`w-3 h-3 ${activeLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
              tab === t.key
                ? 'bg-violet-500/20 text-violet-300 font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed -mt-1">
        {TAB_DESC[tab]}
      </p>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 flex flex-col">
        {tab === 'perguntar' ? (
          <PerguntarPanel />
        ) : (
          <BulletPanel
            data={activeData}
            loading={activeLoading}
            onRetry={activeLoad}
          />
        )}
      </div>

      {tab !== 'perguntar' && (
        <p className="text-[10px] text-muted-foreground/50 pt-1 border-t border-border/30">
          {tab === 'geral'
            ? 'Gerado por IA com base nos dados do banco · atualiza a cada hora'
            : 'Gerado por IA com base nos dados recentes · atualiza a cada 15 min'}
        </p>
      )}
    </div>
  )
}
