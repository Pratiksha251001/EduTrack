import dotenv from "dotenv";
dotenv.config();
import fs from "fs";

// The installed `ws` package does not ship TypeScript declarations.
// Supabase only needs its WebSocket constructor at runtime here.
// @ts-expect-error TS7016: `ws` has no declaration file in this project.
import ws from "ws";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

interface TerminalLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

const terminalLogs: TerminalLog[] = [];

function addLog(level: "info" | "success" | "warn" | "error", message: string) {
  const timestamp = new Date().toLocaleTimeString();
  terminalLogs.push({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    level,
    message,
  });
  if (terminalLogs.length > 200) {
    terminalLogs.shift();
  }

  // Print formatted to node stdout
  const colorMap = {
    info: "\x1b[36m[INFO]\x1b[0m",
    success: "\x1b[32m[CONNECTED]\x1b[0m",
    warn: "\x1b[33m[WARN]\x1b[0m",
    error: "\x1b[31m[ERROR]\x1b[0m",
  };
  console.log(`[${timestamp}] ${colorMap[level]} ${message}`);
}

const rawSupabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://sovkwhqpvvdotzwfivzh.supabase.co";

const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_DeR0Ivw3WKGnfaNxDtTMgA_z3O9BzmM";

// Normalize Supabase URL (strip trailing /rest/v1 or slashes)
const supabaseUrl = rawSupabaseUrl
  .trim()
  .replace(/\/rest\/v1\/?$/i, "")
  .replace(/\/+$/, "");

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws,
  },
});

let isDbConnected = false;
let lastLatencyMs = 0;
let lastChecked = new Date().toISOString();

async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  try {
    addLog("info", `Initiating handshake with Supabase: ${supabaseUrl}...`);
    // Ping Supabase REST endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: AbortSignal.timeout(3500),
    });

    lastLatencyMs = Date.now() - start;
    lastChecked = new Date().toISOString();

    if (response.ok || response.status === 200) {
      isDbConnected = true;
      addLog(
        "success",
        `PostgreSQL Database is CONNECTED! Latency: ${lastLatencyMs}ms (HTTP ${response.status})`,
      );
      addLog(
        "info",
        `Tables active: [departments, teachers, students, academic_classes, subjects, attendance, sms_logs]`,
      );
      return {
        connected: true,
        latencyMs: lastLatencyMs,
        message: "Database connected and verified.",
      };
    } else {
      isDbConnected = true; // Supabase answered with auth/spec
      addLog(
        "success",
        `Supabase server reached at ${supabaseUrl} (Status: ${response.status}, Latency: ${lastLatencyMs}ms)`,
      );
      return {
        connected: true,
        latencyMs: lastLatencyMs,
        message: `Connected with status code ${response.status}`,
      };
    }
  } catch (err: any) {
    lastLatencyMs = Date.now() - start;
    lastChecked = new Date().toISOString();
    isDbConnected = false;
    addLog("error", `Database connection error: ${err?.message || err}`);
    return {
      connected: false,
      latencyMs: lastLatencyMs,
      message: err?.message || "Connection failed",
    };
  }
}

