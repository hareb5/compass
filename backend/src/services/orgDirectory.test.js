const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resolveOrgIdentity } = require("./orgDirectory");
const { pickEmail, placeholderEmail, isActiveEmployee } = require("./orgFields");

const EMPLOYEES = [
  {
    EMPLOYEE_CODE: "E100",
    EMPLOYEE_NAME: "Ahmed Hassan",
    L1_MANAGER_CODE: "M10",
    L1_MANAGER_NAME: "Omar Khalid",
    EmpStatus: "Active",
    EMAIL: "ahmed.hassan@sobha.com",
    DEPARTMENT: "Technology",
    DESIGNATION: "Software Engineer",
  },
  {
    EMPLOYEE_CODE: "E101",
    EMPLOYEE_NAME: "Fatima Noor",
    L1_MANAGER_CODE: "M10",
    L1_MANAGER_NAME: "Omar Khalid",
    EmpStatus: "Active",
    EMAIL: "fatima.noor@sobha.com",
    DEPARTMENT: "Technology",
  },
  {
    EMPLOYEE_CODE: "E200",
    EMPLOYEE_NAME: "Karim Faris",
    L1_MANAGER_CODE: "M10",
    L1_MANAGER_NAME: "Omar Khalid",
    EmpStatus: "Inactive",
  },
];

describe("resolveOrgIdentity", () => {
  it("treats an L1 manager of active reports as a manager with a team", () => {
    const identity = resolveOrgIdentity(EMPLOYEES, "M10");
    assert.equal(identity.user.role, "manager");
    assert.equal(identity.user.id, "M10");
    assert.deepEqual(
      identity.reports.map((report) => report.id).sort(),
      ["E100", "E101"],
    );
    assert.equal(identity.assessments.length, 2);
    assert.equal(identity.reports[0].reportsTo, "M10");
  });

  it("treats a directory employee as an employee linked to their boss", () => {
    const identity = resolveOrgIdentity(EMPLOYEES, "E100");
    assert.equal(identity.user.role, "employee");
    assert.equal(identity.user.reportsTo, "M10");
    assert.equal(identity.user.email, "ahmed.hassan@sobha.com");
    assert.equal(identity.user.department, "Technology");
    assert.equal(identity.user.title, "Software Engineer");
    assert.equal(identity.assessments[0].managerId, "M10");
  });

  it("returns 404 for an unknown non-manager code", () => {
    assert.throws(
      () => resolveOrgIdentity(EMPLOYEES, "NOPE"),
      (error) => error.status === 404,
    );
  });
});

describe("orgFields", () => {
  it("picks email fields case-insensitively", () => {
    assert.equal(pickEmail({ email: "a@b.com" }), "a@b.com");
    assert.equal(placeholderEmail("E-100"), "e-100@org.local");
  });

  it("treats missing status as active and inactive as not active", () => {
    assert.equal(isActiveEmployee({}), true);
    assert.equal(isActiveEmployee({ EmpStatus: "Inactive" }), false);
    assert.equal(isActiveEmployee({ EmpStatus: "Active" }), true);
  });
});
