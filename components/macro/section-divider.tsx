interface SectionDividerProps {
  title: string
  description?: string
}

export function SectionDivider({ title, description }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-4 pt-4">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {description && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
