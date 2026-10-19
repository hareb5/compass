import { PROFICIENCY_LEVELS } from '#/lib/competencies'

export function ProficiencyLegend() {
  return (
    <section
      className="rounded-xl border border-border bg-background/80 p-4 shadow-sm"
      aria-label="Proficiency scale"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        How to rate
      </p>
      <ol className="mt-3 space-y-1.5">
        {PROFICIENCY_LEVELS.map((level) => (
          <li
            key={level.level}
            className="text-pretty text-sm leading-snug text-foreground"
          >
            <span className="font-semibold tabular-nums">
              Proficiency {level.level}:
            </span>{' '}
            {level.label}
          </li>
        ))}
      </ol>
    </section>
  )
}