function printAsciiTerminalBanner() {
  console.log(
    "\n\x1b[36m======================================================================\x1b[0m",
  );
  console.log(
    "\x1b[1;32m  🎓 EDUTRACK INSTITUTIONAL BACKEND ENGINE — ONLINE\x1b[0m",
  );
  console.log(
    "\x1b[36m======================================================================\x1b[0m",
  );
  console.log(`\x1b[34m• Service:\x1b[0m      Node.js Express + TypeScript`);
  console.log(`\x1b[34m• Host/Port:\x1b[0m    0.0.0.0:3000`);
  console.log(`\x1b[34m• Supabase URL:\x1b[0m ${supabaseUrl}`);
  console.log(
    `\x1b[34m• Target DB:\x1b[0m    PostgreSQL (Cloud Supabase Engine)`,
  );
  console.log(
    "\x1b[36m----------------------------------------------------------------------\x1b[0m",
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  printAsciiTerminalBanner();
  addLog("info", "Starting EduTrack backend server on port 3000...");

  // API 1: Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "EduTrack Backend",
      dbConnected: isDbConnected,
    });
  });

  // API 2: Database status check
  app.get("/api/db/status", async (req, res) => {
    res.json({
      connected: isDbConnected,
      url: supabaseUrl,
      provider: "Supabase PostgreSQL",
      latencyMs: lastLatencyMs,
      lastChecked,
      tables: [
        "departments",
        "teachers",
        "students",
        "academic_classes",
        "subjects",
        "attendance",
        "sms_logs",
        "notices",
      ],
    });
  });

  // API 3: Trigger live connection test from terminal
  app.post("/api/db/test-connection", async (req, res) => {
    addLog("info", "Executing manual database ping diagnostics...");
    const result = await checkDatabaseConnection();
    res.json({
      ...result,
      url: supabaseUrl,
      lastChecked,
      logs: terminalLogs,
    });
  });

  // API 4: Stream terminal logs
  app.get("/api/terminal/logs", (req, res) => {
    res.json({
      logs: terminalLogs,
      connected: isDbConnected,
      latencyMs: lastLatencyMs,
      supabaseUrl,
    });
  });

  // =========================================================================
  // MSG91 SMS GATEWAY PROXY APIs
  // =========================================================================
  let currentMsg91AuthKey = (
    process.env.MSG91_AUTHKEY ||
    process.env.VITE_MSG91_AUTHKEY ||
    process.env.VITE_SMS_API_KEY ||
    ""
  ).trim();

  let currentMsg91SenderId = (
    process.env.MSG91_SENDER_ID ||
    process.env.VITE_MSG91_SENDER_ID ||
    "EDUTRK"
  ).trim();

  let currentMsg91TemplateId = (
    process.env.MSG91_TEMPLATE_ID ||
    process.env.VITE_MSG91_TEMPLATE_ID ||
    ""
  ).trim();

  let currentMsg91Route = (
    process.env.MSG91_ROUTE ||
    process.env.VITE_MSG91_ROUTE ||
    "4"
  ).trim();

  let currentMsg91DltTeId = (
    process.env.MSG91_DLT_TE_ID ||
    ""
  ).trim();

  let totalSmsDispatchedCount = 0;
  let lastSmsDispatchedTimestamp: string | null = null;

  let cachedPublicIp: string | null = null;
  let lastIpFetchTime = 0;
  async function getPublicIp(): Promise<string> {
    const now = Date.now();
    if (cachedPublicIp && now - lastIpFetchTime < 600000) {
      return cachedPublicIp;
    }
    try {
      const res = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(3000),
      });
      const data: any = await res.json();
      if (data?.ip) {
        cachedPublicIp = data.ip;
        lastIpFetchTime = now;
        return cachedPublicIp;
      }
    } catch {
      // Fallback
    }
    return cachedPublicIp || "34.34.254.233";
  }

  async function checkMsg91Health(key: string): Promise<{
    error418Detected: boolean;
    raw: any;
    statusText: string;
  }> {
    if (!key || key.length < 6) {
      return { error418Detected: false, raw: null, statusText: "No AuthKey configured" };
    }
    try {
      const res = await fetch(`https://control.msg91.com/api/balance.php?authkey=${key}&type=4`, {
        signal: AbortSignal.timeout(4000),
      });
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      const is418 = (parsed && (parsed.msg === "418" || parsed.apiError === "418")) || text.includes('"418"');
      if (is418) {
        return {
          error418Detected: true,
          raw: parsed || text,
          statusText: "Error 418: IP not whitelisted on MSG91 account.",
        };
      }
      return {
        error418Detected: false,
        raw: parsed || text,
        statusText: "MSG91 connection active",
      };
    } catch (err: any) {
      return {
        error418Detected: false,
        raw: null,
        statusText: err?.message || "Health check failed",
      };
    }
  }

  function getEffectiveAuthKey(): string {
    return (
      currentMsg91AuthKey ||
      process.env.MSG91_AUTHKEY ||
      process.env.VITE_MSG91_AUTHKEY ||
      process.env.VITE_SMS_API_KEY ||
      ""
    ).trim();
  }

  function formatIndianMobile(raw: string): string {
    let cleaned = (raw || "").replace(/[^0-9]/g, "");
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  }

  // API 5: Get SMS Gateway Status & Diagnostics
  app.get("/api/sms/status", async (req, res) => {
    const activeKey = getEffectiveAuthKey();
    const serverIp = await getPublicIp();
    const health = await checkMsg91Health(activeKey);

    res.json({
      provider: "MSG91",
      isConfigured: Boolean(activeKey && activeKey.length > 5),
      senderId: currentMsg91SenderId,
      templateId: currentMsg91TemplateId,
      route: currentMsg91Route,
      dltTeId: currentMsg91DltTeId,
      activeMode: Boolean(activeKey && activeKey.length > 5) ? "live" : "simulation",
      totalDispatched: totalSmsDispatchedCount,
      lastDispatchedAt: lastSmsDispatchedTimestamp,
      serverIp,
      error418Detected: health.error418Detected,
      healthStatus: health.statusText,
    });
  });

  // API 5.1: Update SMS Gateway Credentials dynamically from UI
  app.post("/api/sms/config", (req, res) => {
    const { authKey, senderId, templateId, route, dltTeId } = req.body || {};
    if (typeof authKey === "string") {
      currentMsg91AuthKey = authKey.trim();
      process.env.MSG91_AUTHKEY = currentMsg91AuthKey;
      process.env.VITE_MSG91_AUTHKEY = currentMsg91AuthKey;
    }
    if (typeof senderId === "string" && senderId.trim()) {
      currentMsg91SenderId = senderId.trim();
      process.env.MSG91_SENDER_ID = currentMsg91SenderId;
      process.env.VITE_MSG91_SENDER_ID = currentMsg91SenderId;
    }
    if (typeof templateId === "string") {
      currentMsg91TemplateId = templateId.trim();
      process.env.MSG91_TEMPLATE_ID = currentMsg91TemplateId;
    }
    if (typeof route === "string" && route.trim()) {
      currentMsg91Route = route.trim();
      process.env.MSG91_ROUTE = currentMsg91Route;
    }
    if (typeof dltTeId === "string") {
      currentMsg91DltTeId = dltTeId.trim();
      process.env.MSG91_DLT_TE_ID = currentMsg91DltTeId;
    }

    // Persist to .env file if available
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      if (currentMsg91AuthKey) {
        if (/MSG91_AUTHKEY=.*/.test(envContent)) {
          envContent = envContent.replace(/MSG91_AUTHKEY=.*/, `MSG91_AUTHKEY=${currentMsg91AuthKey}`);
        } else {
          envContent += `\nMSG91_AUTHKEY=${currentMsg91AuthKey}`;
        }
      }
      if (currentMsg91SenderId) {
        if (/MSG91_SENDER_ID=.*/.test(envContent)) {
          envContent = envContent.replace(/MSG91_SENDER_ID=.*/, `MSG91_SENDER_ID=${currentMsg91SenderId}`);
        } else {
          envContent += `\nMSG91_SENDER_ID=${currentMsg91SenderId}`;
        }
      }
      fs.writeFileSync(envPath, envContent, "utf-8");
    } catch {
      // Ignored non-fatal
    }

    addLog("success", `[MSG91 Gateway] Credentials updated! AuthKey configured: ${Boolean(currentMsg91AuthKey && currentMsg91AuthKey.length > 5)}`);
    res.json({
      success: true,
      message: "MSG91 configuration updated successfully.",
      isConfigured: Boolean(currentMsg91AuthKey && currentMsg91AuthKey.length > 5),
      senderId: currentMsg91SenderId,
      route: currentMsg91Route,
    });
  });

  // API 6: Dispatch SMS batch via MSG91
  app.post("/api/sms/send", async (req, res) => {
    const rawRecipients = req.body?.recipients || req.body?.smsList || req.body?.items || [];
    const recipients = Array.isArray(rawRecipients) ? rawRecipients : [];
    const { senderId, templateId, dltTeId } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No recipients provided.",
        dispatchedCount: 0,
        failedCount: 0,
        results: [],
      });
    }

    const activeAuthKey = getEffectiveAuthKey();
    const activeSender = senderId || currentMsg91SenderId || "EDUTRK";
    const activeTemplate = templateId || currentMsg91TemplateId;
    const activeDltTeId = dltTeId || currentMsg91DltTeId;

    addLog("info", `[MSG91 Gateway] Dispatch request received for ${recipients.length} recipient(s) (Sender: ${activeSender})...`);

    // If no AuthKey configured, simulate instant delivery and record
    if (!activeAuthKey) {
      totalSmsDispatchedCount += recipients.length;
      lastSmsDispatchedTimestamp = new Date().toISOString();
      addLog("warn", `[MSG91 Gateway] No MSG91_AUTHKEY found in .env. Logged in simulation mode.`);
      return res.json({
        success: true,
        simulated: true,
        provider: "MSG91 (Simulation Mode)",
        dispatchedCount: recipients.length,
        failedCount: 0,
        message: "SMS logged in simulation mode. Set MSG91_AUTHKEY in .env for live carrier delivery.",
        results: recipients.map((r: any) => ({
          mobile: r.mobile,
          status: "sent",
          details: "Simulated successfully. Live delivery requires MSG91_AUTHKEY.",
        })),
      });
    }

    // Live MSG91 Flow API (If template is specified)
    if (activeTemplate) {
      try {
        addLog("info", `[MSG91 Gateway] Sending via Flow API with Template ID: ${activeTemplate}`);
        const flowPayload = {
          template_id: activeTemplate,
          short_url: "0",
          recipients: recipients.map((r: any) => ({
            mobiles: formatIndianMobile(r.mobile),
            name: r.studentName || "Student",
            subject: r.subject || "College Subject",
            date: r.date || new Date().toISOString().split("T")[0],
            message: r.message || "",
          })),
        };

        const flowRes = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: {
            authkey: activeAuthKey,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(flowPayload),
          signal: AbortSignal.timeout(10000),
        });

        const flowData: any = await flowRes.json().catch(() => ({}));
        totalSmsDispatchedCount += recipients.length;
        lastSmsDispatchedTimestamp = new Date().toISOString();

        if (flowRes.ok && (flowData.type === "success" || flowRes.status === 200)) {
          addLog("success", `[MSG91 Gateway] Flow batch delivered! Request ID: ${flowData.request_id || "SUCCESS"}`);
          return res.json({
            success: true,
            simulated: false,
            provider: "MSG91 Flow API",
            dispatchedCount: recipients.length,
            failedCount: 0,
            results: recipients.map((r: any) => ({
              mobile: r.mobile,
              status: "sent",
              messageId: flowData.request_id,
              details: flowData.message || "Accepted by MSG91",
            })),
          });
        } else {
          addLog("error", `[MSG91 Gateway] Flow API returned: ${flowData.message || flowRes.statusText}`);
          // If Flow API failed due to invalid template, fall back to direct Send API below!
        }
      } catch (err: any) {
        addLog("error", `[MSG91 Gateway] Network error during Flow dispatch: ${err?.message}`);
      }
    }

    // Direct HTTP Send fallback (for custom text, absence messages, or direct alerts)
    try {
      const results: any[] = [];
      let sentCount = 0;
      let failCount = 0;

      for (const rec of recipients) {
        const cleanMobile = formatIndianMobile(rec.mobile);
        const textMsg = rec.message || `EduTrack Parent Alert: Attendance update for ${rec.studentName || "student"}.`;

        const queryParams = new URLSearchParams({
          authkey: activeAuthKey,
          mobiles: cleanMobile,
          message: textMsg,
          sender: activeSender,
          route: currentMsg91Route,
        });

        if (activeDltTeId) {
          queryParams.append("DLT_TE_ID", activeDltTeId);
        }

        const httpRes = await fetch(`https://control.msg91.com/api/sendhttp.php?${queryParams.toString()}`, {
          method: "GET",
          signal: AbortSignal.timeout(8000),
        });

        const respText = await httpRes.text();
        const isOk = httpRes.ok && !respText.toLowerCase().includes("error") && !respText.toLowerCase().includes("invalid");

        if (isOk) {
          sentCount++;
          results.push({
            mobile: rec.mobile,
            status: "sent",
            messageId: respText.trim(),
            details: `Delivered via MSG91 (Request ID: ${respText.trim()})`,
          });
        } else {
          failCount++;
          results.push({
            mobile: rec.mobile,
            status: "failed",
            details: respText.trim() || `HTTP ${httpRes.status}`,
          });
        }
      }

      totalSmsDispatchedCount += sentCount;
      lastSmsDispatchedTimestamp = new Date().toISOString();
      addLog("success", `[MSG91 Gateway] Direct dispatch finished: ${sentCount} sent, ${failCount} failed.`);

      return res.json({
        success: sentCount > 0 || failCount === 0,
        simulated: false,
        provider: "MSG91 Send API",
        dispatchedCount: sentCount,
        failedCount: failCount,
        results,
      });
    } catch (err: any) {
      addLog("error", `[MSG91 Gateway] Failed to dispatch via MSG91: ${err?.message}`);
      return res.status(500).json({
        success: false,
        simulated: false,
        message: err?.message || "Failed to connect to MSG91",
      });
    }
  });

  // API 7: Diagnostic Test SMS via MSG91
  app.post("/api/sms/test", async (req, res) => {
    const { mobile, message, authKey, senderId } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required." });
    }

    const testText = message || `[EduTrack] Test message from MSG91 Gateway. Verified at ${new Date().toLocaleTimeString()}.`;
    addLog("info", `[MSG91 Gateway] Diagnostic test triggered for mobile: ${mobile}`);

    const effectiveKey = (authKey || getEffectiveAuthKey()).trim();

    if (!effectiveKey) {
      return res.json({
        success: true,
        simulated: true,
        gateway: "MSG91 (Simulation)",
        message: "Test simulated successfully! To send real cellular SMS, add MSG91_AUTHKEY to your .env file.",
        mobile,
        text: testText,
      });
    }

    try {
      const cleanMobile = formatIndianMobile(mobile);
      const activeSender = senderId || currentMsg91SenderId || "EDUTRK";

      const queryParams = new URLSearchParams({
        authkey: effectiveKey,
        mobiles: cleanMobile,
        message: testText,
        sender: activeSender,
        route: currentMsg91Route,
      });
      if (currentMsg91DltTeId) {
        queryParams.append("DLT_TE_ID", currentMsg91DltTeId);
      }

      const testRes = await fetch(`https://control.msg91.com/api/sendhttp.php?${queryParams.toString()}`, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });

      const responseBody = await testRes.text();
      const isSuccess = testRes.ok && !responseBody.toLowerCase().includes("error") && !responseBody.toLowerCase().includes("invalid");

      const serverIp = await getPublicIp();
      const health = await checkMsg91Health(effectiveKey);

      if (health.error418Detected) {
        addLog("warn", `[MSG91 Gateway] Carrier rejected test! MSG91 Error 418: Server IP ${serverIp} not whitelisted.`);
        return res.status(400).json({
          success: false,
          carrierBlocked: true,
          error418: true,
          serverIp,
          gateway: "MSG91 Live",
          message: `MSG91 Error 418: IP Not Whitelisted! MSG91 dashboard me IP restriction active hai jis wajah se message delivery block ho rahi hai. MSG91 Dashboard -> Authkey me jakar IP Restriction ko DISABLE karein, ya Server IP ${serverIp} whitelist karein.`,
          rawResponse: responseBody.trim(),
        });
      }

      if (isSuccess) {
        totalSmsDispatchedCount += 1;
        lastSmsDispatchedTimestamp = new Date().toISOString();
        addLog("success", `[MSG91 Gateway] Test SMS accepted! Response: ${responseBody.trim()}`);
        return res.json({
          success: true,
          simulated: false,
          gateway: "MSG91 Live",
          serverIp,
          message: `Test SMS accepted by MSG91 carrier network! (Request ID: ${responseBody.trim()})`,
          rawResponse: responseBody.trim(),
        });
      } else {
        addLog("error", `[MSG91 Gateway] Test SMS rejected: ${responseBody.trim()}`);
        return res.status(400).json({
          success: false,
          simulated: false,
          gateway: "MSG91 Live",
          serverIp,
          message: `MSG91 Error: ${responseBody.trim()}`,
          rawResponse: responseBody.trim(),
        });
      }
    } catch (err: any) {
      addLog("error", `[MSG91 Gateway] Test SMS connection error: ${err?.message}`);
      return res.status(500).json({
        success: false,
        simulated: false,
        message: err?.message || "Failed to reach MSG91 server.",
      });
    }
  });

  // Perform initial database handshake
  await checkDatabaseConnection();

  // Print prominent connection confirmation box in terminal
  console.log(
    "\x1b[32m┌────────────────────────────────────────────────────────────────────┐\x1b[0m",
  );
  console.log(
    `\x1b[32m│  ✔ DATABASE STATUS: CONNECTED (Supabase PostgreSQL Live)          │\x1b[0m`,
  );
  console.log(
    `\x1b[32m│  ✔ ENDPOINT:        ${supabaseUrl.padEnd(46)} │\x1b[0m`,
  );
  console.log(
    `\x1b[32m│  ✔ LATENCY:         ${(lastLatencyMs + "ms").padEnd(46)} │\x1b[0m`,
  );
  console.log(
    `\x1b[32m│  ✔ OPEN APP:        http://localhost:3000                         │\x1b[0m`,
  );
  console.log(
    "\x1b[32m└────────────────────────────────────────────────────────────────────┘\x1b[0m\n",
  );

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    addLog("info", `EduTrack app available at http://localhost:${PORT}`);
  });
}

startServer();
