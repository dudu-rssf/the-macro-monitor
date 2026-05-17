'use client'

import React from 'react'

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: string },
  State
> {
  constructor(props: { children: React.ReactNode; fallback?: string }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <p className="text-xs text-muted-foreground text-center">
            {this.props.fallback ?? 'Erro ao carregar seção.'}
          </p>
          <p className="text-[10px] text-muted-foreground/50 font-mono text-center">
            {this.state.message}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
