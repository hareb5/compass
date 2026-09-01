import { useMemo, useState } from 'react'
import { ScorePicker } from '#/components/scoring/ScorePicker'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  averageScore,
  emptyScores,
  formatScore,
  isCompleteScores,
  type ScoreMap,
} from '#/lib/competencies'
import { surveyBackgroundStyle } from '#/lib/survey-constants'
import { setScoreValue, useCompStore } from '#/store/comp-store'
import { CheckCircle2, Lock } from 'lucide-react'

export function EmployeeScoringScreen() {
  const currentUser = useCompStore((s) => s.currentUser)
  const assessments = useCompStore((s) => s.assessments)
  const submitEmployeeScores = useCompStore((s) => s.submitEmployeeScores)

  const record = useMemo(
    () => assessments.find((a) => a.employeeId === currentUser?.id),
    [assessments, currentUser?.id],
  )

  const alreadySubmitted = Boolean(record?.employeeScores)
  const [scores, setScores] = useState<ScoreMap>(
    () => record?.employeeScores ?? emptyScores(),
  )
  const [saved, setSaved] = useState(false)

  if (!currentUser || currentUser.role !== 'employee') return null

  const canSubmit = isCompleteScores(scores) && !alreadySubmitted
  const selfAverage = isCompleteScores(scores) ? averageScore(scores) : null

  const handleSubmit = async () => {
    const ok = await submitEmployeeScores(currentUser.id, scores)
    if (ok) setSaved(true)
  }

  return (
    <div
      className="min-h-[calc(100vh-72px)] px-4 py-8 sm:px-6"
      style={surveyBackgroundStyle}
    >
      <div className="mx-auto w-full max-w-[900px]">
        <div className="rounded-xl border border-border bg-card/78 p-5 shadow-sm backdrop-blur-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Self assessment
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">
                Score yourself on 5 competencies
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Your scores are private from your manager. Your self-score
                contributes 40% of the final result.
              </p>
            </div>
            <Badge variant={alreadySubmitted ? 'default' : 'secondary'}>
              {alreadySubmitted ? 'Submitted' : 'In progress'}
            </Badge>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/70 px-4 py-3 text-sm">
            <Lock className="size-4 text-primary" />
            <span className="text-muted-foreground">
              Manager scores are hidden from you.
            </span>
            {selfAverage != null ? (
              <span className="ml-auto font-semibold tabular-nums text-foreground">
                Your average: {formatScore(selfAverage)}
              </span>
            ) : null}
          </div>

          <div className="mt-6">
            <ScorePicker
              scores={scores}
              disabled={alreadySubmitted}
              onChange={(id, value) =>
                setScores((prev) => setScoreValue(prev, id, value))
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Submit self scores
            </Button>
            {alreadySubmitted || saved ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                Saved. You can no longer change scores in this mock demo.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select 1–5 for every competency to submit.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
