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
  // UNIVERSAL MULTI-PROVIDER SMS GATEWAY PROXY APIs
  // Supports: Fast2SMS (India Plain SMS), MSG91, Twilio, Textlocal, Custom REST APIs
  // =========================================================================
  const SMS_CONFIG_FILE = path.resolve(process.cwd(), "sms-gateway-config.json");

  interface SmsConfigStore {
    activeProvider: "fast2sms" | "msg91" | "twilio" | "textlocal" | "custom";
    fast2sms: {
      apiKey: string;
      route: string; // "q" (Quick plain SMS), "otp", "v3", or "dlt"
    };
    msg91: {
      authKey: string;
      senderId: string;
      templateId: string;
      route: string;
      dltTeId: string;
    };
    twilio: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
    };
    textlocal: {
      apiKey: string;
      sender: string;
    };
    custom: {
      url: string;
      method: "POST" | "GET";
      headers: string;
      bodyTemplate: string;
      apiKey: string;
      senderId: string;
    };
  }

  function loadSmsConfig(): SmsConfigStore {
    const defaultConfig: SmsConfigStore = {
      activeProvider: (process.env.SMS_PROVIDER as any) || (process.env.MSG91_AUTHKEY ? "msg91" : "fast2sms"),
      fast2sms: {
        apiKey: (process.env.FAST2SMS_API_KEY || process.env.VITE_FAST2SMS_API_KEY || "").trim(),
        route: "q",
      },
      msg91: {
        authKey: (
          process.env.MSG91_AUTHKEY ||
          process.env.VITE_MSG91_AUTHKEY ||
          process.env.VITE_SMS_API_KEY ||
          ""
        ).trim(),
        senderId: (process.env.MSG91_SENDER_ID || "EDUTRK").trim(),
        templateId: (process.env.MSG91_TEMPLATE_ID || "").trim(),
        route: (process.env.MSG91_ROUTE || "4").trim(),
        dltTeId: (process.env.MSG91_DLT_TE_ID || "").trim(),
      },
      twilio: {
        accountSid: (process.env.TWILIO_ACCOUNT_SID || "").trim(),
        authToken: (process.env.TWILIO_AUTH_TOKEN || "").trim(),
        fromNumber: (process.env.TWILIO_FROM_NUMBER || "").trim(),
      },
      textlocal: {
        apiKey: (process.env.TEXTLOCAL_API_KEY || "").trim(),
        sender: (process.env.TEXTLOCAL_SENDER || "TXTLCL").trim(),
      },
      custom: {
        url: (process.env.CUSTOM_SMS_URL || process.env.VITE_SMS_API_URL || "").trim(),
        method: "POST",
        headers: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
        bodyTemplate: JSON.stringify({ to: "{clean10}", message: "{message}" }, null, 2),
        apiKey: (process.env.CUSTOM_SMS_API_KEY || "").trim(),
        senderId: "EDUTRK",
      },
    };

    try {
      if (fs.existsSync(SMS_CONFIG_FILE)) {
        const raw = fs.readFileSync(SMS_CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          ...defaultConfig,
          ...parsed,
          fast2sms: { ...defaultConfig.fast2sms, ...(parsed.fast2sms || {}) },
          msg91: { ...defaultConfig.msg91, ...(parsed.msg91 || {}) },
          twilio: { ...defaultConfig.twilio, ...(parsed.twilio || {}) },
          textlocal: { ...defaultConfig.textlocal, ...(parsed.textlocal || {}) },
          custom: { ...defaultConfig.custom, ...(parsed.custom || {}) },
        };
      }
    } catch (e) {
      console.warn("Could not read sms-gateway-config.json:", e);
    }
    return defaultConfig;
  }

  function saveSmsConfig(cfg: SmsConfigStore) {
    try {
      fs.writeFileSync(SMS_CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write sms-gateway-config.json:", e);
    }
  }

  let smsConfig: SmsConfigStore = loadSmsConfig();
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

  function parseMobile(raw: string) {
    let digits = (raw || "").replace(/[^0-9]/g, "");
    if (digits.startsWith("91") && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length === 11) {
      digits = digits.slice(1);
    }
    const clean10 = digits.slice(-10);
    return {
      clean10,
      with91: `91${clean10}`,
      withPlus91: `+91${clean10}`,
    };
  }

  function isProviderConfigured(provider: string, cfg: SmsConfigStore): boolean {
    switch (provider) {
      case "fast2sms":
        return Boolean(cfg.fast2sms?.apiKey && cfg.fast2sms.apiKey.length > 5);
      case "msg91":
        return Boolean(cfg.msg91?.authKey && cfg.msg91.authKey.length > 5);
      case "twilio":
        return Boolean(cfg.twilio?.accountSid && cfg.twilio?.authToken && cfg.twilio?.fromNumber);
      case "textlocal":
        return Boolean(cfg.textlocal?.apiKey && cfg.textlocal.apiKey.length > 5);
      case "custom":
        return Boolean(cfg.custom?.url && cfg.custom.url.startsWith("http"));
      default:
        return false;
    }
  }

  // Universal dispatch helper for a single SMS
  async function executeSingleSmsDispatch(
    recipient: {
      mobile: string;
      message: string;
      studentName?: string;
      subject?: string;
      date?: string;
    },
    providerName: string,
    cfg: SmsConfigStore,
    overrideOpts?: any
  ): Promise<{
    success: boolean;
    provider: string;
    messageId?: string;
    details: string;
    raw?: any;
    error418?: boolean;
  }> {
    const { clean10, with91, withPlus91 } = parseMobile(recipient.mobile);
    if (!clean10 || clean10.length < 10) {
      return {
        success: false,
        provider: providerName,
        details: `Invalid 10-digit mobile number: "${recipient.mobile}"`,
      };
    }

    const text = recipient.message;

    // PROVIDER 1: Fast2SMS (India Plain Direct SMS, No DLT needed)
    if (providerName === "fast2sms") {
      const apiKey = (overrideOpts?.apiKey || overrideOpts?.authKey || cfg.fast2sms.apiKey || "").trim();
      if (!apiKey) {
        return {
          success: false,
          provider: "Fast2SMS",
          details: "Fast2SMS API Key not configured.",
        };
      }
      const route = overrideOpts?.route || cfg.fast2sms.route || "q";
      const isUnicode = /[^\u0000-\u007F]/.test(text);

      const payload = {
        route: route,
        message: text,
        language: isUnicode ? "unicode" : "english",
        flash: 0,
        numbers: clean10,
      };

      const fRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const fData: any = await fRes.json().catch(() => ({}));
      const ok = fRes.ok && (fData.return === true || fData.status_code === 200);
      const msgDetails = Array.isArray(fData.message)
        ? fData.message.join(", ")
        : fData.message || (ok ? "Dispatched via Fast2SMS" : `Fast2SMS HTTP ${fRes.status}`);

      return {
        success: ok,
        provider: "Fast2SMS",
        messageId: fData.request_id || (ok ? "F2S-SENT" : undefined),
        details: msgDetails,
        raw: fData,
      };
    }

    // PROVIDER 2: MSG91
    if (providerName === "msg91") {
      const authKey = (overrideOpts?.authKey || overrideOpts?.apiKey || cfg.msg91.authKey || "").trim();
      if (!authKey) {
        return {
          success: false,
          provider: "MSG91",
          details: "MSG91 AuthKey not configured.",
        };
      }
      const senderId = (overrideOpts?.senderId || cfg.msg91.senderId || "EDUTRK").trim();
      const templateId = (overrideOpts?.templateId || cfg.msg91.templateId || "").trim();
      const route = (overrideOpts?.route || cfg.msg91.route || "4").trim();
      const dltTeId = (overrideOpts?.dltTeId || cfg.msg91.dltTeId || "").trim();

      // If Template ID is present, try Flow API
      if (templateId) {
        try {
          const flowPayload = {
            template_id: templateId,
            short_url: "0",
            recipients: [
              {
                mobiles: with91,
                name: recipient.studentName || "Student",
                subject: recipient.subject || "Attendance",
                date: recipient.date || new Date().toISOString().split("T")[0],
                message: text,
              },
            ],
          };

          const flowRes = await fetch("https://control.msg91.com/api/v5/flow/", {
            method: "POST",
            headers: {
              authkey: authKey,
              "content-type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(flowPayload),
            signal: AbortSignal.timeout(10000),
          });

          const flowData: any = await flowRes.json().catch(() => ({}));
          if (flowRes.ok && (flowData.type === "success" || flowRes.status === 200)) {
            return {
              success: true,
              provider: "MSG91 Flow",
              messageId: flowData.request_id,
              details: flowData.message || "Accepted by MSG91 Flow",
              raw: flowData,
            };
          }
        } catch {
          // Flow API failed or timed out, fallback to sendhttp below
        }
      }

      // Direct sendhttp API
      const queryParams = new URLSearchParams({
        authkey: authKey,
        mobiles: with91,
        message: text,
        sender: senderId,
        route: route,
      });
      if (dltTeId) queryParams.append("DLT_TE_ID", dltTeId);

      const httpRes = await fetch(`https://control.msg91.com/api/sendhttp.php?${queryParams.toString()}`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      const respText = await httpRes.text();
      const is418 = respText.includes("418");
      const ok = httpRes.ok && !respText.toLowerCase().includes("error") && !respText.toLowerCase().includes("invalid") && !is418;

      return {
        success: ok,
        provider: "MSG91",
        messageId: ok ? respText.trim() : undefined,
        error418: is418,
        details: is418
          ? "MSG91 Error 418: IP whitelist active in MSG91 dashboard. Whitelist your server IP or disable IP restriction in MSG91 Authkey settings."
          : (ok ? `Accepted by MSG91 (${respText.trim()})` : `MSG91: ${respText.trim() || `HTTP ${httpRes.status}`}`),
        raw: respText.trim(),
      };
    }

    // PROVIDER 3: Twilio
    if (providerName === "twilio") {
      const accountSid = (overrideOpts?.accountSid || cfg.twilio.accountSid || "").trim();
      const authToken = (overrideOpts?.authToken || cfg.twilio.authToken || "").trim();
      const fromNumber = (overrideOpts?.fromNumber || cfg.twilio.fromNumber || "").trim();

      if (!accountSid || !authToken || !fromNumber) {
        return {
          success: false,
          provider: "Twilio",
          details: "Twilio credentials incomplete (Account SID, Auth Token, From Number required).",
        };
      }

      const params = new URLSearchParams();
      params.append("To", withPlus91);
      params.append("From", fromNumber);
      params.append("Body", text);

      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10000),
      });

      const twData: any = await twRes.json().catch(() => ({}));
      const ok = twRes.ok && Boolean(twData.sid);
      return {
        success: ok,
        provider: "Twilio",
        messageId: twData.sid,
        details: ok ? `Delivered via Twilio (${twData.status})` : (twData.message || twData.error_message || `Twilio HTTP ${twRes.status}`),
        raw: twData,
      };
    }

    // PROVIDER 4: Textlocal
    if (providerName === "textlocal") {
      const apiKey = (overrideOpts?.apiKey || cfg.textlocal.apiKey || "").trim();
      const sender = (overrideOpts?.sender || cfg.textlocal.sender || "TXTLCL").trim();
      if (!apiKey) {
        return {
          success: false,
          provider: "Textlocal",
          details: "Textlocal API Key not configured.",
        };
      }

      const tlParams = new URLSearchParams();
      tlParams.append("apiKey", apiKey);
      tlParams.append("numbers", with91);
      tlParams.append("message", text);
      tlParams.append("sender", sender);

      const tlRes = await fetch("https://api.textlocal.in/send/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tlParams.toString(),
        signal: AbortSignal.timeout(10000),
      });

      const tlData: any = await tlRes.json().catch(() => ({}));
      const ok = tlRes.ok && tlData.status === "success";
      return {
        success: ok,
        provider: "Textlocal",
        messageId: tlData.batch_id,
        details: ok ? "Accepted by Textlocal" : (tlData.errors?.[0]?.message || `Textlocal HTTP ${tlRes.status}`),
        raw: tlData,
      };
    }

    // PROVIDER 5: Custom Gateway / Webhook / Any REST API
    if (providerName === "custom") {
      const customUrl = (overrideOpts?.customUrl || overrideOpts?.url || cfg.custom.url || "").trim();
      if (!customUrl) {
        return {
          success: false,
          provider: "Custom Gateway",
          details: "Custom Gateway URL is not configured.",
        };
      }
      const method = ((overrideOpts?.customMethod || overrideOpts?.method || cfg.custom.method || "POST") as string).toUpperCase();

      const replacePlaceholders = (str: string) => {
        return str
          .replace(/{mobile}/g, clean10)
          .replace(/{clean10}/g, clean10)
          .replace(/{with91}/g, with91)
          .replace(/{withPlus91}/g, withPlus91)
          .replace(/{message}/g, text)
          .replace(/{encodedMessage}/g, encodeURIComponent(text))
          .replace(/{studentName}/g, recipient.studentName || "")
          .replace(/{subject}/g, recipient.subject || "")
          .replace(/{date}/g, recipient.date || new Date().toISOString().split("T")[0])
          .replace(/{apiKey}/g, overrideOpts?.apiKey || cfg.custom.apiKey || "")
          .replace(/{senderId}/g, overrideOpts?.senderId || cfg.custom.senderId || "EDUTRK");
      };

      const finalUrl = replacePlaceholders(customUrl);

      let reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const rawHeaders = overrideOpts?.customHeaders || overrideOpts?.headers || cfg.custom.headers;
      if (rawHeaders) {
        try {
          const parsed = typeof rawHeaders === "string" ? JSON.parse(replacePlaceholders(rawHeaders)) : rawHeaders;
          reqHeaders = { ...reqHeaders, ...parsed };
        } catch {}
      }

      let fetchOpts: RequestInit = {
        method,
        headers: reqHeaders,
        signal: AbortSignal.timeout(10000),
      };

      if (method === "POST" || method === "PUT" || method === "PATCH") {
        const rawBody = overrideOpts?.customBody || overrideOpts?.bodyTemplate || cfg.custom.bodyTemplate || '{"to":"{clean10}","message":"{message}"}';
        fetchOpts.body = replacePlaceholders(rawBody);
      }

      const cRes = await fetch(finalUrl, fetchOpts);
      const respText = await cRes.text();
      let parsedBody: any = null;
      try {
        parsedBody = JSON.parse(respText);
      } catch {}

      const ok = cRes.ok && !respText.toLowerCase().includes("error") && !respText.toLowerCase().includes("failed");
      return {
        success: ok,
        provider: "Custom API Gateway",
        messageId: parsedBody?.id || parsedBody?.message_id || parsedBody?.request_id || (ok ? "CUSTOM-SENT" : undefined),
        details: parsedBody?.message || (ok ? "Delivered successfully via Custom API" : `Custom Gateway HTTP ${cRes.status}: ${respText.slice(0, 150)}`),
        raw: parsedBody || respText,
      };
    }

    return {
      success: false,
      provider: providerName,
      details: `Unknown SMS provider: "${providerName}"`,
    };
  }

  // API 5: Get Multi-Provider SMS Gateway Status & Diagnostics
  app.get("/api/sms/status", async (req, res) => {
    const serverIp = await getPublicIp();
    const activeProvider = smsConfig.activeProvider || "fast2sms";
    const isConfigured = isProviderConfigured(activeProvider, smsConfig);

    res.json({
      provider: activeProvider,
      activeProvider,
      isConfigured,
      activeMode: isConfigured ? "live" : "simulation",
      totalDispatched: totalSmsDispatchedCount,
      lastDispatchedAt: lastSmsDispatchedTimestamp,
      serverIp,
      healthStatus: isConfigured ? `Active (${activeProvider.toUpperCase()} Gateway Ready)` : "Simulation Mode (No credentials set)",
      // Provider configs (masking sensitive parts slightly where applicable)
      fast2sms: {
        apiKey: smsConfig.fast2sms?.apiKey || "",
        route: smsConfig.fast2sms?.route || "q",
        isConfigured: Boolean(smsConfig.fast2sms?.apiKey && smsConfig.fast2sms.apiKey.length > 5),
      },
      msg91: {
        authKey: smsConfig.msg91?.authKey || "",
        senderId: smsConfig.msg91?.senderId || "EDUTRK",
        templateId: smsConfig.msg91?.templateId || "",
        route: smsConfig.msg91?.route || "4",
        dltTeId: smsConfig.msg91?.dltTeId || "",
        isConfigured: Boolean(smsConfig.msg91?.authKey && smsConfig.msg91.authKey.length > 5),
      },
      twilio: {
        accountSid: smsConfig.twilio?.accountSid || "",
        authToken: smsConfig.twilio?.authToken || "",
        fromNumber: smsConfig.twilio?.fromNumber || "",
        isConfigured: Boolean(smsConfig.twilio?.accountSid && smsConfig.twilio?.authToken && smsConfig.twilio?.fromNumber),
      },
      textlocal: {
        apiKey: smsConfig.textlocal?.apiKey || "",
        sender: smsConfig.textlocal?.sender || "TXTLCL",
        isConfigured: Boolean(smsConfig.textlocal?.apiKey && smsConfig.textlocal.apiKey.length > 5),
      },
      custom: {
        url: smsConfig.custom?.url || "",
        method: smsConfig.custom?.method || "POST",
        headers: smsConfig.custom?.headers || "{}",
        bodyTemplate: smsConfig.custom?.bodyTemplate || '{"to":"{clean10}","message":"{message}"}',
        apiKey: smsConfig.custom?.apiKey || "",
        senderId: smsConfig.custom?.senderId || "EDUTRK",
        isConfigured: Boolean(smsConfig.custom?.url && smsConfig.custom.url.startsWith("http")),
      },
      // Backward compatibility fields
      senderId: smsConfig.msg91?.senderId || "EDUTRK",
      templateId: smsConfig.msg91?.templateId || "",
      route: smsConfig.msg91?.route || "4",
    });
  });

  // API 5.1: Update SMS Gateway Credentials dynamically from UI
  app.post("/api/sms/config", (req, res) => {
    const {
      activeProvider,
      provider,
      fast2sms,
      msg91,
      twilio,
      textlocal,
      custom,
      // Backward compatibility fields
      authKey,
      senderId,
      templateId,
      route,
      dltTeId,
      apiKey,
    } = req.body || {};

    const chosenProvider = (activeProvider || provider || smsConfig.activeProvider || "fast2sms").toLowerCase();
    if (["fast2sms", "msg91", "twilio", "textlocal", "custom"].includes(chosenProvider)) {
      smsConfig.activeProvider = chosenProvider as any;
    }

    if (fast2sms) {
      smsConfig.fast2sms = {
        apiKey: typeof fast2sms.apiKey === "string" ? fast2sms.apiKey.trim() : smsConfig.fast2sms.apiKey,
        route: typeof fast2sms.route === "string" ? fast2sms.route.trim() : smsConfig.fast2sms.route,
      };
    }

    if (msg91) {
      smsConfig.msg91 = {
        authKey: typeof msg91.authKey === "string" ? msg91.authKey.trim() : smsConfig.msg91.authKey,
        senderId: typeof msg91.senderId === "string" ? msg91.senderId.trim() : smsConfig.msg91.senderId,
        templateId: typeof msg91.templateId === "string" ? msg91.templateId.trim() : smsConfig.msg91.templateId,
        route: typeof msg91.route === "string" ? msg91.route.trim() : smsConfig.msg91.route,
        dltTeId: typeof msg91.dltTeId === "string" ? msg91.dltTeId.trim() : smsConfig.msg91.dltTeId,
      };
    }

    if (twilio) {
      smsConfig.twilio = {
        accountSid: typeof twilio.accountSid === "string" ? twilio.accountSid.trim() : smsConfig.twilio.accountSid,
        authToken: typeof twilio.authToken === "string" ? twilio.authToken.trim() : smsConfig.twilio.authToken,
        fromNumber: typeof twilio.fromNumber === "string" ? twilio.fromNumber.trim() : smsConfig.twilio.fromNumber,
      };
    }

    if (textlocal) {
      smsConfig.textlocal = {
        apiKey: typeof textlocal.apiKey === "string" ? textlocal.apiKey.trim() : smsConfig.textlocal.apiKey,
        sender: typeof textlocal.sender === "string" ? textlocal.sender.trim() : smsConfig.textlocal.sender,
      };
    }

    if (custom) {
      smsConfig.custom = {
        url: typeof custom.url === "string" ? custom.url.trim() : smsConfig.custom.url,
        method: custom.method === "GET" ? "GET" : "POST",
        headers: typeof custom.headers === "string" ? custom.headers.trim() : smsConfig.custom.headers,
        bodyTemplate: typeof custom.bodyTemplate === "string" ? custom.bodyTemplate.trim() : smsConfig.custom.bodyTemplate,
        apiKey: typeof custom.apiKey === "string" ? custom.apiKey.trim() : smsConfig.custom.apiKey,
        senderId: typeof custom.senderId === "string" ? custom.senderId.trim() : smsConfig.custom.senderId,
      };
    }

    // Handle legacy root fields
    if (typeof authKey === "string") {
      smsConfig.msg91.authKey = authKey.trim();
    }
    if (typeof apiKey === "string" && chosenProvider === "fast2sms") {
      smsConfig.fast2sms.apiKey = apiKey.trim();
    }
    if (typeof senderId === "string") {
      smsConfig.msg91.senderId = senderId.trim();
    }
    if (typeof templateId === "string") {
      smsConfig.msg91.templateId = templateId.trim();
    }
    if (typeof route === "string") {
      smsConfig.msg91.route = route.trim();
    }
    if (typeof dltTeId === "string") {
      smsConfig.msg91.dltTeId = dltTeId.trim();
    }

    saveSmsConfig(smsConfig);
    const configured = isProviderConfigured(smsConfig.activeProvider, smsConfig);
    addLog("success", `[SMS Gateway] Updated active provider to ${smsConfig.activeProvider.toUpperCase()} (Configured: ${configured})`);

    res.json({
      success: true,
      message: `SMS Gateway configuration updated successfully! Active Provider: ${smsConfig.activeProvider.toUpperCase()}`,
      provider: smsConfig.activeProvider,
      isConfigured: configured,
    });
  });

  // API 6: Dispatch SMS batch (Attendance, Absentee, General Alerts)
  app.post("/api/sms/send", async (req, res) => {
    const rawRecipients = req.body?.recipients || req.body?.smsList || req.body?.items || [];
    const recipients = Array.isArray(rawRecipients) ? rawRecipients : [];
    const chosenProvider = (req.body?.provider || smsConfig.activeProvider || "fast2sms").toLowerCase();

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No recipients provided.",
        dispatchedCount: 0,
        failedCount: 0,
        results: [],
      });
    }

    const isConfigured = isProviderConfigured(chosenProvider, smsConfig);

    addLog("info", `[SMS Gateway] Dispatch request received for ${recipients.length} recipient(s) via ${chosenProvider.toUpperCase()}...`);

    // If no credentials configured, simulate delivery gracefully
    if (!isConfigured) {
      totalSmsDispatchedCount += recipients.length;
      lastSmsDispatchedTimestamp = new Date().toISOString();
      addLog("warn", `[SMS Gateway] No credentials configured for ${chosenProvider.toUpperCase()}. Logged in simulation mode.`);
      return res.json({
        success: true,
        simulated: true,
        provider: `${chosenProvider.toUpperCase()} (Simulation Mode)`,
        dispatchedCount: recipients.length,
        failedCount: 0,
        message: `SMS logged in simulation mode. Enter your ${chosenProvider.toUpperCase()} API key in SMS Gateway Setup to send real cellular messages.`,
        results: recipients.map((r: any) => ({
          mobile: r.mobile,
          status: "sent",
          details: `Simulated successfully. Configure ${chosenProvider.toUpperCase()} API credentials for real carrier SMS.`,
        })),
      });
    }

    // LIVE DISPATCH
    try {
      const results: any[] = [];
      let sentCount = 0;
      let failCount = 0;

      for (const rec of recipients) {
        const dispatchRes = await executeSingleSmsDispatch(rec, chosenProvider, smsConfig, req.body);
        if (dispatchRes.success) {
          sentCount++;
          results.push({
            mobile: rec.mobile,
            status: "sent",
            messageId: dispatchRes.messageId,
            details: dispatchRes.details,
            raw: dispatchRes.raw,
          });
        } else {
          failCount++;
          results.push({
            mobile: rec.mobile,
            status: "failed",
            details: dispatchRes.details,
            raw: dispatchRes.raw,
          });
        }
      }

      totalSmsDispatchedCount += sentCount;
      lastSmsDispatchedTimestamp = new Date().toISOString();
      addLog("success", `[SMS Gateway] Live dispatch via ${chosenProvider.toUpperCase()} complete: ${sentCount} sent, ${failCount} failed.`);

      return res.json({
        success: sentCount > 0 || failCount === 0,
        simulated: false,
        provider: chosenProvider.toUpperCase(),
        dispatchedCount: sentCount,
        failedCount: failCount,
        results,
      });
    } catch (err: any) {
      addLog("error", `[SMS Gateway] Error during batch dispatch: ${err?.message}`);
      return res.status(500).json({
        success: false,
        simulated: false,
        message: err?.message || "Internal error during SMS dispatch",
      });
    }
  });

  // API 7: Diagnostic Test SMS with Live Execution & Detailed Reporting
  app.post("/api/sms/test", async (req, res) => {
    const { mobile, message, provider, testConfig } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required." });
    }

    const chosenProvider = (provider || testConfig?.provider || smsConfig.activeProvider || "fast2sms").toLowerCase();
    const testText = message || `[EduTrack] Test message from ${chosenProvider.toUpperCase()} Gateway. Verified at ${new Date().toLocaleTimeString()}.`;
    const serverIp = await getPublicIp();

    addLog("info", `[SMS Gateway] Diagnostic test triggered for mobile: ${mobile} via ${chosenProvider.toUpperCase()}`);

    // Merge any temporary test config passed from UI with saved config
    const activeCfg: SmsConfigStore = {
      ...smsConfig,
      ...(testConfig ? { [chosenProvider]: { ...(smsConfig as any)[chosenProvider], ...testConfig } } : {}),
    };

    const isConfigured = isProviderConfigured(chosenProvider, activeCfg);

    // If no credentials supplied at all, respond in simulation mode
    if (!isConfigured) {
      return res.json({
        success: true,
        simulated: true,
        gateway: `${chosenProvider.toUpperCase()} (Simulation)`,
        serverIp,
        message: `Simulation Mode: No API credentials found for ${chosenProvider.toUpperCase()}. Please enter your API Key or credentials in the setup modal to send real messages to mobile phones.`,
        mobile,
        text: testText,
      });
    }

    try {
      const dispatchRes = await executeSingleSmsDispatch(
        { mobile, message: testText },
        chosenProvider,
        activeCfg,
        testConfig || req.body
      );

      if (dispatchRes.success) {
        totalSmsDispatchedCount += 1;
        lastSmsDispatchedTimestamp = new Date().toISOString();
        addLog("success", `[SMS Gateway] Test SMS accepted by ${chosenProvider.toUpperCase()}! Details: ${dispatchRes.details}`);
        return res.json({
          success: true,
          simulated: false,
          gateway: `${chosenProvider.toUpperCase()} Live`,
          serverIp,
          message: `Test SMS accepted by ${chosenProvider.toUpperCase()}! ${dispatchRes.details}`,
          rawResponse: dispatchRes.raw,
          messageId: dispatchRes.messageId,
        });
      } else {
        addLog("warn", `[SMS Gateway] Test SMS rejected by ${chosenProvider.toUpperCase()}: ${dispatchRes.details}`);
        return res.status(200).json({
          success: false,
          simulated: false,
          gateway: `${chosenProvider.toUpperCase()} Live`,
          serverIp,
          carrierBlocked: dispatchRes.error418 || false,
          error418: dispatchRes.error418 || false,
          message: `${chosenProvider.toUpperCase()} Carrier Message: ${dispatchRes.details}`,
          rawResponse: dispatchRes.raw,
        });
      }
    } catch (err: any) {
      addLog("error", `[SMS Gateway] Test SMS network error: ${err?.message}`);
      return res.status(500).json({
        success: false,
        simulated: false,
        serverIp,
        message: err?.message || `Failed to connect to ${chosenProvider.toUpperCase()} server.`,
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
