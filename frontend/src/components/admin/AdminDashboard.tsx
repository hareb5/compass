import { useMemo, useState, type ReactNode } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  COMPETENCIES,
  EMPLOYEE_WEIGHT,
  MANAGER_WEIGHT,
  averageScore,
  formatScore,
  isCompleteScores,
  weightedFinalScore,
  weightedPerCompetency,
} from '#/lib/competencies'
import { USE_API } from '#/lib/config'
import { cn } from '#/lib/utils'
import { useCompStore } from '#/store/comp-store'
import {
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Scale,
  Users,
} from 'lucide-react'

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string | number
  hint: string
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </article>
  )
}

export function AdminDashboard() {
  const assessments = useCompStore((s) => s.assessments)
  const adminRows = useCompStore((s) => s.adminRows)
  const getUser = useCompStore((s) => s.getUser)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    () => assessments[0]?.employeeId ?? '',
  )

  const rows = useMemo(() => {
    if (USE_API && adminRows.length > 0) {
      return adminRows.map((record) => ({
        record,
        employee: record.employee ?? getUser(record.employeeId),
        manager: record.manager ?? getUser(record.managerId),
        employeeDone: isCompleteScores(record.employeeScores),
        managerDone: isCompleteScores(record.managerScores),
        finalScore: record.finalScore ?? null,
        employeeAvg: record.employeeAvg ?? null,
        managerAvg: record.managerAvg ?? null,
      }))
    }

    return assessments.map((record) => {
      const employee = getUser(record.employeeId)
      const manager = getUser(record.managerId)
      const employeeDone = isCompleteScores(record.employeeScores)
      const managerDone = isCompleteScores(record.managerScores)
      const finalScore =
        employeeDone && managerDone && record.employeeScores && record.managerScores
          ? weightedFinalScore(record.managerScores, record.employeeScores)
          : null

      return {
        record,
        employee,
        manager,
        employeeDone,
        managerDone,
        finalScore,
        employeeAvg: employeeDone && record.employeeScores
          ? averageScore(record.employeeScores)
          : null,
        managerAvg: managerDone && record.managerScores
          ? averageScore(record.managerScores)
          : null,
      }
    })
  }, [assessments, adminRows, getUser])

  const selected = rows.find((row) => row.record.employeeId === selectedEmployeeId)
  const bothDone =
    selected?.employeeDone &&
    selected.managerDone &&
    selected.record.employeeScores &&
    selected.record.managerScores

  const perCompetency =
    bothDone && selected.record.managerScores && selected.record.employeeScores
      ? weightedPerCompetency(
          selected.record.managerScores,
          selected.record.employeeScores,
        )
      : null

  const completeCount = rows.filter((r) => r.finalScore != null).length
  const pendingCount = rows.length - completeCount
  const avgFinal =
    completeCount > 0
      ? rows.reduce((sum, r) => sum + (r.finalScore ?? 0), 0) / completeCount
      : null

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[oklch(0.98_0.005_106)] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Admin overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Competency results
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Final score = manager average × {MANAGER_WEIGHT * 100}% + employee
            average × {EMPLOYEE_WEIGHT * 100}%. Managers and employees cannot see
            each other&apos;s scores.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users className="size-4" />}
            label="Employees"
            value={rows.length}
            hint="In this mock cycle"
          />
          <StatCard
            icon={<CheckCircle2 className="size-4" />}
            label="Fully scored"
            value={completeCount}
            hint="Both sides submitted"
          />
          <StatCard
            icon={<CircleDashed className="size-4" />}
            label="Pending"
            value={pendingCount}
            hint="Waiting on one or both"
          />
          <StatCard
            icon={<Scale className="size-4" />}
            label="Avg final"
            value={avgFinal != null ? formatScore(avgFinal) : '—'}
            hint="Across completed only"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              <h2 className="text-lg font-semibold">All employees</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Self</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.record.employeeId}
                    data-state={
                      row.record.employeeId === selectedEmployeeId
                        ? 'selected'
                        : undefined
                    }
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {row.employee?.name ?? row.record.employeeId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.employee?.department}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{row.manager?.name ?? '—'}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.employeeAvg != null
                        ? formatScore(row.employeeAvg)
                        : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.managerAvg != null
                        ? formatScore(row.managerAvg)
                        : '—'}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {row.finalScore != null
                        ? formatScore(row.finalScore)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={
                          row.record.employeeId === selectedEmployeeId
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() =>
                          setSelectedEmployeeId(row.record.employeeId)
                        }
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </article>

          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Score breakdown</h2>
            {selected ? (
              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-xl font-semibold">
                    {selected.employee?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Manager: {selected.manager?.name}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant={selected.employeeDone ? 'default' : 'secondary'}
                    >
                      Employee {selected.employeeDone ? 'done' : 'pending'}
                    </Badge>
                    <Badge
                      variant={selected.managerDone ? 'default' : 'secondary'}
                    >
                      Manager {selected.managerDone ? 'done' : 'pending'}
                    </Badge>
                    {selected.finalScore != null ? (
                      <Badge variant="outline">
                        Final {formatScore(selected.finalScore)} / 5
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">
                          Competency
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Employee
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Manager
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Weighted
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPETENCIES.map((competency) => {
                        const emp =
                          selected.record.employeeScores?.[competency.id]
                        const mgr =
                          selected.record.managerScores?.[competency.id]
                        const weighted = perCompetency?.[competency.id]
                        return (
                          <tr
                            key={competency.id}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2">{competency.name}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {emp ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {mgr ?? '—'}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2 text-right font-medium tabular-nums',
                                weighted != null && 'text-primary',
                              )}
                            >
                              {weighted != null ? formatScore(weighted) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-border bg-[oklch(0.98_0.005_106)] px-4 py-3 text-sm">
                  <p>
                    <span className="font-medium">Weights:</span> manager{' '}
                    {MANAGER_WEIGHT * 100}% · employee {EMPLOYEE_WEIGHT * 100}%
                  </p>
                  {selected.finalScore != null &&
                  selected.managerAvg != null &&
                  selected.employeeAvg != null ? (
                    <p className="mt-1 tabular-nums text-muted-foreground">
                      {formatScore(selected.managerAvg)} × {MANAGER_WEIGHT} +{' '}
                      {formatScore(selected.employeeAvg)} × {EMPLOYEE_WEIGHT} ={' '}
                      <span className="font-semibold text-foreground">
                        {formatScore(selected.finalScore)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      Final score appears once both sides have submitted.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Select an employee to inspect scores.
              </p>
            )}
          </article>
        </section>
      </div>
    </div>
  )
}
