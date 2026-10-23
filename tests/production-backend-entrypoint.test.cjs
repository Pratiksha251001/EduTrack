const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const render = fs.readFileSync("render.yaml", "utf8");
const rootServer = fs.readFileSync("server.ts", "utf8");
const limitedServer = fs.readFileSync("backend/server.ts", "utf8");

test("production build bundles the complete root server", () => {
  assert.match(pkg.scripts["build:server"], /^esbuild server\.ts /);
  assert.match(pkg.scripts["build:server"], /--outfile=dist\/server\.cjs$/);
  assert.equal(pkg.scripts.start, "node dist/server.cjs");
  assert.equal(
    pkg.scripts["build:render"],
    "npm run build:frontend && npm run build:server",
  );
});

test("Render blueprint uses repository root and root production scripts", () => {
  assert.match(render, /rootDir: \./);
  assert.match(render, /buildCommand: npm ci && npm run build:render/);
  assert.match(render, /startCommand: npm start/);
  assert.match(render, /healthCheckPath: \/api\/health/);
  assert.match(render, /key: NODE_ENV[\s\S]*value: production/);
  assert.doesNotMatch(render, /rootDir: backend/);
  assert.doesNotMatch(render, /npm --prefix backend/);
});

test("selected root server contains the production email routes", () => {
  assert.match(rootServer, /registerParentEmailRoutes/);
  assert.match(rootServer, /registerParentNotificationDispatch/);
  assert.match(rootServer, /"\/api\/email\/send"/);
  assert.match(rootServer, /"\/api\/health"/);
  assert.doesNotMatch(limitedServer, /"\/api\/email\/send"/);
});
