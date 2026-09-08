import { useEffect, useState } from 'react'
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
import { cn } from '#/lib/utils'
import { setScoreValue, useCompStore } from '#/store/comp-store'
import { CheckCircle2, User } from 'lucide-react'

export function ManagerScoringScreen() {
  const currentUser = useCompStore((s) => s.currentUser)
  const assessments = useCompStore((s) => s.assessments)
  const reports = useCompStore((s) => s.reports)
  const getUser = useCompStore((s) => s.getUser)
  const submitManagerScores = useCompStore((s) => s.submitManagerScores)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  useEffect(() => {
    if (reports.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(reports[0].id)
    }
  }, [reports, selectedEmployeeId])
  const selectedRecord = assessments.find(
    (a) => a.employeeId === selectedEmployeeId,
  )
  const alreadySubmitted = Boolean(selectedRecord?.managerScores)

  const [scores, setScores] = useState<ScoreMap>(emptyScores())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setScores(selectedRecord?.managerScores ?? emptyScores())
    setSaved(false)
  }, [selectedEmployeeId, selectedRecord?.managerScores])

  if (!currentUser || currentUser.role !== 'manager') return null

  const selectedEmployee = getUser(selectedEmployeeId)
  const canSubmit =
    Boolean(selectedEmployeeId) &&
    isCompleteScores(scores) &&
    !alreadySubmitted
  const managerAverage = isCompleteScores(scores) ? averageScore(scores) : null

  const handleSubmit = async () => {
    const ok = await submitManagerScores(
      currentUser.id,
      selectedEmployeeId,
      scores,
    )
    if (ok) setSaved(true)
  }

  return (
    <div
      className="min-h-[calc(100vh-72px)] px-4 py-8 sm:px-6"
      style={surveyBackgroundStyle}
    >
      <div className="mx-auto grid w-full max-w-[1200px] gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-border bg-card/78 p-4 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Your team
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {currentUser.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Select employee</p>
          <div className="mt-4 space-y-2">
            {reports.map((employee) => {
              const record = assessments.find(
                (a) => a.employeeId === employee.id,
              )
              const done = Boolean(record?.managerScores)
              const selected = employee.id === selectedEmployeeId
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className={cn(
                    'flex min-h-11 w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background/70 hover:border-primary/30',
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{employee.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.title}
                    </p>
                    <Badge
                      className="mt-2"
                      variant={done ? 'default' : 'secondary'}
                    >
                      {done ? 'Scored' : 'Pending'}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="rounded-xl border border-border bg-card/78 p-5 shadow-sm backdrop-blur-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Manager assessment
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {selectedEmployee ? selectedEmployee.name : 'Select an employee'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Score this employee on 5 competencies
              </p>
            </div>
            <Badge variant={alreadySubmitted ? 'default' : 'secondary'}>
              {alreadySubmitted ? 'Submitted' : 'In progress'}
            </Badge>
          </div>

          {managerAverage != null ? (
            <div className="mt-5 rounded-lg border border-border bg-background/70 px-4 py-3 text-sm">
              <span className="font-semibold tabular-nums text-foreground">
                Your average: {formatScore(managerAverage)}
              </span>
            </div>
          ) : null}

          {selectedEmployee ? (
            <>
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
                <Button size="lg" disabled={!canSubmit} onClick={handleSubmit}>
                  Submit manager scores
                </Button>
                {alreadySubmitted || saved ? (
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-primary" />
                    Saved for this employee.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select 1–5 for every competency to submit.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}
