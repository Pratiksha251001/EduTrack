import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import express from "express";

import parentNotificationDispatch from "./backend/parent-notification-dispatch.cjs";
const { registerParentNotificationDispatch } = parentNotificationDispatch;

import cors from "cors";

import { WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, timingSafeEqual } from "node:crypto";

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

const supabaseUrl = rawSupabaseUrl
  .trim()
  .replace(/\/rest\/v1\/?$/i, "")
  .replace(/\/+$/, "");

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: WebSocket,
  },
});
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        transport: WebSocket,
      },
    })
  : null;

type AuthorizedRequest = express.Request & {
  actor?: { id: string; role: string; departmentId?: string | null };
};

async function requireRole(
  allowedRoles: string[],
  req: AuthorizedRequest,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);
  if (userError || !userData.user)
    return res
      .status(401)
      .json({ success: false, message: "Invalid session." });
  if (!supabaseAdmin)
    return res.status(503).json({
      success: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
    });

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role,department_id")
    .eq("user_id", userData.user.id)
    .in("role", allowedRoles)
    .limit(1);
  const authorizedRole = roleRow?.[0];
  if (roleError || !authorizedRole)
    return res
      .status(403)
      .json({ success: false, message: "This account is not authorized." });
  req.actor = {
    id: userData.user.id,
    role: authorizedRole.role,
    departmentId: authorizedRole.department_id,
  };
  next();
}

const requireAccountManager = (
  req: AuthorizedRequest,
  res: express.Response,
  next: express.NextFunction,
) => void requireRole(["admin", "hod", "class_coordinator"], req, res, next);

const requireAdmin = (
  req: AuthorizedRequest,
  res: express.Response,
  next: express.NextFunction,
) => void requireRole(["admin"], req, res, next);

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
      isDbConnected = true;
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

function printAsciiTerminalBanner(port: number) {
  console.log(
    "\n\x1b[36m======================================================================\x1b[0m",
  );
  console.log(
    "\x1b[1;32m  🎓 EDUTRACK INSTITUTIONAL BACKEND ENGINE — ONLINE\x1b[0m",
  );
  console.log(
    "\x1b[36m======================================================================\x1b[0m",
  );
  console.log(
    `\x1b[34m- Service:\x1b[0m      Node.js Express + Vite Unified Server`,
  );
  console.log(`\x1b[34m- Host/Port:\x1b[0m    0.0.0.0:${port}`);
  console.log(`\x1b[34m- Supabase URL:\x1b[0m ${supabaseUrl}`);
  console.log(
    `\x1b[34m- Target DB:\x1b[0m    PostgreSQL (Cloud Supabase Engine)`,
  );
  console.log(
    "\x1b[36m----------------------------------------------------------------------\x1b[0m",
  );
}

// =========================================================================
// UNIVERSAL MULTI-PROVIDER SMS GATEWAY PROXY APIs
// =========================================================================
const SMS_CONFIG_FILE = path.resolve(process.cwd(), "sms-gateway-config.json");

