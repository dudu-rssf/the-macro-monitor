'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RangeSelector } from './range-selector'
import type { TimeRange } from './types'

interface SectionCardProps {
  title: string
  sectionId: string
  globalRange: TimeRange | null
  sectionOverrides: Record<string, TimeRange>
  onGlobalChange: (r: TimeRange) => void
  onSectionChange: (id: string, r: TimeRange) => void
  children: (effectiveRange: TimeRange) => React.ReactNode
}

export function SectionCard({
  title, sectionId, globalRange, sectionOverrides,
  onGlobalChange: _onGlobalChange, onSectionChange, children
}: SectionCardProps) {
  const effectiveRange: TimeRange = sectionOverrides[sectionId] ?? globalRange ?? '2y'
  const isOverridden = sectionId in sectionOverrides

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <RangeSelector
            active={isOverridden ? sectionOverrides[sectionId] : null}
            onChange={(r) => onSectionChange(sectionId, r)}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        {children(effectiveRange)}
      </CardContent>
    </Card>
  )
}
