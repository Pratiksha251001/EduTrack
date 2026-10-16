// EmailJS Integration Service for Real Email Alerts
// Uses official EmailJS REST API: https://api.emailjs.com/api/v1.0/email/send

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

const STORAGE_KEY = "edutrack_emailjs_config";

export function getEmailJsConfig(): EmailJsConfig {
  // 1. Direct environment variables (configured via .env file)
  const envServiceId =
    (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID ||
    (import.meta as any).env?.VITE_EMAIL_SERVICE_ID ||
    "";
  const envTemplateId =
    (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID ||
    (import.meta as any).env?.VITE_EMAIL_TEMPLATE_ID ||
    "";
  const envPublicKey =
    (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY ||
    (import.meta as any).env?.VITE_EMAIL_PUBLIC_KEY ||
    (import.meta as any).env?.VITE_EMAILJS_USER_ID ||
    "";

  if (envServiceId.trim() || envTemplateId.trim() || envPublicKey.trim()) {
    return {
      serviceId: envServiceId.trim(),
      templateId: envTemplateId.trim(),
      publicKey: envPublicKey.trim(),
    };
  }

  // 2. Fallback to localStorage if previously saved
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        serviceId: (parsed.serviceId || "").trim(),
        templateId: (parsed.templateId || "").trim(),
        publicKey: (parsed.publicKey || "").trim(),
      };
    }
  } catch (e) {
    console.warn("Failed to read emailjs config from localStorage", e);
  }

  return {
    serviceId: "",
    templateId: "",
    publicKey: "",
  };
}

export function saveEmailJsConfig(cfg: EmailJsConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("edutrack_emailjs_updated", { detail: cfg }));
  } catch (e) {
    console.warn("Failed to persist emailjs config", e);
  }
}

export function isEmailJsConfigured(): boolean {
  const cfg = getEmailJsConfig();
  return Boolean(
    cfg.serviceId.trim() &&
    cfg.templateId.trim() &&
    cfg.publicKey.trim()
  );
}

export interface SendEmailPayload {
  to_email: string;
  subject: string;
  message: string;
  student_name?: string;
  attendance_rate?: number | string;
  parent_name?: string;
  college_name?: string;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  isSimulated?: boolean;
}

/**
 * Sends a real live email via EmailJS REST API.
 * If EmailJS is not configured, returns isSimulated: true with local confirmation.
 */
export async function sendEmailAlert(payload: SendEmailPayload): Promise<SendEmailResult> {
  // 1. Try backend API dispatch first (reads EMAILJS_* from backend environment)
  try {
    const backendRes = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (!data.simulated) {
        return {
          success: data.success,
          isSimulated: false,
          message: data.message || `Live email successfully delivered to ${payload.to_email}`,
        };
      }
    }
  } catch {
    // If backend is not reached, continue to frontend client dispatch
  }

  // 2. Direct client-side EmailJS API dispatch (reads VITE_EMAILJS_* environment variables)
  const cfg = getEmailJsConfig();

  if (!cfg.serviceId.trim() || !cfg.templateId.trim() || !cfg.publicKey.trim()) {
    return {
      success: true,
      isSimulated: true,
      message: `Email alert logged in system (Simulation Mode: recipient: ${payload.to_email})`,
    };
  }

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: cfg.serviceId.trim(),
        template_id: cfg.templateId.trim(),
        user_id: cfg.publicKey.trim(),
        template_params: {
          to_email: payload.to_email.trim(),
          to_name: payload.parent_name || payload.student_name || "Parent/Guardian",
          subject: payload.subject,
          message: payload.message,
          student_name: payload.student_name || "Student",
          attendance_rate: String(payload.attendance_rate || ""),
          college_name: payload.college_name || "SMIT College of Engineering",
          reply_to: "noreply@college.edu",
        },
      }),
    });

    if (res.ok) {
      return {
        success: true,
        isSimulated: false,
        message: `Live email successfully delivered to ${payload.to_email}`,
      };
    } else {
      const errorText = await res.text();
      console.error("EmailJS API dispatch error:", errorText);
      return {
        success: false,
        message: `EmailJS error: ${errorText || res.statusText}`,
      };
    }
  } catch (err: any) {
    console.error("EmailJS network error:", err);
    return {
      success: false,
      message: `Network error sending email: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Sends a direct test verification email to check EmailJS credentials
 */
export async function sendTestEmail(targetEmail: string): Promise<SendEmailResult> {
  return sendEmailAlert({
    to_email: targetEmail,
    subject: "✅ Test Email: SMIT Smart Attendance Alert System",
    message: `Hello,\n\nThis is a verified test email sent from your College Attendance Portal via EmailJS.\n\nYour EmailJS configuration (Service ID, Template ID, and Public Key) is active and working properly!\n\nOfficial attendance alerts and <75% Defaulter Warning Notices will now be delivered live to parents and students.\n\nRegards,\nSMIT Attendance Cell`,
    student_name: "Test Verification",
    college_name: "SMIT College of Engineering",
  });
}
