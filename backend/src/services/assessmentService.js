const {
  averageScore,
  isCompleteScores,
  weightedFinalScore,
} = require("../constants/competencies");
const { serializeUser } = require("./orgHierarchy");
const { ensureAssessment } = require("./orgSync");

function scoresToObject(scores) {
  if (!scores) return null;
  return {
    communication: scores.communication,
    collaboration: scores.collaboration,
    results: scores.results,
    innovation: scores.innovation,
    accountability: scores.accountability,
  };
}

function serializeAssessmentBase(assessment) {
  const employee = assessment.employeeRef;
  const manager = assessment.managerRef;

  return {
    employeeId: employee?.externalId ?? null,
    managerId: manager?.externalId ?? null,
    employeeScores: scoresToObject(assessment.employeeScores),
    managerScores: scoresToObject(assessment.managerScores),
    employeeSubmittedAt: assessment.employeeSubmittedAt?.toISOString() ?? null,
    managerSubmittedAt: assessment.managerSubmittedAt?.toISOString() ?? null,
  };
}

function withComputedFinals(record) {
  const employeeDone = isCompleteScores(record.employeeScores);
  const managerDone = isCompleteScores(record.managerScores);
  const finalScore =
    employeeDone && managerDone
      ? weightedFinalScore(record.managerScores, record.employeeScores)
      : null;

  return {
    ...record,
    employeeAvg: employeeDone ? averageScore(record.employeeScores) : null,
    managerAvg: managerDone ? averageScore(record.managerScores) : null,
    finalScore,
  };
}

function stripForEmployee(record) {
  return {
    employeeId: record.employeeId,
    managerId: record.managerId,
    employeeScores: record.employeeScores,
    employeeSubmittedAt: record.employeeSubmittedAt,
  };
}

function stripForManager(record) {
  return {
    employeeId: record.employeeId,
    managerId: record.managerId,
    managerScores: record.managerScores,
    managerSubmittedAt: record.managerSubmittedAt,
  };
}

function serializeAdminAssessment(assessment) {
  const base = serializeAssessmentBase(assessment);
  const employee = assessment.employeeRef;
  const manager = assessment.managerRef;

  return withComputedFinals({
    ...base,
    employee: serializeUser(employee),
    manager: serializeUser(manager),
  });
}

module.exports = {
  scoresToObject,
  serializeAssessmentBase,
  withComputedFinals,
  stripForEmployee,
  stripForManager,
  serializeAdminAssessment,
  ensureAssessment,
};
