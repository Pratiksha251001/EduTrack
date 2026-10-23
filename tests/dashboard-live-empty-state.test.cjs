const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const supabase = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");
const dashboard = fs.readFileSync("frontend/src/pages/Dashboard.tsx", "utf8");
const hod = fs.readFileSync("frontend/src/pages/HODDashboard.tsx", "utf8");

test("configured Supabase mode starts without mock fallbacks", () => {
  assert.match(supabase, /private liveFallback<T>\(fallback: T\[\]\): T\[\]/);
  assert.match(supabase, /return isSupabaseConfigured \? \[\] : fallback;/);
  assert.match(
    supabase,
    /departments = this\.load\("departments", this\.liveFallback\(mockDepartments\)\)/,
  );
  assert.match(
    supabase,
    /attendance = this\.load\("attendance", this\.liveFallback\(mockAttendance\)\)/,
  );
  assert.match(
    supabase,
    /class_coordinator_assignments[\s\S]*this\.liveFallback\(mockClassCoordinatorAssignments\)/,
  );
});

test("live synchronization includes attendance and assignment tables", () => {
  for (const table of [
    "class_coordinator_assignments",
    "teacher_subjects",
    "attendance",
  ]) {
    assert.match(supabase, new RegExp(`\\"${table}\\"`));
  }
  assert.match(
    supabase,
    /if \(!error && Array\.isArray\(data\)\) \{[\s\S]*\(this as any\)\[table\] = data;/,
  );
});

test("demo restoration is excluded from configured live initialization", () => {
  assert.match(
    supabase,
    /if \(!isSupabaseConfigured\) \{[\s\S]*this\.restoreDemoData\(\)/,
  );
  assert.match(
    supabase,
    /else \{\s*this\.syncReady = this\.syncFromSupabase\(\);\s*\}/,
  );
  assert.match(supabase, /public ensureDemoDataLoaded\(\)/);
});

test("admin dashboard renders honest empty attendance states", () => {
  assert.doesNotMatch(dashboard, /:\s*88;/);
  assert.match(dashboard, /No attendance recorded today/);
  assert.match(dashboard, /No attendance data available/);
  assert.match(dashboard, /No students available\./);
});

test("HOD dashboard contains no fabricated attendance or department fallback", () => {
  assert.doesNotMatch(hod, /:\s*86;/);
  assert.doesNotMatch(hod, /\{ date: "Mon", rate: 84 \}/);
  assert.doesNotMatch(hod, /myDepartment\?\.code \|\| "CSE"/);
  assert.match(hod, /if \(entries\.length === 0\) return \[\];/);
  assert.match(hod, /No attendance data available/);
  assert.match(hod, /myDepartment\?\.code \|\| "Unassigned"/);
});
