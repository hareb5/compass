import { COMPETENCIES, type CompetencyId, type ScoreMap } from '#/lib/competencies'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'

type ScorePickerProps = {
  scores: ScoreMap
  onChange: (competencyId: CompetencyId, value: number) => void
  disabled?: boolean
}

export function ScorePicker({ scores, onChange, disabled }: ScorePickerProps) {
  return (
    <div className="space-y-4">
      {COMPETENCIES.map((competency) => {
        const value = scores[competency.id]
        return (
          <article
            key={competency.id}
            className="rounded-xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {competency.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {competency.description}
                </p>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Score 1–5
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((option) => {
                const selected = value === option
                return (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    disabled={disabled}
                    className={cn(
                      'min-w-10 tabular-nums',
                      selected && 'shadow-sm',
                    )}
                    onClick={() => onChange(competency.id, option)}
                  >
                    {option}
                  </Button>
                )
              })}
            </div>
          </article>
        )
      })}
    </div>
  )
}
