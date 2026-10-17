import { apiFetch } from "./api";

export type SmsProviderType =
  "fast2sms" | "msg91" | "twilio" | "textlocal" | "custom";
export interface SmsGatewayStatus {
  provider: SmsProviderType | string;
  activeProvider?: SmsProviderType | string;
  isConfigured: boolean;
  senderId?: string;
  templateId?: string;
  route?: string;
  activeMode: "live" | "simulation";
  totalDispatched: number;
  lastDispatchedAt: string | null;
  serverIp?: string;
  error418Detected?: boolean;
  healthStatus?: string;
  fast2sms?: {
    apiKey: string;
    route: string;
    isConfigured: boolean;
  };
  msg91?: {
    authKey: string;
    senderId: string;
    templateId: string;
    route: string;
    dltTeId: string;
    isConfigured: boolean;
  };
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    isConfigured: boolean;
  };
  textlocal?: {
    apiKey: string;
    sender: string;
    isConfigured: boolean;
  };
  custom?: {
    url: string;
    method: "POST" | "GET";
    headers: string;
    bodyTemplate: string;
    apiKey: string;
    senderId: string;
    isConfigured: boolean;
  };
}

export interface SmsRecipientPayload {
  mobile: string;
  message: string;
  studentName?: string;
  studentId?: string;
  subject?: string;
  date?: string;
}

export interface SmsDispatchResponse {
  success: boolean;
  dispatchedCount: number;
  failedCount: number;
  simulated: boolean;
  provider: string;
  results: Array<{
    mobile: string;
    status: "queued" | "accepted" | "delivered" | "failed" | "simulated";
    messageId?: string;
    details?: string;
    raw?: any;
  }>;
  message?: string;
}

/**
 * Fetch current SMS gateway status from backend proxy
 */
export async function getSmsGatewayStatus(): Promise<SmsGatewayStatus> {
  try {
    const res = await apiFetch("/api/sms/status");
    if (!res.ok) {
      throw new Error(`Gateway returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn(
      "Could not reach /api/sms/status, defaulting to simulation status:",
      err,
    );
    return {
      provider: "fast2sms",
      isConfigured: false,
      senderId: "EDUTRK",
      templateId: "",
      route: "q",
      activeMode: "simulation",
      totalDispatched: 0,
      lastDispatchedAt: null,
      fast2sms: { apiKey: "", route: "q", isConfigured: false },
      msg91: {
        authKey: "",
        senderId: "EDUTRK",
        templateId: "",
        route: "4",
        dltTeId: "",
        isConfigured: false,
      },
    };
  }
}

/**
 * Dispatch SMS alerts to parents via the backend proxy
 */
export async function dispatchSmsViaGateway(
  recipients: SmsRecipientPayload[],
  options?: {
    provider?: string;
    senderId?: string;
    templateId?: string;
    dltTeId?: string;
  },
): Promise<SmsDispatchResponse> {
  if (!recipients || recipients.length === 0) {
    return {
      success: true,
      dispatchedCount: 0,
      failedCount: 0,
      simulated: true,
      provider: "SMS Gateway",
      results: [],
      message: "No recipients provided.",
    };
  }

  try {
    const res = await apiFetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients,
        provider: options?.provider,
        senderId: options?.senderId,
        templateId: options?.templateId,
        dltTeId: options?.dltTeId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Server responded with ${res.status}`);
  } catch (err: any) {
    console.error(
      "SMS API request failed; no local delivery result was fabricated:",
      err,
    );
    return {
      success: false,
      dispatchedCount: 0,
      failedCount: recipients.length,
      simulated: false,
      provider: "SMS Gateway",
      results: recipients.map((r) => ({
        mobile: r.mobile,
        status: "failed" as const,
        details: "No carrier delivery was attempted or confirmed.",
      })),
      message: err.message || "Failed to reach SMS server.",
    };
  }
}

/**
 * Send a live or diagnostic test message to verify SMS setup
 */
export async function sendTestSmsViaGateway(
  mobile: string,
  message?: string,
  options?: {
    provider?: string;
    testConfig?: any;
  },
): Promise<{
  success: boolean;
  message: string;
  simulated: boolean;
  rawResponse?: any;
  gateway?: string;
  carrierBlocked?: boolean;
  error418?: boolean;
  serverIp?: string;
  messageId?: string;
}> {
  try {
    const res = await apiFetch("/api/sms/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile,
        message,
        provider: options?.provider,
        testConfig: options?.testConfig,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to reach SMS server.",
      simulated: true,
    };
  }
}

/**
 * Update SMS Gateway credentials and options dynamically
 */
export async function updateSmsGatewayConfig(config: {
  activeProvider?: SmsProviderType | string;
  provider?: SmsProviderType | string;
  fast2sms?: {
    apiKey?: string;
    route?: string;
  };
  msg91?: {
    authKey?: string;
    senderId?: string;
    templateId?: string;
    route?: string;
    dltTeId?: string;
  };
  twilio?: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
  };
  textlocal?: {
    apiKey?: string;
    sender?: string;
  };
  custom?: {
    url?: string;
    method?: "POST" | "GET";
    headers?: string;
    bodyTemplate?: string;
    apiKey?: string;
    senderId?: string;
  };
  // Backward compatibility fields
  authKey?: string;
  apiKey?: string;
  senderId?: string;
  templateId?: string;
  route?: string;
  dltTeId?: string;
}): Promise<{
  success: boolean;
  message: string;
  isConfigured: boolean;
  provider?: string;
}> {
  try {
    const res = await apiFetch("/api/sms/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      throw new Error(`Failed to update config (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update configuration",
      isConfigured: false,
    };
  }
}
