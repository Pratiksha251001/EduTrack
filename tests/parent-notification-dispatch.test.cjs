"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  registerParentNotificationDispatch,
} = require("../backend/parent-notification-dispatch.cjs");
function setup(env = {}) {
  const routes = {};
  let called = 0;
  registerParentNotificationDispatch(
    { post: (path, ...handlers) => (routes[path] = handlers) },
    {
      admin: {
        from: () => {
          called++;
          throw Error("unexpected database");
        },
      },
      requireManager: () => {},
      env,
    },
  );
  return {
    routes,
    get called() {
      return called;
    },
  };
}
function response() {
  return {
    code: 200,
    status(n) {
      this.code = n;
      return this;
    },
    json(x) {
      this.body = x;
      return this;
    },
  };
}
test("dispatch disabled by default without database access", async () => {
  const h = setup(),
    r = response();
  await h.routes["/api/parents/attendance/notify"][1]({ body: {} }, r);
  assert.equal(r.code, 503);
  assert.equal(h.called, 0);
});
test("rejects malformed student IDs before DB", async () => {
  const h = setup({ PARENT_ATTENDANCE_EMAIL_ENABLED: "true" }),
    r = response();
  await h.routes["/api/parents/attendance/notify"][1](
    {
      body: { studentId: "bad", kind: "daily_attendance", date: "2026-10-22" },
    },
    r,
  );
  assert.equal(r.code, 400);
  assert.equal(h.called, 0);
});
test("missing actor rejected before DB", async () => {
  const h = setup({ PARENT_ATTENDANCE_EMAIL_ENABLED: "true" }),
    r = response();
  await h.routes["/api/parents/attendance/notify"][1](
    {
      body: {
        studentId: "00000000-0000-4000-8000-000000000001",
        kind: "daily_attendance",
        date: "2026-10-22",
      },
    },
    r,
  );
  assert.equal(r.code, 401);
  assert.equal(h.called, 0);
});

const id = "00000000-0000-4000-8000-000000000001";
const student = {
  id,
  department_id: "dept-1",
  full_name: "Student Example",
  parent_name: "Guardian",
  parent_email: "guardian@example.com",
  parent_email_approved_at: "2026-10-22T00:00:00Z",
  parent_email_approved_by: "11111111-1111-4111-8111-111111111111",
};
const configured = {
  PARENT_ATTENDANCE_EMAIL_ENABLED: "true",
  EMAILJS_SERVICE_ID: "service",
  EMAILJS_TEMPLATE_ID: "template",
  EMAILJS_PUBLIC_KEY: "public",
  EMAILJS_PRIVATE_KEY: "private",
};
function enabled({
  records = [],
  studentRow = student,
  claim = true,
  complete = true,
  providerOk = true,
} = {}) {
  const routes = {};
  const calls = [];
  const admin = {
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        lte() {
          return Promise.resolve({ data: records, error: null });
        },
        single() {
          return Promise.resolve({ data: studentRow, error: null });
        },
      };
    },
    async rpc(name, params) {
      calls.push({ name, params });
      return {
        data: name === "claim_parent_notification" ? claim : complete,
        error: null,
      };
    },
  };
  let sends = 0;
  registerParentNotificationDispatch(
    { post: (path, ...handlers) => (routes[path] = handlers) },
    {
      admin,
      requireManager: () => {},
      env: configured,
      fetchImpl: async () => {
        sends++;
        return { ok: providerOk };
      },
    },
  );
  return {
    handler: routes["/api/parents/attendance/notify"][1],
    calls,
    get sends() {
      return sends;
    },
  };
}
async function invoke(h, kind = "low_attendance") {
  const r = response();
  await h.handler(
    {
      actor: { role: "admin", id: "actor" },
      body: { studentId: id, kind, date: "2026-10-22" },
    },
    r,
  );
  return r;
}
test("no attendance records fail closed without claiming or sending", async () => {
  const h = enabled();
  const r = await invoke(h, "daily_attendance");
  assert.equal(r.code, 422);
  assert.equal(h.calls.length, 0);
  assert.equal(h.sends, 0);
});
test("74.5 percent is below 75 without premature rounding", async () => {
  const records = Array.from({ length: 200 }, (_, i) => ({
    status: i < 149 ? "present" : "absent",
  }));
  const h = enabled({ records });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  assert.equal(h.sends, 1);
  assert.equal(h.calls[0].name, "claim_parent_notification");
});
test("duplicate claim never sends", async () => {
  const h = enabled({ records: [{ status: "absent" }], claim: false });
  const r = await invoke(h);
  assert.equal(r.code, 409);
  assert.equal(h.sends, 0);
});
test("failed completion RPC never reports provider acceptance", async () => {
  const h = enabled({ records: [{ status: "absent" }], complete: false });
  const r = await invoke(h);
  assert.equal(r.code, 503);
  assert.equal(r.body.success, false);
});
test("staff-approved stored parent email sends without parent verification", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    studentRow: { ...student },
  });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  assert.equal(h.sends, 1);
});

test("unapproved parent email is never claimed or sent", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    studentRow: {
      ...student,
      parent_email_approved_at: null,
      parent_email_approved_by: null,
    },
  });
  const r = await invoke(h);
  assert.equal(r.code, 422);
  assert.equal(h.sends, 0);
});
