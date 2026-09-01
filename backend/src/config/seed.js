const CompUser = require("../models/CompUser");
const CompAssessment = require("../models/CompAssessment");
const { USER_ROLES } = require("../constants/userRoles");

const SEED_USERS = [
  {
    externalId: "admin-1",
    name: "Sara Al Hashimi",
    email: "sara.admin@sobha.com",
    employeeCode: "ADM001",
    title: "HR Admin",
    department: "People & Culture",
    role: USER_ROLES.ADMIN,
    managerExternalId: null,
  },
  {
    externalId: "mgr-1",
    name: "Omar Khalid",
    email: "omar.khalid@sobha.com",
    employeeCode: "MGR001",
    title: "Engineering Manager",
    department: "Technology",
    role: USER_ROLES.MANAGER,
    managerExternalId: null,
  },
  {
    externalId: "mgr-2",
    name: "Layla Mansour",
    email: "layla.mansour@sobha.com",
    employeeCode: "MGR002",
    title: "Operations Manager",
    department: "Operations",
    role: USER_ROLES.MANAGER,
    managerExternalId: null,
  },
  {
    externalId: "emp-1",
    name: "Ahmed Hassan",
    email: "ahmed.hassan@sobha.com",
    employeeCode: "EMP001",
    title: "Software Engineer",
    department: "Technology",
    role: USER_ROLES.EMPLOYEE,
    managerExternalId: "mgr-1",
  },
  {
    externalId: "emp-2",
    name: "Fatima Noor",
    email: "fatima.noor@sobha.com",
    employeeCode: "EMP002",
    title: "Frontend Engineer",
    department: "Technology",
    role: USER_ROLES.EMPLOYEE,
    managerExternalId: "mgr-1",
  },
  {
    externalId: "emp-3",
    name: "Yousef Ali",
    email: "yousef.ali@sobha.com",
    employeeCode: "EMP003",
    title: "QA Engineer",
    department: "Technology",
    role: USER_ROLES.EMPLOYEE,
    managerExternalId: "mgr-1",
  },
  {
    externalId: "emp-4",
    name: "Noura Saeed",
    email: "noura.saeed@sobha.com",
    employeeCode: "EMP004",
    title: "Operations Analyst",
    department: "Operations",
    role: USER_ROLES.EMPLOYEE,
    managerExternalId: "mgr-2",
  },
  {
    externalId: "emp-5",
    name: "Karim Faris",
    email: "karim.faris@sobha.com",
    employeeCode: "EMP005",
    title: "Process Specialist",
    department: "Operations",
    role: USER_ROLES.EMPLOYEE,
    managerExternalId: "mgr-2",
  },
];

function scores(communication, collaboration, results, innovation, accountability) {
  return { communication, collaboration, results, innovation, accountability };
}

const SEED_ASSESSMENTS = [
  {
    employeeExternalId: "emp-1",
    managerExternalId: "mgr-1",
    employeeScores: scores(4, 4, 5, 3, 4),
    managerScores: scores(4, 5, 4, 4, 5),
    employeeSubmittedAt: new Date("2026-07-10T09:00:00.000Z"),
    managerSubmittedAt: new Date("2026-07-11T11:30:00.000Z"),
  },
  {
    employeeExternalId: "emp-2",
    managerExternalId: "mgr-1",
    employeeScores: scores(5, 4, 4, 5, 4),
    managerScores: null,
    employeeSubmittedAt: new Date("2026-07-12T14:20:00.000Z"),
    managerSubmittedAt: null,
  },
  {
    employeeExternalId: "emp-3",
    managerExternalId: "mgr-1",
    employeeScores: null,
    managerScores: scores(3, 4, 4, 3, 4),
    employeeSubmittedAt: null,
    managerSubmittedAt: new Date("2026-07-13T08:15:00.000Z"),
  },
  {
    employeeExternalId: "emp-4",
    managerExternalId: "mgr-2",
    employeeScores: scores(4, 5, 4, 4, 5),
    managerScores: scores(5, 4, 5, 4, 4),
    employeeSubmittedAt: new Date("2026-07-09T10:00:00.000Z"),
    managerSubmittedAt: new Date("2026-07-10T16:45:00.000Z"),
  },
  {
    employeeExternalId: "emp-5",
    managerExternalId: "mgr-2",
    employeeScores: null,
    managerScores: null,
    employeeSubmittedAt: null,
    managerSubmittedAt: null,
  },
];

async function seedDatabase() {
  const userCount = await CompUser.countDocuments();
  if (userCount > 0) {
    console.log("[Seed] Database already has users — skipping seed.");
    return;
  }

  console.log("[Seed] Seeding SOBHA COMPASS demo data…");

  const userByExternalId = new Map();

  for (const seedUser of SEED_USERS) {
    const created = await CompUser.create({
      externalId: seedUser.externalId,
      email: seedUser.email,
      name: seedUser.name,
      employeeCode: seedUser.employeeCode,
      department: seedUser.department,
      title: seedUser.title,
      role: seedUser.role,
      managerRef: null,
    });
    userByExternalId.set(seedUser.externalId, created);
  }

  for (const seedUser of SEED_USERS) {
    if (!seedUser.managerExternalId) continue;
    const user = userByExternalId.get(seedUser.externalId);
    const manager = userByExternalId.get(seedUser.managerExternalId);
    if (!user || !manager) continue;
    user.managerRef = manager._id;
    await user.save();
  }

  for (const seedAssessment of SEED_ASSESSMENTS) {
    const employee = userByExternalId.get(seedAssessment.employeeExternalId);
    const manager = userByExternalId.get(seedAssessment.managerExternalId);
    if (!employee || !manager) continue;

    await CompAssessment.create({
      employeeRef: employee._id,
      managerRef: manager._id,
      employeeScores: seedAssessment.employeeScores,
      managerScores: seedAssessment.managerScores,
      employeeSubmittedAt: seedAssessment.employeeSubmittedAt,
      managerSubmittedAt: seedAssessment.managerSubmittedAt,
    });
  }

  console.log("[Seed] Demo users and assessments created.");
}

async function resetToSeed() {
  await CompAssessment.deleteMany({});
  await CompUser.deleteMany({});
  await seedDatabase();
}

module.exports = {
  SEED_USERS,
  seedDatabase,
  resetToSeed,
};
