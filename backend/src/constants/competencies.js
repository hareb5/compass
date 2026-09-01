const COMPETENCY_IDS = [
  "communication",
  "collaboration",
  "results",
  "innovation",
  "accountability",
];

const MANAGER_WEIGHT = 0.6;
const EMPLOYEE_WEIGHT = 0.4;

function emptyScores() {
  return {
    communication: null,
    collaboration: null,
    results: null,
    innovation: null,
    accountability: null,
  };
}

function isCompleteScores(scores) {
  if (!scores) return false;
  return COMPETENCY_IDS.every((id) => {
    const value = scores[id];
    return Number.isInteger(value) && value >= 1 && value <= 5;
  });
}

function averageScore(scores) {
  const total = COMPETENCY_IDS.reduce((sum, id) => sum + scores[id], 0);
  return total / COMPETENCY_IDS.length;
}

function weightedFinalScore(managerScores, employeeScores) {
  return (
    averageScore(managerScores) * MANAGER_WEIGHT +
    averageScore(employeeScores) * EMPLOYEE_WEIGHT
  );
}

function validateScoresPayload(scores) {
  if (!scores || typeof scores !== "object") {
    return { ok: false, message: "Scores object is required." };
  }

  const normalized = {};
  for (const id of COMPETENCY_IDS) {
    const value = scores[id];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return {
        ok: false,
        message: `Invalid score for ${id}. Must be integer 1–5.`,
      };
    }
    normalized[id] = value;
  }

  return { ok: true, scores: normalized };
}

module.exports = {
  COMPETENCY_IDS,
  MANAGER_WEIGHT,
  EMPLOYEE_WEIGHT,
  emptyScores,
  isCompleteScores,
  averageScore,
  weightedFinalScore,
  validateScoresPayload,
};
