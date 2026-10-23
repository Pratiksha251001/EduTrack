const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("frontend/src/App.tsx", "utf8");
const page = fs.readFileSync(
  "frontend/src/pages/ParentEmailVerification.tsx",
  "utf8",
);

test("verification page is a public route outside the protected shell", () => {
  assert.match(app, /path="\/verify-parent-email"/);
  const routeIndex = app.indexOf('path="/verify-parent-email"');
  const protectedShellIndex = app.indexOf("<ProtectedRoute>");
  assert.ok(routeIndex > -1);
  assert.ok(protectedShellIndex > -1);
  assert.ok(routeIndex < protectedShellIndex);
});

test("verification page validates both URL credentials before confirmation", () => {
  assert.match(page, /UUID\.test\(studentId\)/);
  assert.match(page, /TOKEN\.test\(token\)/);
  assert.match(page, /\/api\/parents\/email\/verification\/confirm/);
  assert.match(page, /JSON\.stringify\(\{ studentId, token \}\)/);
});

test("one-time token is removed and never rendered or logged", () => {
  assert.match(page, /window\.history\.replaceState/);
  assert.doesNotMatch(page, /console\.(?:log|info|warn|error)/);
  assert.doesNotMatch(page, />\s*\{token\}\s*</);
  assert.match(page, /submitted\.current/);
});

test("verification page handles success, invalid, and unavailable states", () => {
  assert.match(page, /"verified"/);
  assert.match(page, /"invalid"/);
  assert.match(page, /"unavailable"/);
  assert.match(page, /response\.status === 400/);
  assert.match(page, /payload\?\.verified === true/);
});
