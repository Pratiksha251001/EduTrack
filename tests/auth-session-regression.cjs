/* Offline regression tests exercise the actual AuthProvider with mocked hooks and Auth APIs. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = process.env.AUTH_TEST_ROOT || path.resolve(__dirname, "..");
const ts = require(
  require.resolve("typescript", { paths: [root, path.join(root, "frontend")] }),
);
const input = fs.readFileSync(
  path.join(root, "frontend/src/context/AuthContext.tsx"),
  "utf8",
);
const code = ts.transpileModule(input.replaceAll("import.meta.env", "({})"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;
const tick = () => new Promise((resolve) => setTimeout(resolve, 8));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function harness(options = {}) {
  const storage = new Map(Object.entries(options.storage || {}));
  const localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };
  const slots = [];
  let cursor = 0,
    effect,
    cleanup,
    listener,
    session = options.session || null;
  let profileGate = options.profileGate,
    rolesGate = options.rolesGate,
    signInGate = options.signInGate;
  let apiInCallback = 0,
    inCallback = false,
    calls = 0;
  const user = {
    id: "auth-test",
    email: "account@example.invalid",
    user_metadata: {},
  };
  const emit = (event, value = session) => {
    if (listener) {
      inCallback = true;
      try {
        listener(event, value);
      } finally {
        inCallback = false;
      }
    }
  };
  const auth = {
    getSession: async () => {
      if (inCallback) apiInCallback++;
      return { data: { session }, error: null };
    },
    signInWithPassword: async () => {
      calls++;
      if (signInGate) await signInGate.promise;
      if (options.authError)
        return {
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        };
      session = { user };
      emit("SIGNED_IN");
      return { data: { user, session }, error: null };
    },
    signOut: async () => {
      session = null;
      emit("SIGNED_OUT", null);
      return { error: null };
    },
    onAuthStateChange: (cb) => {
      listener = cb;
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listener = null;
            },
          },
        },
      };
    },
    updateUser: async () => ({ error: null }),
  };
  const db = {
    students: [
      {
        id: "student-test",
        user_id: user.id,
        roll_number: "ROLL-TEST",
        email: user.email,
        department_id: "dept-test",
        full_name: "Test Student",
      },
    ],
    teachers: [{ employee_id: "EMP-TEST", email: user.email }],
    waitUntilReady: async () => {},
    ensureDemoDataLoaded: () => {},
  };
  function from(table) {
    const q = {
      select: () => q,
      eq: () => q,
      update: () => q,
      upsert: () => q,
      maybeSingle: () => execute(true),
      then: (ok, bad) => execute(false).then(ok, bad),
    };
    async function execute(single) {
      if (inCallback) apiInCallback++;
      if (table === "user_roles") {
        if (rolesGate) await rolesGate.promise;
        return {
          data: options.roles || [
            { role: "teacher", department_id: "dept-test" },
          ],
          error: options.roleError || null,
        };
      }
      if (table === "profiles") {
        if (profileGate) await profileGate.promise;
        return {
          data: options.missingProfile
            ? null
            : {
                full_name: "Test Account",
                must_change_password: !!options.mustChange,
              },
          error: options.profileError || null,
        };
      }
      if (table === "students")
        return {
          data: options.missingStudent ? null : db.students[0],
          error: null,
        };
      throw new Error("Unexpected mocked table " + table);
    }
    return q;
  }
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useContext: () => null,
    useState: (init) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof init === "function" ? init() : init;
      return [
        slots[i],
        (v) => {
          slots[i] = typeof v === "function" ? v(slots[i]) : v;
        },
      ];
    },
    useRef: (init) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: init };
      return slots[i];
    },
    useCallback: (fn) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = fn;
      return slots[i];
    },
    useEffect: (fn) => {
      if (!effect) effect = fn;
    },
    createElement: (_type, props) => props,
  };
  const exports = {};
  const sandbox = {
    exports,
    console: { warn: () => {}, error: () => {} },
    localStorage,
    setTimeout,
    clearTimeout,
    require: (name) => {
      if (name === "react") return react;
      if (name === "../lib/supabase")
        return {
          supabase: { auth, from },
          localDb: db,
          isSupabaseConfigured: options.configured !== false,
        };
      if (name === "../lib/authUtils")
        return {
          hasCustomPassword: () => true,
          isDefaultPassword: () => false,
        };
      if (name === "../lib/notificationService") return {};
      throw new Error("Unexpected mocked import " + name);
    },
  };
  vm.runInNewContext(code, sandbox, { filename: "AuthContext.mocked.cjs" });
  const render = () => {
    cursor = 0;
    return exports.AuthProvider({ children: null }).value;
  };
  render();
  cleanup = effect();
  return {
    render,
    emit,
    storage,
    user,
    setSession: (v) => (session = v),
    unmount: () => cleanup(),
    get apiInCallback() {
      return apiInCallback;
    },
    get signInCalls() {
      return calls;
    },
  };
}
async function main() {
  let passed = 0;
  async function test(name, fn) {
    await fn();
    passed++;
    console.log("[PASS] " + name);
  }
  await test("Expired startup session clears saved user and legacy password flags", async () => {
    const h = harness({
      storage: {
        edutrack_user: '{"id":"old"}',
        smit_role: "teacher",
        edutrack_must_change_password: "true",
      },
    });
    await tick();
    assert.equal(h.render().user, null);
    assert.equal(h.render().mustChangePassword, false);
    assert.equal(h.storage.has("smit_role"), false);
    h.unmount();
  });
  await test("Teacher credentials rejected by HOD portal cannot restore teacher modal", async () => {
    const h = harness({ mustChange: true });
    await tick();
    const result = await h
      .render()
      .loginWithCredentials("hod", "account@example.invalid", "test-input");
    await tick();
    assert.equal(result.ok, false);
    assert.match(result.message, /not authorized/);
    assert.equal(h.render().user, null);
    assert.equal(h.render().mustChangePassword, false);
    h.unmount();
  });
  await test("Department mismatch clears account and password flags", async () => {
    const h = harness({ roles: [{ role: "hod", department_id: "dept-test" }] });
    await tick();
    const result = await h
      .render()
      .loginWithCredentials(
        "hod",
        "account@example.invalid",
        "test-input",
        "other-dept",
      );
    assert.equal(result.ok, false);
    assert.equal(h.render().user, null);
    h.unmount();
  });
  await test("Profile query failure fails closed", async () => {
    const h = harness({ profileError: { message: "offline" } });
    await tick();
    assert.equal(
      (
        await h
          .render()
          .loginWithCredentials(
            "teacher",
            "account@example.invalid",
            "test-input",
          )
      ).ok,
      false,
    );
    assert.equal(h.render().user, null);
    h.unmount();
  });
  await test("Valid HOD login publishes only requested role and authoritative password flag", async () => {
    const h = harness({
      roles: [{ role: "hod", department_id: "dept-test" }],
      mustChange: true,
    });
    await tick();
    assert.equal(
      (
        await h
          .render()
          .loginWithCredentials("hod", "account@example.invalid", "test-input")
      ).ok,
      true,
    );
    assert.equal(h.render().role, "hod");
    assert.equal(h.render().mustChangePassword, true);
    h.unmount();
  });
  await test("Valid student login preserves linked student ID and roll number", async () => {
    const h = harness({
      roles: [{ role: "student", department_id: "dept-test" }],
    });
    await tick();
    assert.equal(
      (
        await h
          .render()
          .loginWithCredentials(
            "student",
            "account@example.invalid",
            "test-input",
          )
      ).ok,
      true,
    );
    assert.equal(h.render().user.student_id, "student-test");
    assert.equal(h.render().user.roll_number, "ROLL-TEST");
    h.unmount();
  });
  await test("Missing student link rejects login without leaving a modal", async () => {
    const h = harness({
      roles: [{ role: "student", department_id: "dept-test" }],
      missingStudent: true,
    });
    await tick();
    assert.equal(
      (
        await h
          .render()
          .loginWithCredentials(
            "student",
            "account@example.invalid",
            "test-input",
          )
      ).ok,
      false,
    );
    assert.equal(h.render().user, null);
    h.unmount();
  });
  await test("Late startup restoration cannot republish after SIGNED_OUT", async () => {
    const gate = deferred();
    const h = harness({
      session: { user: { id: "auth-test", email: "account@example.invalid" } },
      profileGate: gate,
    });
    await tick();
    h.setSession(null);
    h.emit("SIGNED_OUT", null);
    gate.resolve();
    await tick();
    assert.equal(h.render().user, null);
    assert.equal(h.storage.has("edutrack_user"), false);
    h.unmount();
  });
  await test("Queued SIGNED_IN restoration cannot resurrect a rejected login", async () => {
    const h = harness();
    await tick();
    h.setSession({ user: h.user });
    h.emit("SIGNED_IN");
    assert.equal(
      (
        await h
          .render()
          .loginWithCredentials("hod", "account@example.invalid", "test-input")
      ).ok,
      false,
    );
    await tick();
    assert.equal(h.render().user, null);
    assert.equal(h.apiInCallback, 0);
    h.unmount();
  });
  await test("Concurrent login attempt is rejected without a second Auth call", async () => {
    const gate = deferred();
    const h = harness({ signInGate: gate });
    await tick();
    const first = h
      .render()
      .loginWithCredentials("teacher", "account@example.invalid", "test-input");
    const second = await h
      .render()
      .loginWithCredentials("hod", "account@example.invalid", "test-input");
    assert.equal(second.ok, false);
    assert.equal(h.signInCalls, 1);
    gate.resolve();
    assert.equal((await first).ok, true);
    h.unmount();
  });
  await test("Explicit sign-out clears state and blocks late profile response", async () => {
    const gate = deferred();
    const h = harness({ profileGate: gate });
    await tick();
    const login = h
      .render()
      .loginWithCredentials("teacher", "account@example.invalid", "test-input");
    await tick();
    await h.render().signOut();
    gate.resolve();
    assert.equal((await login).ok, false);
    assert.equal(h.render().user, null);
    h.unmount();
  });
  await test("Saved demo mode survives remote SIGNED_OUT without network restoration", async () => {
    const h = harness({
      storage: {
        edutrack_is_demo: "true",
        edutrack_user: '{"id":"demo"}',
        edutrack_role: "teacher",
      },
    });
    h.emit("SIGNED_OUT", null);
    await tick();
    assert.equal(h.render().user.id, "demo");
    assert.equal(h.render().isDemo, true);
    h.unmount();
  });
  await test("Student refresh restores linked profile without forcing a password change", async () => {
    const h = harness({
      session: { user: { id: "auth-test", email: "account@example.invalid" } },
      roles: [{ role: "student", department_id: "dept-test" }],
    });
    await tick();
    assert.equal(h.render().user.student_id, "student-test");
    assert.equal(h.render().loading, false);
    assert.equal(h.render().mustChangePassword, false);
    h.unmount();
  });
  await test("Unmount cancels pending restoration", async () => {
    const gate = deferred();
    const h = harness({
      session: { user: { id: "auth-test" } },
      rolesGate: gate,
    });
    await tick();
    h.unmount();
    gate.resolve();
    await tick();
    assert.equal(h.storage.has("edutrack_user"), false);
  });
  console.log(
    "[OK] " +
      passed +
      " offline AuthProvider regression tests passed. No live accounts or network calls used.",
  );
}
main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
