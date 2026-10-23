const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("frontend/src/App.tsx", "utf8");
const dashboard = fs.readFileSync(
  "frontend/src/pages/ClassCoordinatorDashboard.tsx",
  "utf8",
);

test("students route passes the supported studentsOnly prop", () => {
  assert.match(
    app,
    /path="\/cc\/students"[\s\S]*<ClassCoordinatorDashboard studentsOnly \/>/,
  );
  assert.match(
    dashboard,
    /interface ClassCoordinatorDashboardProps[\s\S]*studentsOnly\?: boolean/,
  );
  assert.match(
    dashboard,
    /React\.FC<[\s\S]*ClassCoordinatorDashboardProps[\s\S]*> = \(\{ studentsOnly = false \}\)/,
  );
});

test("students-only mode hides and blocks the subjects view", () => {
  assert.match(dashboard, /\{!studentsOnly && \([\s\S]*Subjects & Faculty/);
  assert.match(
    dashboard,
    /\{!studentsOnly && activeMainTab === "subjects" && \(/,
  );
});

test("full coordinator dashboard remains the default", () => {
  assert.match(
    app,
    /path="\/coordinator\/dashboard"[\s\S]*<ClassCoordinatorDashboard \/>/,
  );
  assert.match(dashboard, /studentsOnly = false/);
});