interface SmsConfigStore {
  activeProvider: "fast2sms" | "msg91" | "twilio" | "textlocal" | "custom";
  fast2sms: {
    apiKey: string;
    route: string;
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
    activeProvider:
      (process.env.SMS_PROVIDER as any) ||
      (process.env.MSG91_AUTHKEY ? "msg91" : "fast2sms"),
    fast2sms: {
      apiKey: (
        process.env.FAST2SMS_API_KEY ||
        process.env.VITE_FAST2SMS_API_KEY ||
        ""
      ).trim(),
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
      url: (
        process.env.CUSTOM_SMS_URL ||
        process.env.VITE_SMS_API_URL ||
        ""
      ).trim(),
      method: "POST",
      headers: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
      bodyTemplate: JSON.stringify(
        { to: "{clean10}", message: "{message}" },
        null,
        2,
      ),
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
    if (typeof data?.ip === "string" && data.ip.length > 0) {
      cachedPublicIp = data.ip;
      lastIpFetchTime = now;
      return data.ip;
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
      return Boolean(
        cfg.msg91?.authKey &&
        cfg.msg91.authKey.length > 5 &&
        cfg.msg91?.senderId &&
        cfg.msg91.senderId.length === 6 &&
        cfg.msg91?.templateId &&
        cfg.msg91.templateId.length > 5,
      );
    case "twilio":
      return Boolean(
        cfg.twilio?.accountSid &&
        cfg.twilio?.authToken &&
        cfg.twilio?.fromNumber,
      );
    case "textlocal":
      return Boolean(cfg.textlocal?.apiKey && cfg.textlocal.apiKey.length > 5);
    case "custom":
      return Boolean(cfg.custom?.url && cfg.custom.url.startsWith("http"));
    default:
      return false;
  }
}

async function executeSingleSmsDispatch(
  recipient: {
    mobile: string;
    message: string;
    studentName?: string;
    subject?: string;
    date?: string;
    attendanceStatus?: "absent" | "present";
    studentId?: string;
    subjectId?: string;
  },
  providerName: string,
  cfg: SmsConfigStore,
  overrideOpts?: any,
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

  // PROVIDER 1: Fast2SMS
  if (providerName === "fast2sms") {
    const apiKey = (
      overrideOpts?.apiKey ||
      overrideOpts?.authKey ||
      cfg.fast2sms.apiKey ||
      ""
    ).trim();
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
      : fData.message ||
        (ok
          ? "Accepted by Fast2SMS; delivery not confirmed"
          : `Fast2SMS HTTP ${fRes.status}`);

    return {
      success: ok,
      provider: "Fast2SMS",
      messageId: fData.request_id || (ok ? "F2S-SENT" : undefined),
      details: msgDetails,
      raw: fData,
    };
  }

  // PROVIDER 2: MSG91 - SECURE_MSG91_STAGE2
  if (providerName === "msg91") {
    const authKey = (cfg.msg91.authKey || "").trim();
    const templateId = (cfg.msg91.templateId || "").trim();
    if (!authKey || !templateId) {
      return {
        success: false,
        provider: "MSG91 Flow",
        details: "MSG91 AuthKey and Flow Template ID are required.",
      };
    }
    const studentVar = process.env.MSG91_FLOW_VAR_STUDENT || "VAR1";
    const subjectVar = process.env.MSG91_FLOW_VAR_SUBJECT || "VAR2";
    const dateVar = process.env.MSG91_FLOW_VAR_DATE || "VAR3";
    const correlationId = overrideOpts?.correlationId || randomUUID();
    const flowPayload = {
      template_id: templateId,
      short_url: "0",
      realTimeResponse: "1",
      recipients: [
        {
          mobiles: with91,
          clientId: correlationId,
          [studentVar]: recipient.studentName || "Student",
          [subjectVar]: recipient.subject || "Attendance",
          [dateVar]: recipient.date || new Date().toISOString().split("T")[0],
        },
      ],
    };
    try {
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
      const accepted = flowRes.ok && flowData.type === "success";
      return {
        success: accepted,
        provider: "MSG91 Flow",
        messageId: accepted ? flowData.request_id : undefined,
        details: accepted
          ? flowData.message || "Accepted by MSG91 Flow"
          : flowData.message || `MSG91 Flow HTTP ${flowRes.status}`,
        raw: flowData,
      };
    } catch (error: any) {
      return {
        success: false,
        provider: "MSG91 Flow",
        details: error?.message || "MSG91 Flow request failed.",
      };
    }
  }
  // PROVIDER 3: Twilio
  if (providerName === "twilio") {
    const accountSid = (
      overrideOpts?.accountSid ||
      cfg.twilio.accountSid ||
      ""
    ).trim();
    const authToken = (
      overrideOpts?.authToken ||
      cfg.twilio.authToken ||
      ""
    ).trim();
    const fromNumber = (
      overrideOpts?.fromNumber ||
      cfg.twilio.fromNumber ||
      ""
    ).trim();

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        provider: "Twilio",
        details:
          "Twilio credentials incomplete (Account SID, Auth Token, From Number required).",
      };
    }

    const params = new URLSearchParams();
    params.append("To", withPlus91);
    params.append("From", fromNumber);
    params.append("Body", text);

    const authHeader =
      "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const twRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10000),
      },
    );

    const twData: any = await twRes.json().catch(() => ({}));
    const ok = twRes.ok && Boolean(twData.sid);
    return {
      success: ok,
      provider: "Twilio",
      messageId: twData.sid,
      details: ok
        ? `Twilio response (${twData.status}); delivery not confirmed`
        : twData.message ||
          twData.error_message ||
          `Twilio HTTP ${twRes.status}`,
      raw: twData,
    };
  }

  // PROVIDER 4: Textlocal
  if (providerName === "textlocal") {
    const apiKey = (overrideOpts?.apiKey || cfg.textlocal.apiKey || "").trim();
    const sender = (
      overrideOpts?.sender ||
      cfg.textlocal.sender ||
      "TXTLCL"
    ).trim();
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
      details: ok
        ? "Accepted by Textlocal"
        : tlData.errors?.[0]?.message || `Textlocal HTTP ${tlRes.status}`,
      raw: tlData,
    };
  }

  // PROVIDER 5: Custom Gateway
  if (providerName === "custom") {
    const customUrl = (
      overrideOpts?.customUrl ||
      overrideOpts?.url ||
      cfg.custom.url ||
      ""
    ).trim();
    if (!customUrl) {
      return {
        success: false,
        provider: "Custom Gateway",
        details: "Custom Gateway URL is not configured.",
      };
    }
    const method = (
      (overrideOpts?.customMethod ||
        overrideOpts?.method ||
        cfg.custom.method ||
        "POST") as string
    ).toUpperCase();

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
        .replace(
          /{date}/g,
          recipient.date || new Date().toISOString().split("T")[0],
        )
        .replace(/{apiKey}/g, overrideOpts?.apiKey || cfg.custom.apiKey || "")
        .replace(
          /{senderId}/g,
          overrideOpts?.senderId || cfg.custom.senderId || "EDUTRK",
        );
    };

    const finalUrl = replacePlaceholders(customUrl);

    let reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const rawHeaders =
      overrideOpts?.customHeaders ||
      overrideOpts?.headers ||
      cfg.custom.headers;
    if (rawHeaders) {
      try {
        const parsed =
          typeof rawHeaders === "string"
            ? JSON.parse(replacePlaceholders(rawHeaders))
            : rawHeaders;
        reqHeaders = { ...reqHeaders, ...parsed };
      } catch {}
    }

    const fetchOpts: RequestInit = {
      method,
      headers: reqHeaders,
      signal: AbortSignal.timeout(10000),
    };

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const rawBody =
        overrideOpts?.customBody ||
        overrideOpts?.bodyTemplate ||
        cfg.custom.bodyTemplate ||
        '{"to":"{clean10}","message":"{message}"}';
      fetchOpts.body = replacePlaceholders(rawBody);
    }

    const cRes = await fetch(finalUrl, fetchOpts);
    const respText = await cRes.text();
    let parsedBody: any = null;
    try {
      parsedBody = JSON.parse(respText);
    } catch {}

    const ok =
      cRes.ok &&
      !respText.toLowerCase().includes("error") &&
      !respText.toLowerCase().includes("failed");
    return {
      success: ok,
      provider: "Custom API Gateway",
      messageId:
        parsedBody?.id ||
        parsedBody?.message_id ||
        parsedBody?.request_id ||
        (ok ? "CUSTOM-SENT" : undefined),
      details:
        parsedBody?.message ||
        (ok
          ? "Accepted by Custom API; delivery not confirmed"
          : `Custom Gateway HTTP ${cRes.status}: ${respText.slice(0, 150)}`),
      raw: parsedBody || respText,
    };
  }

  return {
    success: false,
    provider: providerName,
    details: `Unknown SMS provider: "${providerName}"`,
  };
}

