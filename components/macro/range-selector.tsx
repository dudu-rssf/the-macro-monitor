'use client'

import { Button } from '@/components/ui/button'
import { RANGES, type TimeRange } from './types'

interface RangeSelectorProps {
  active: TimeRange | null
  onChange: (r: TimeRange) => void
}

export function RangeSelector({ active, onChange }: RangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <Button
          key={r.value}
          variant={active === r.value ? 'secondary' : 'ghost'}
          size="sm"
          className={`h-6 px-2 text-xs font-mono ${active === r.value ? '' : 'text-muted-foreground'}`}
          onClick={() => onChange(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  )
}
