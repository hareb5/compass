export const MANAGER_WEIGHT = 0.6
export const EMPLOYEE_WEIGHT = 0.4

export type CompetencyId =
  | 'communication'
  | 'collaboration'
  | 'results'
  | 'innovation'
  | 'accountability'

export type Competency = {
  id: CompetencyId
  name: string
  description: string
}

export const COMPETENCIES: Competency[] = [
  {
    id: 'communication',
    name: 'Communication',
    description: 'Shares information clearly and listens actively.',
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    description: 'Works effectively with others and builds trust.',
  },
  {
    id: 'results',
    name: 'Results Orientation',
    description: 'Delivers outcomes with ownership and focus.',
  },
  {
    id: 'innovation',
    name: 'Innovation',
    description: 'Improves processes and brings practical new ideas.',
  },
  {
    id: 'accountability',
    name: 'Accountability',
    description: 'Owns commitments and follows through reliably.',
  },
]

export type ScoreMap = Record<CompetencyId, number>

export function emptyScores(): ScoreMap {
  return {
    communication: 0,
    collaboration: 0,
    results: 0,
    innovation: 0,
    accountability: 0,
  }
}

export function isCompleteScores(scores: ScoreMap | null | undefined): boolean {
  if (!scores) return false
  return COMPETENCIES.every((c) => {
    const value = scores[c.id]
    return Number.isInteger(value) && value >= 1 && value <= 5
  })
}

export function averageScore(scores: ScoreMap): number {
  const total = COMPETENCIES.reduce((sum, c) => sum + scores[c.id], 0)
  return total / COMPETENCIES.length
}

export function weightedFinalScore(
  managerScores: ScoreMap,
  employeeScores: ScoreMap,
): number {
  const managerAvg = averageScore(managerScores)
  const employeeAvg = averageScore(employeeScores)
  return managerAvg * MANAGER_WEIGHT + employeeAvg * EMPLOYEE_WEIGHT
}

export function weightedPerCompetency(
  managerScores: ScoreMap,
  employeeScores: ScoreMap,
): ScoreMap {
  const result = emptyScores()
  for (const competency of COMPETENCIES) {
    result[competency.id] =
      managerScores[competency.id] * MANAGER_WEIGHT +
      employeeScores[competency.id] * EMPLOYEE_WEIGHT
  }
  return result
}

export function formatScore(value: number, digits = 1): string {
  return value.toFixed(digits)
}