// =========================================================================
// MAIN SERVER ENTRY POINT
// =========================================================================
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(
    cors({
      origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
        : true,
    }),
  );
  app.use(express.json());
  registerParentNotificationDispatch(app, {
    admin: supabaseAdmin,
    requireManager: requireAccountManager,
  });

  printAsciiTerminalBanner(PORT);
  addLog("info", `Starting EduTrack full-stack application on port ${PORT}...`);

  // Stage 1: securely provision a staff Auth account and role mapping.
  app.post("/api/admin/staff/provision", requireAdmin, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({
        success: false,
        message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      });
    }
    const { email, password, fullName, role, departmentId, teacherId } =
      req.body || {};
    if (
      !email ||
      !password ||
      !fullName ||
      !["hod", "teacher", "class_coordinator"].includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "email, password, fullName, and a valid staff role are required.",
      });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: { full_name: String(fullName).trim() },
      });
    if (createError || !created.user) {
      return res.status(400).json({
        success: false,
        message: createError?.message || "Unable to create Auth user.",
      });
    }
    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: String(fullName).trim(),
        email: normalizedEmail,
        must_change_password: true,
      });
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role, department_id: departmentId || null },
        { onConflict: "user_id,role" },
      );
    let teacherError: { message: string } | null = null;
    if (teacherId) {
      const { error } = await supabaseAdmin
        .from("teachers")
        .update({ user_id: userId })
        .eq("id", teacherId);
      teacherError = error;
    }
    if (profileError || roleError || teacherError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({
        success: false,
        message:
          profileError?.message || roleError?.message || teacherError?.message,
      });
    }
    return res.status(201).json({ success: true, userId, role });
  });

  // Persistent account lifecycle: all credentials remain in Supabase Auth.
  app.post(
    "/api/admin/accounts/provision",
    requireAccountManager,
    async (req: AuthorizedRequest, res) => {
      if (!supabaseAdmin)
        return res.status(503).json({
          success: false,
          message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        });
      const {
        email,
        password,
        fullName,
        role,
        departmentId,
        teacherId,
        studentId,
      } = req.body || {};
      const allowed = ["hod", "teacher", "class_coordinator", "student"];
      if (!email || !password || !fullName || !allowed.includes(role))
        return res.status(400).json({
          success: false,
          message: "email, password, fullName, and a valid role are required.",
        });
      if (role === "student" && !studentId)
        return res.status(400).json({
          success: false,
          message: "studentId is required for a student account.",
        });
      if (role !== "student" && !teacherId)
        return res.status(400).json({
          success: false,
          message: "teacherId is required for a staff account.",
        });
      const actor = req.actor;
      if (!actor)
        return res
          .status(401)
          .json({ success: false, message: "Authentication required." });
      if (role === "hod" && actor.role !== "admin")
        return res.status(403).json({
          success: false,
          message: "Only administrators may provision HOD accounts.",
        });
      if (actor.role === "class_coordinator" && role !== "student")
        return res.status(403).json({
          success: false,
          message: "Class Coordinators may provision student accounts only.",
        });
      if (
        actor.role !== "admin" &&
        departmentId &&
        actor.departmentId !== departmentId
      )
        return res.status(403).json({
          success: false,
          message: "You may manage accounts only in your department.",
        });
      const targetTable = role === "student" ? "students" : "teachers";
      const targetId = role === "student" ? studentId : teacherId;
      const { data: targetRecord, error: targetError } = await supabaseAdmin
        .from(targetTable)
        .select("id,department_id,user_id")
        .eq("id", targetId)
        .single();
      if (targetError || !targetRecord)
        return res.status(404).json({
          success: false,
          message: "The target student or staff record does not exist.",
        });
      if (targetRecord.user_id)
        return res.status(409).json({
          success: false,
          message: "This record is already linked to a Supabase Auth account.",
        });
      if (
        actor.role !== "admin" &&
        targetRecord.department_id !== actor.departmentId
      )
        return res.status(403).json({
          success: false,
          message: "You may manage accounts only in your department.",
        });
      const normalizedEmail = String(email).trim().toLowerCase();
      let userId = "";
      try {
        const { data: created, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password: String(password),
            email_confirm: true,
            user_metadata: { full_name: String(fullName).trim() },
          });
        if (createError || !created.user)
          throw new Error(
            createError?.message || "Unable to create Auth user.",
          );
        userId = created.user.id;
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: userId,
            full_name: String(fullName).trim(),
            email: normalizedEmail,
            must_change_password: true,
          });
        if (profileError) throw new Error(profileError.message);
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert(
            { user_id: userId, role, department_id: departmentId || null },
            { onConflict: "user_id,role" },
          );
        if (roleError) throw new Error(roleError.message);
        const table = role === "student" ? "students" : "teachers";
        const entityId = role === "student" ? studentId : teacherId;
        const { error: linkError } = await supabaseAdmin
          .from(table)
          .update({ user_id: userId })
          .eq("id", entityId);
        if (linkError) throw new Error(linkError.message);
        return res.status(201).json({ success: true, userId, role });
      } catch (error: any) {
        if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
        return res.status(400).json({
          success: false,
          message:
            error?.message ||
            "Account provisioning failed and was rolled back.",
        });
      }
    },
  );

  app.post(
    "/api/admin/accounts/update",
    requireAccountManager,
    async (req: AuthorizedRequest, res) => {
      if (!supabaseAdmin)
        return res.status(503).json({
          success: false,
          message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        });
      const {
        teacherId,
        studentId,
        email,
        fullName,
        role,
        departmentId,
        password,
        previousRollNumber,
        currentRollNumber,
        replaceDepartmentHod,
      } = req.body || {};
      const isStudent = Boolean(studentId);
      const managedRoles = ["hod", "teacher", "class_coordinator", "student"];
      if (
        Boolean(teacherId) === Boolean(studentId) ||
        !email ||
        !fullName ||
        !managedRoles.includes(role) ||
        (isStudent && role !== "student") ||
        (!isStudent && role === "student")
      )
        return res.status(400).json({
          success: false,
          message:
            "A single linked record, email, full name, and matching managed role are required.",
        });
      const normalizedPreviousRollNumber = String(
        previousRollNumber || "",
      ).trim();
      const normalizedCurrentRollNumber = String(
        currentRollNumber || "",
      ).trim();
      if (
        isStudent &&
        ((normalizedPreviousRollNumber && !normalizedCurrentRollNumber) ||
          (!normalizedPreviousRollNumber && normalizedCurrentRollNumber))
      )
        return res.status(400).json({
          success: false,
          message:
            "Both previous and current roll numbers are required when synchronizing a student account.",
        });
      if (password && String(password).length < 8)
        return res.status(400).json({
          success: false,
          message: "Passwords must contain at least 8 characters.",
        });
      const actor = req.actor;
      if (!actor)
        return res
          .status(401)
          .json({ success: false, message: "Authentication required." });
      if (actor.role === "class_coordinator" && !isStudent)
        return res.status(403).json({
          success: false,
          message: "Class Coordinators may update student accounts only.",
        });
      if (role === "hod" && actor.role !== "admin")
        return res.status(403).json({
          success: false,
          message: "Only an administrator may assign the HOD role.",
        });
      const table = isStudent ? "students" : "teachers";
      const entityId = studentId || teacherId;
      const { data: entity, error: entityError } = await supabaseAdmin
        .from(table)
        .select("id,user_id,department_id")
        .eq("id", entityId)
        .single();
      if (entityError || !entity?.user_id)
        return res.status(404).json({
          success: false,
          message: "No linked Supabase Auth account exists for this record.",
        });
      if (actor.role !== "admin" && entity.department_id !== actor.departmentId)
        return res.status(403).json({
          success: false,
          message: "You may update accounts only in your department.",
        });
      const targetDepartmentId = departmentId || entity.department_id || null;
      if (actor.role !== "admin" && targetDepartmentId !== actor.departmentId)
        return res.status(403).json({
          success: false,
          message: "You may not move accounts outside your department.",
        });
      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedName = String(fullName).trim();
      const { data: authBefore, error: authReadError } =
        await supabaseAdmin.auth.admin.getUserById(entity.user_id);
      if (authReadError || !authBefore.user)
        return res.status(404).json({
          success: false,
          message: authReadError?.message || "Linked Auth user not found.",
        });
      const { data: rolesBefore, error: rolesReadError } = await supabaseAdmin
        .from("user_roles")
        .select("role,department_id")
        .eq("user_id", entity.user_id);
      if (rolesReadError)
        return res
          .status(500)
          .json({ success: false, message: rolesReadError.message });
      const { data: profileBefore } = await supabaseAdmin
        .from("profiles")
        .select("full_name,email,must_change_password")
        .eq("id", entity.user_id)
        .maybeSingle();
      const shouldSyncTemporaryStudentPassword =
        isStudent &&
        !password &&
        profileBefore?.must_change_password === true &&
        Boolean(normalizedPreviousRollNumber) &&
        normalizedPreviousRollNumber !== normalizedCurrentRollNumber;
      if (
        shouldSyncTemporaryStudentPassword &&
        normalizedCurrentRollNumber.length < 8
      )
        return res.status(400).json({
          success: false,
          message:
            "The new roll number must contain at least 8 characters before it can become the temporary password.",
        });
      const effectivePassword = password
        ? String(password)
        : shouldSyncTemporaryStudentPassword
          ? normalizedCurrentRollNumber
          : undefined;
      let previousHod: any = null;
      let previousHodTeacher: any = null;
      try {
        if (role === "hod") {
          const { data: existingHod, error: hodError } = await supabaseAdmin
            .from("user_roles")
            .select("user_id,department_id")
            .eq("role", "hod")
            .eq("department_id", targetDepartmentId)
            .neq("user_id", entity.user_id)
            .maybeSingle();
          if (hodError) throw new Error(hodError.message);
          if (existingHod && !replaceDepartmentHod)
            return res.status(409).json({
              success: false,
              message: "This department already has an HOD.",
            });
          if (existingHod) {
            previousHod = existingHod;
            const { data: oldTeacher } = await supabaseAdmin
              .from("teachers")
              .select("id,role")
              .eq("user_id", existingHod.user_id)
              .maybeSingle();
            previousHodTeacher = oldTeacher;
            const { error: removeError } = await supabaseAdmin
              .from("user_roles")
              .delete()
              .eq("user_id", existingHod.user_id)
              .eq("role", "hod");
            if (removeError) throw new Error(removeError.message);
            const { error: addTeacherError } = await supabaseAdmin
              .from("user_roles")
              .upsert(
                {
                  user_id: existingHod.user_id,
                  role: "teacher",
                  department_id: existingHod.department_id,
                },
                { onConflict: "user_id,role" },
              );
            if (addTeacherError) throw new Error(addTeacherError.message);
            if (oldTeacher) {
              const { error: oldTeacherError } = await supabaseAdmin
                .from("teachers")
                .update({ role: "lecturer" })
                .eq("id", oldTeacher.id);
              if (oldTeacherError) throw new Error(oldTeacherError.message);
            }
          }
        }
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: entity.user_id,
            full_name: normalizedName,
            email: normalizedEmail,
            must_change_password: effectivePassword
              ? true
              : profileBefore?.must_change_password === true,
          });
        if (profileError) throw new Error(profileError.message);
        const { error: clearError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", entity.user_id)
          .in("role", managedRoles);
        if (clearError) throw new Error(clearError.message);
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: entity.user_id,
            role,
            department_id: targetDepartmentId,
          });
        if (roleError) throw new Error(roleError.message);
        if (role === "hod") {
          const { error: departmentError } = await supabaseAdmin
            .from("departments")
            .update({ hod_id: teacherId })
            .eq("id", targetDepartmentId);
          if (departmentError) throw new Error(departmentError.message);
        }
        const authUpdate: any = {
          email: normalizedEmail,
          user_metadata: { full_name: normalizedName },
        };
        if (effectivePassword) authUpdate.password = effectivePassword;
        const { error: authError } =
          await supabaseAdmin.auth.admin.updateUserById(
            entity.user_id,
            authUpdate,
          );
        if (authError) throw new Error(authError.message);
        return res.json({
          success: true,
          userId: entity.user_id,
          role,
          email: normalizedEmail,
        });
      } catch (error: any) {
        await supabaseAdmin.auth.admin.updateUserById(entity.user_id, {
          email: authBefore.user.email,
          user_metadata: authBefore.user.user_metadata,
        });
        if (profileBefore)
          await supabaseAdmin
            .from("profiles")
            .upsert({ id: entity.user_id, ...profileBefore });
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", entity.user_id)
          .in("role", managedRoles);
        if (rolesBefore?.length)
          await supabaseAdmin.from("user_roles").insert(
            rolesBefore.map((item: any) => ({
              user_id: entity.user_id,
              ...item,
            })),
          );
        if (previousHod) {
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", previousHod.user_id)
            .eq("role", "teacher");
          await supabaseAdmin
            .from("user_roles")
            .upsert(
              { ...previousHod, role: "hod" },
              { onConflict: "user_id,role" },
            );
          if (previousHodTeacher)
            await supabaseAdmin
              .from("teachers")
              .update({ role: previousHodTeacher.role })
              .eq("id", previousHodTeacher.id);
        }
        return res.status(400).json({
          success: false,
          message:
            error?.message ||
            "Account update failed and rollback was attempted.",
        });
      }
    },
  );

  app.post(
    "/api/admin/accounts/password",
    requireAccountManager,
    async (req: AuthorizedRequest, res) => {
      if (!supabaseAdmin)
        return res.status(503).json({
          success: false,
          message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        });
      const { teacherId, studentId, password } = req.body || {};
      if (
        (!teacherId && !studentId) ||
        !password ||
        String(password).length < 8
      )
        return res.status(400).json({
          success: false,
          message:
            "A linked teacher/student and password of at least 8 characters are required.",
        });
      const table = studentId ? "students" : "teachers";
      const entityId = studentId || teacherId;
      const { data: entity, error: entityError } = await supabaseAdmin
        .from(table)
        .select("user_id,department_id")
        .eq("id", entityId)
        .single();
      if (entityError || !entity?.user_id)
        return res.status(404).json({
          success: false,
          message: "No linked Supabase Auth account exists for this record.",
        });
      const actor = req.actor;
      if (!actor)
        return res
          .status(401)
          .json({ success: false, message: "Authentication required." });
      if (actor.role === "class_coordinator" && table !== "students")
        return res.status(403).json({
          success: false,
          message: "Class Coordinators may reset student passwords only.",
        });
      if (actor.role !== "admin" && entity.department_id !== actor.departmentId)
        return res.status(403).json({
          success: false,
          message: "You may reset passwords only in your department.",
        });
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(entity.user_id, {
          password: String(password),
        });
      if (updateError)
        return res
          .status(400)
          .json({ success: false, message: updateError.message });
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", entity.user_id);
      if (profileError)
        return res
          .status(500)
          .json({ success: false, message: profileError.message });
      return res.json({ success: true });
    },
  );

  // API 1: Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "EduTrack Unified Backend",
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

  // API 3: Trigger live connection test
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

  // API 5: Get Multi-Provider SMS Gateway Status
  app.get(
    "/api/sms/status",
    (req, res, next) =>
      void requireRole(
        ["admin", "hod", "teacher", "class_coordinator"],
        req,
        res,
        next,
      ),
    async (req, res) => {
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
        healthStatus: isConfigured
          ? `Active (${activeProvider.toUpperCase()} Gateway Ready)`
          : "Simulation Mode (No credentials set)",
        fast2sms: {
          apiKey: smsConfig.fast2sms?.apiKey ? "configured" : "",
          route: smsConfig.fast2sms?.route || "q",
          isConfigured: Boolean(
            smsConfig.fast2sms?.apiKey && smsConfig.fast2sms.apiKey.length > 5,
          ),
        },
        msg91: {
          authKey: smsConfig.msg91?.authKey ? "configured" : "",
          senderId: smsConfig.msg91?.senderId || "EDUTRK",
          templateId: smsConfig.msg91?.templateId || "",
          route: smsConfig.msg91?.route || "4",
          dltTeId: smsConfig.msg91?.dltTeId || "",
          isConfigured: Boolean(
            smsConfig.msg91?.authKey && smsConfig.msg91.authKey.length > 5,
          ),
        },
        twilio: {
          accountSid: smsConfig.twilio?.accountSid ? "configured" : "",
          authToken: smsConfig.twilio?.authToken ? "configured" : "",
          fromNumber: smsConfig.twilio?.fromNumber || "",
          isConfigured: Boolean(
            cfgNotEmpty(smsConfig.twilio?.accountSid) &&
            cfgNotEmpty(smsConfig.twilio?.authToken) &&
            cfgNotEmpty(smsConfig.twilio?.fromNumber),
          ),
        },
        textlocal: {
          apiKey: smsConfig.textlocal?.apiKey ? "configured" : "",
          sender: smsConfig.textlocal?.sender || "TXTLCL",
          isConfigured: Boolean(
            smsConfig.textlocal?.apiKey &&
            smsConfig.textlocal.apiKey.length > 5,
          ),
        },
        custom: {
          urlConfigured: Boolean(smsConfig.custom?.url),
          method: smsConfig.custom?.method || "POST",
          headersConfigured: Boolean(smsConfig.custom?.headers),
          bodyTemplateConfigured: Boolean(smsConfig.custom?.bodyTemplate),
          apiKeyConfigured: Boolean(smsConfig.custom?.apiKey),
          senderId: smsConfig.custom?.senderId || "EDUTRK",
          isConfigured: Boolean(
            smsConfig.custom?.url &&
            smsConfig.custom.url.startsWith("https://"),
          ),
        },
        senderId: smsConfig.msg91?.senderId || "EDUTRK",
        templateId: smsConfig.msg91?.templateId || "",
        route: smsConfig.msg91?.route || "4",
      });
    },
  );

  function cfgNotEmpty(val?: string) {
    return Boolean(val && val.trim().length > 0);
  }

  // API 5.1: Update SMS Gateway Credentials
  app.post("/api/sms/config", requireAdmin, (req, res) => {
    const {
      activeProvider,
      provider,
      fast2sms,
      msg91,
      twilio,
      textlocal,
      custom,
      authKey,
      senderId,
      templateId,
      route,
      dltTeId,
      apiKey,
    } = req.body || {};

    const chosenProvider = (
      activeProvider ||
      provider ||
      smsConfig.activeProvider ||
      "fast2sms"
    ).toLowerCase();
    if (
      ["fast2sms", "msg91", "twilio", "textlocal", "custom"].includes(
        chosenProvider,
      )
    ) {
      smsConfig.activeProvider = chosenProvider as any;
    }

    if (fast2sms) {
      smsConfig.fast2sms = {
        apiKey:
          typeof fast2sms.apiKey === "string"
            ? fast2sms.apiKey.trim()
            : smsConfig.fast2sms.apiKey,
        route:
          typeof fast2sms.route === "string"
            ? fast2sms.route.trim()
            : smsConfig.fast2sms.route,
      };
    }

    if (
      (typeof authKey === "string" && authKey.trim()) ||
      (msg91 && typeof msg91.authKey === "string" && msg91.authKey.trim())
    ) {
      return res
        .status(400)
        .json({ success: false, message: "MSG91_AUTHKEY is server-only." });
    }

    if (msg91) {
      smsConfig.msg91 = {
        authKey: smsConfig.msg91.authKey,
        senderId:
          typeof msg91.senderId === "string"
            ? msg91.senderId.trim()
            : smsConfig.msg91.senderId,
        templateId:
          typeof msg91.templateId === "string"
            ? msg91.templateId.trim()
            : smsConfig.msg91.templateId,
        route:
          typeof msg91.route === "string"
            ? msg91.route.trim()
            : smsConfig.msg91.route,
        dltTeId:
          typeof msg91.dltTeId === "string"
            ? msg91.dltTeId.trim()
            : smsConfig.msg91.dltTeId,
      };
    }

    if (twilio) {
      smsConfig.twilio = {
        accountSid:
          typeof twilio.accountSid === "string"
            ? twilio.accountSid.trim()
            : smsConfig.twilio.accountSid,
        authToken:
          typeof twilio.authToken === "string"
            ? twilio.authToken.trim()
            : smsConfig.twilio.authToken,
        fromNumber:
          typeof twilio.fromNumber === "string"
            ? twilio.fromNumber.trim()
            : smsConfig.twilio.fromNumber,
      };
    }

    if (textlocal) {
      smsConfig.textlocal = {
        apiKey:
          typeof textlocal.apiKey === "string"
            ? textlocal.apiKey.trim()
            : smsConfig.textlocal.apiKey,
        sender:
          typeof textlocal.sender === "string"
            ? textlocal.sender.trim()
            : smsConfig.textlocal.sender,
      };
    }

    if (custom) {
      smsConfig.custom = {
        url:
          typeof custom.url === "string"
            ? custom.url.trim()
            : smsConfig.custom.url,
        method: custom.method === "GET" ? "GET" : "POST",
        headers:
          typeof custom.headers === "string"
            ? custom.headers.trim()
            : smsConfig.custom.headers,
        bodyTemplate:
          typeof custom.bodyTemplate === "string"
            ? custom.bodyTemplate.trim()
            : smsConfig.custom.bodyTemplate,
        apiKey:
          typeof custom.apiKey === "string"
            ? custom.apiKey.trim()
            : smsConfig.custom.apiKey,
        senderId:
          typeof custom.senderId === "string"
            ? custom.senderId.trim()
            : smsConfig.custom.senderId,
      };
    }

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
    const configured = isProviderConfigured(
      smsConfig.activeProvider,
      smsConfig,
    );
    addLog(
      "success",
      `[SMS Gateway] Updated active provider to ${smsConfig.activeProvider.toUpperCase()} (Configured: ${configured})`,
    );

    res.json({
      success: true,
      message: `SMS Gateway configuration updated successfully! Active Provider: ${smsConfig.activeProvider.toUpperCase()}`,
      provider: smsConfig.activeProvider,
      isConfigured: configured,
    });
  });

  // API 6: Dispatch SMS batch
  app.post(
    "/api/sms/send",
    (req, res, next) =>
      void requireRole(
        ["admin", "hod", "teacher", "class_coordinator"],
        req,
        res,
        next,
      ),
    async (req, res) => {
      const rawRecipients =
        req.body?.recipients || req.body?.smsList || req.body?.items || [];
      const recipients = Array.isArray(rawRecipients) ? rawRecipients : [];
      const chosenProvider = (
        req.body?.provider ||
        smsConfig.activeProvider ||
        "fast2sms"
      ).toLowerCase();

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

      addLog(
        "info",
        `[SMS Gateway] Dispatch request received for ${recipients.length} recipient(s) via ${chosenProvider.toUpperCase()}...`,
      );

      if (!isConfigured) {
        addLog(
          "warn",
          `[SMS Gateway] ${chosenProvider.toUpperCase()} is not configured; no SMS was sent.`,
        );
        return res.status(503).json({
          success: false,
          simulated: true,
          provider: `${chosenProvider.toUpperCase()} (Not Configured)`,
          dispatchedCount: 0,
          failedCount: recipients.length,
          message: `No SMS was sent because ${chosenProvider.toUpperCase()} is not configured.`,
          results: recipients.map((r: any) => ({
            mobile: r.mobile,
            status: "failed",
            details: "Provider not configured; no carrier request was made.",
          })),
        });
      }

      try {
        const results: any[] = [];
        let sentCount = 0;
        let failCount = 0;

        if (!supabaseAdmin) {
          return res.status(503).json({
            success: false,
            simulated: false,
            message:
              "SUPABASE_SERVICE_ROLE_KEY is required for authoritative SMS auditing.",
          });
        }
        for (const rec of recipients) {
          const normalizedMobile = parseMobile(rec.mobile).with91;
          const idempotencyKey = [
            rec.studentId || "unknown-student",
            rec.subjectId || rec.subject || "attendance",
            rec.date || "unknown-date",
            rec.attendanceStatus || "absent",
            normalizedMobile,
          ].join(":");
          const { data: existing, error: lookupError } = await supabaseAdmin
            .from("sms_logs")
            .select("id,status,provider_request_id")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (lookupError)
            throw new Error(
              `SMS duplicate check failed: ${lookupError.message}`,
            );
          if (existing) {
            const existingStatus =
              existing.status === "failed" ? "failed" : "accepted";
            if (existingStatus === "failed") failCount++;
            results.push({
              mobile: rec.mobile,
              status: existingStatus,
              messageId: existing.provider_request_id,
              details:
                "Duplicate SMS suppressed by idempotency key; no carrier request was made.",
              duplicateSuppressed: true,
            });
            continue;
          }
          const correlationId = randomUUID();
          const { data: reservation, error: reservationError } =
            await supabaseAdmin
              .from("sms_logs")
              .insert({
                student_id: rec.studentId || null,
                subject_id: rec.subjectId || null,
                student_name: rec.studentName || "Student",
                parent_mobile: normalizedMobile,
                message: rec.message,
                status: "queued",
                attendance_date:
                  rec.date || new Date().toISOString().split("T")[0],
                sent_at: new Date().toISOString(),
                provider: chosenProvider,
                delivery_status: "queued",
                correlation_id: correlationId,
                idempotency_key: idempotencyKey,
                updated_at: new Date().toISOString(),
              })
              .select("id")
              .single();
          if (reservationError || !reservation)
            throw new Error(
              `SMS reservation failed: ${reservationError?.message || "unknown error"}`,
            );
          const dispatchRes = await executeSingleSmsDispatch(
            rec,
            chosenProvider,
            smsConfig,
            { ...req.body, correlationId },
          );
          const { error: auditError } = await supabaseAdmin
            .from("sms_logs")
            .update({
              status: dispatchRes.success ? "accepted" : "failed",
              provider_request_id: dispatchRes.messageId || null,
              delivery_status: dispatchRes.success ? "accepted" : "failed",
              failure_message: dispatchRes.success ? null : dispatchRes.details,
              updated_at: new Date().toISOString(),
            })
            .eq("id", reservation.id);
          if (auditError)
            throw new Error(`SMS audit update failed: ${auditError.message}`);
          if (dispatchRes.success) {
            sentCount++;
            results.push({
              mobile: rec.mobile,
              status: "accepted",
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
        addLog(
          "success",
          `[SMS Gateway] Live dispatch via ${chosenProvider.toUpperCase()} complete: ${sentCount} sent, ${failCount} failed.`,
        );

        return res.json({
          success: sentCount > 0 || failCount === 0,
          simulated: false,
          provider: chosenProvider.toUpperCase(),
          dispatchedCount: sentCount,
          failedCount: failCount,
          results,
        });
      } catch (err: any) {
        addLog(
          "error",
          `[SMS Gateway] Error during batch dispatch: ${err?.message}`,
        );
        return res.status(500).json({
          success: false,
          simulated: false,
          message: err?.message || "Internal error during SMS dispatch",
        });
      }
    },
  );

  // SECURE_MSG91_STAGE4: secret-protected MSG91 delivery reconciliation.
  app.post("/api/sms/msg91/delivery", async (req, res) => {
    const expectedSecret = (process.env.MSG91_WEBHOOK_SECRET || "").trim();
    const suppliedSecret = String(
      req.headers["x-msg91-webhook-secret"] || req.query.secret || "",
    ).trim();
    const expectedBuffer = Buffer.from(expectedSecret);
    const suppliedBuffer = Buffer.from(suppliedSecret);
    const secretMatches =
      expectedBuffer.length > 0 &&
      expectedBuffer.length === suppliedBuffer.length &&
      timingSafeEqual(expectedBuffer, suppliedBuffer);
    if (!secretMatches) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid webhook secret." });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({
        success: false,
        message: "Service-role client is unavailable.",
      });
    }
    const requestId = String(
      req.body?.request_id ||
        req.body?.requestId ||
        req.body?.message_id ||
        req.body?.messageId ||
        "",
    ).trim();
    const correlationId = String(
      req.body?.clientId ||
        req.body?.client_id ||
        req.body?.uuid ||
        req.body?.UUID ||
        "",
    ).trim();
    const rawStatus = String(
      req.body?.status ||
        req.body?.delivery_status ||
        req.body?.deliveryStatus ||
        "",
    )
      .trim()
      .toLowerCase();
    if ((!requestId && !correlationId) || !rawStatus) {
      return res.status(400).json({
        success: false,
        message: "A request/correlation ID and status are required.",
      });
    }
    const delivered = ["delivered", "delivery", "success"].includes(rawStatus);
    const failed = ["failed", "undelivered", "rejected", "expired"].includes(
      rawStatus,
    );
    const deliveryStatus = delivered
      ? "delivered"
      : failed
        ? "failed"
        : "accepted";
    let currentQuery = supabaseAdmin
      .from("sms_logs")
      .select("id,status,delivery_status");
    currentQuery = requestId
      ? currentQuery.eq("provider_request_id", requestId)
      : currentQuery.eq("correlation_id", correlationId);
    const { data: currentRows, error: currentError } = await currentQuery;
    if (currentError)
      return res
        .status(500)
        .json({ success: false, message: currentError.message });
    if (!currentRows?.length)
      return res
        .status(404)
        .json({ success: false, message: "No matching SMS audit record." });
    const terminalRows = currentRows.filter((row: any) =>
      ["delivered", "failed"].includes(row.delivery_status || row.status),
    );
    if (terminalRows.length) {
      return res.json({
        success: true,
        deliveryStatus:
          terminalRows[0].delivery_status || terminalRows[0].status,
        updated: 0,
        ignored: true,
        message: "Terminal delivery state preserved.",
      });
    }
    let update = supabaseAdmin.from("sms_logs").update({
      status: deliveryStatus,
      delivery_status: deliveryStatus,
      failure_code: failed
        ? String(req.body?.error_code || req.body?.code || "") || null
        : null,
      failure_message: failed
        ? String(req.body?.reason || req.body?.message || rawStatus)
        : null,
      updated_at: new Date().toISOString(),
    });
    update = requestId
      ? update.eq("provider_request_id", requestId)
      : update.eq("correlation_id", correlationId);
    const { data, error } = await update.select("id");
    if (error)
      return res.status(500).json({ success: false, message: error.message });
    if (!data?.length)
      return res
        .status(404)
        .json({ success: false, message: "No matching SMS audit record." });
    return res.json({ success: true, deliveryStatus, updated: data.length });
  });

  // API 7: Diagnostic Test SMS
  app.post("/api/sms/test", requireAdmin, async (req, res) => {
    const { mobile, message, provider, testConfig } = req.body || {};
    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required." });
    }

    const chosenProvider = (
      provider ||
      testConfig?.provider ||
      smsConfig.activeProvider ||
      "fast2sms"
    ).toLowerCase();
    const testText =
      message ||
      `[EduTrack] Test message from ${chosenProvider.toUpperCase()} Gateway. Verified at ${new Date().toLocaleTimeString()}.`;
    const serverIp = await getPublicIp();

    addLog(
      "info",
      `[SMS Gateway] Diagnostic test triggered for mobile: ${mobile} via ${chosenProvider.toUpperCase()}`,
    );

    const activeCfg: SmsConfigStore = {
      ...smsConfig,
      ...(testConfig
        ? {
            [chosenProvider]: {
              ...(smsConfig as any)[chosenProvider],
              ...testConfig,
            },
          }
        : {}),
    };

    const isConfigured = isProviderConfigured(chosenProvider, activeCfg);

    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        simulated: true,
        gateway: `${chosenProvider.toUpperCase()} (Not Configured)`,
        serverIp,
        message: `No SMS was sent because ${chosenProvider.toUpperCase()} is not configured.`,
        mobile,
        text: testText,
      });
    }

    try {
      const dispatchRes = await executeSingleSmsDispatch(
        { mobile, message: testText },
        chosenProvider,
        activeCfg,
        testConfig || req.body,
      );

      if (dispatchRes.success) {
        totalSmsDispatchedCount += 1;
        lastSmsDispatchedTimestamp = new Date().toISOString();
        addLog(
          "success",
          `[SMS Gateway] Test SMS accepted by ${chosenProvider.toUpperCase()}! Details: ${dispatchRes.details}`,
        );
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
        addLog(
          "warn",
          `[SMS Gateway] Test SMS rejected by ${chosenProvider.toUpperCase()}: ${dispatchRes.details}`,
        );
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
        message:
          err?.message ||
          `Failed to connect to ${chosenProvider.toUpperCase()} server.`,
      });
    }
  });

  // API 8: Backend Email Dispatch (EmailJS via environment variables)
  app.post(
    "/api/email/send",
    (req, res, next) =>
      void requireRole(
        ["admin", "hod", "teacher", "class_coordinator"],
        req,
        res,
        next,
      ),
    async (req, res) => {
      const actor = (req as AuthorizedRequest).actor;
      if (actor?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Generic email dispatch is restricted to administrators.",
        });
      }
      const {
        to_email,
        subject,
        message,
        student_name,
        attendance_rate,
        parent_name,
        college_name,
      } = req.body || {};

      if (!to_email) {
        return res
          .status(400)
          .json({ success: false, message: "Recipient email is required." });
      }

      const serviceId = (process.env.EMAILJS_SERVICE_ID || "").trim();
      const templateId = (process.env.EMAILJS_TEMPLATE_ID || "").trim();
      const publicKey = (
        process.env.EMAILJS_PUBLIC_KEY ||
        process.env.EMAILJS_USER_ID ||
        ""
      ).trim();
      const privateKey = (process.env.EMAILJS_PRIVATE_KEY || "").trim();

      if (!serviceId || !templateId || !publicKey || !privateKey) {
        addLog(
          "info",
          `[Email Gateway] Simulation mode for ${to_email} (EmailJS env vars not set).`,
        );
        return res.status(503).json({
          success: false,
          simulated: false,
          message: "Email provider is not configured; no email was sent.",
        });
      }

      try {
        addLog(
          "info",
          `[Email Gateway] Dispatching live email to ${to_email} via EmailJS service ${serviceId}...`,
        );
        const emailRes = await fetch(
          "https://api.emailjs.com/api/v1.0/email/send",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: serviceId,
              template_id: templateId,
              user_id: publicKey,
              accessToken: privateKey,
              template_params: {
                to_email: to_email.trim(),
                to_name: parent_name || student_name || "Parent/Guardian",
                subject: subject || "College Attendance Alert",
                message: message || "",
                student_name: student_name || "Student",
                attendance_rate: String(attendance_rate || ""),
                college_name: college_name || "SMIT College of Engineering",
                reply_to: "noreply@college.edu",
              },
            }),
          },
        );

        if (emailRes.ok) {
          addLog(
            "success",
            `[Email Gateway] Live email successfully dispatched to ${to_email}`,
          );
          return res.json({
            success: true,
            simulated: false,
            message: `Email request accepted by EmailJS for ${to_email}`,
          });
        } else {
          const errTxt = await emailRes.text();
          addLog("warn", `[Email Gateway] EmailJS dispatch error: ${errTxt}`);
          return res.status(502).json({
            success: false,
            simulated: false,
            message: `EmailJS rejected the request: ${errTxt}`,
          });
        }
      } catch (err: any) {
        addLog("error", `[Email Gateway] Network error: ${err?.message}`);
        return res.status(500).json({
          success: false,
          simulated: false,
          message: `Failed to connect to EmailJS: ${err?.message}`,
        });
      }
    },
  );

  // Check database connection in background
  checkDatabaseConnection().catch((err) => {
    console.warn("Initial DB handshake warning:", err?.message || err);
  });

  // =========================================================================
  // FRONTEND INTEGRATION: VITE MIDDLEWARE IN DEV, STATIC IN PROD
  // =========================================================================
  const frontendDir = path.resolve(process.cwd(), "frontend");
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(frontendDir, "vite.config.ts"),
      root: frontendDir,
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api/")) {
        return next();
      }
      // If requesting a static asset file with extension, don't serve index.html
      const isAsset = /\.[a-zA-Z0-9]+(\?.*)?$/.test(url);
      if (isAsset) {
        return next();
      }
      try {
        const indexHtmlPath = path.resolve(frontendDir, "index.html");
        let template = fs.readFileSync(indexHtmlPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).send(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(frontendDir, "dist");
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.resolve(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    addLog(
      "success",
      `EduTrack full-stack application running at http://0.0.0.0:${PORT}`,
    );
  });
}

startServer();
