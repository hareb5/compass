import { useEffect, useState } from 'react'
import { ProficiencyLegend } from '#/components/scoring/ProficiencyLegend'
import { ScorePicker } from '#/components/scoring/ScorePicker'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  averageScore,
  emptyScores,
  formatScore,
  isCompleteScores,
} from '#/lib/competencies'
import type { ScoreMap } from '#/lib/competencies'
import { canTakeSelfAssessment } from '#/lib/mock-data'
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
  const submitEmployeeScores = useCompStore((s) => s.submitEmployeeScores)
  const needsSelfAssessment = canTakeSelfAssessment(currentUser)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  useEffect(() => {
    if (selectedEmployeeId || !currentUser) return
    if (needsSelfAssessment) {
      setSelectedEmployeeId(currentUser.id)
      return
    }
    if (reports.length > 0) {
      setSelectedEmployeeId(reports[0].id)
    }
  }, [currentUser, needsSelfAssessment, reports, selectedEmployeeId])

  const isScoringSelf =
    needsSelfAssessment && selectedEmployeeId === currentUser?.id
  const selectedRecord = assessments.find(
    (a) => a.employeeId === selectedEmployeeId,
  )
  const alreadySubmitted = isScoringSelf
    ? Boolean(selectedRecord?.employeeScores)
    : Boolean(selectedRecord?.managerScores)

  const [scores, setScores] = useState<ScoreMap>(emptyScores())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setScores(
      (isScoringSelf
        ? selectedRecord?.employeeScores
        : selectedRecord?.managerScores) ?? emptyScores(),
    )
    setSaved(false)
  }, [
    selectedEmployeeId,
    isScoringSelf,
    selectedRecord?.employeeScores,
    selectedRecord?.managerScores,
  ])

  if (!currentUser || currentUser.role !== 'manager') return null

  const selectedEmployee = isScoringSelf
    ? currentUser
    : getUser(selectedEmployeeId)
  const canSubmit =
    Boolean(selectedEmployeeId) &&
    isCompleteScores(scores) &&
    !alreadySubmitted
  const scoreAverage = isCompleteScores(scores) ? averageScore(scores) : null

  const handleSubmit = async () => {
    const ok = isScoringSelf
      ? await submitEmployeeScores(currentUser.id, scores)
      : await submitManagerScores(currentUser.id, selectedEmployeeId, scores)
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
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {currentUser.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {needsSelfAssessment
              ? 'Rate yourself, then select an employee'
              : 'Select employee'}
          </p>
          <div className="mt-4 space-y-2">
            {needsSelfAssessment ? (
              <TeamPersonButton
                name={currentUser.name}
                title="Yourself"
                selected={isScoringSelf}
                done={Boolean(
                  assessments.find((a) => a.employeeId === currentUser.id)
                    ?.employeeScores,
                )}
                onSelect={() => setSelectedEmployeeId(currentUser.id)}
              />
            ) : null}
            {reports.map((employee) => {
              const record = assessments.find(
                (a) => a.employeeId === employee.id,
              )
              const done = Boolean(record?.managerScores)
              const selected =
                !isScoringSelf && employee.id === selectedEmployeeId
              return (
                <TeamPersonButton
                  key={employee.id}
                  name={employee.name}
                  title={employee.title}
                  selected={selected}
                  done={done}
                  onSelect={() => setSelectedEmployeeId(employee.id)}
                />
              )
            })}
          </div>
        </aside>

        <section className="rounded-xl border border-border bg-card/78 p-5 shadow-sm backdrop-blur-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {isScoringSelf ? 'Self assessment' : 'Manager assessment'}
              </p>
              <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {selectedEmployee
                  ? selectedEmployee.name
                  : 'Select an employee'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isScoringSelf
                  ? 'Score yourself on 5 competencies'
                  : 'Score this employee on 5 competencies'}
              </p>
            </div>
            <Badge variant={alreadySubmitted ? 'default' : 'secondary'}>
              {alreadySubmitted ? 'Submitted' : 'In progress'}
            </Badge>
          </div>

          {scoreAverage != null ? (
            <div className="mt-5 rounded-lg border border-border bg-background/70 px-4 py-3 text-sm">
              <span className="font-semibold tabular-nums text-foreground">
                Your average: {formatScore(scoreAverage)}
              </span>
            </div>
          ) : null}

          {selectedEmployee ? (
            <>
              {!isScoringSelf ? (
                <div className="mt-6">
                  <ProficiencyLegend />
                </div>
              ) : null}

              <div className="mt-6">
                <ScorePicker
                  scores={scores}
                  disabled={alreadySubmitted}
                  showProficiencyHints={!isScoringSelf}
                  onChange={(id, value) =>
                    setScores((prev) => setScoreValue(prev, id, value))
                  }
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" disabled={!canSubmit} onClick={handleSubmit}>
                  {isScoringSelf
                    ? 'Submit self scores'
                    : 'Submit manager scores'}
                </Button>
                {alreadySubmitted || saved ? (
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-primary" />
                    {isScoringSelf
                      ? 'Saved. You can no longer change these scores.'
                      : 'Saved for this employee.'}
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

function TeamPersonButton({
  name,
  title,
  selected,
  done,
  onSelect,
}: {
  name: string
  title: string
  selected: boolean
  done: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex min-h-11 w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background/70 hover:border-primary/30',
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <User className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{title}</p>
        <Badge className="mt-2" variant={done ? 'default' : 'secondary'}>
          {done ? 'Scored' : 'Pending'}
        </Badge>
      </div>
    </button>
  )
}
