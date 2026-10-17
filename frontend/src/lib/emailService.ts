import { apiFetch } from "./api";

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
 * Requests email delivery through the authenticated EduTrack backend.
 * EmailJS credentials remain server-only and are never read or stored by the browser.
 */
export async function sendEmailAlert(
  payload: SendEmailPayload,
): Promise<SendEmailResult> {
  try {
    const response = await apiFetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      return {
        success: false,
        isSimulated: false,
        message:
          data.message || `Email server returned HTTP ${response.status}.`,
      };
    }
    return {
      success: true,
      isSimulated: false,
      message:
        data.message || `Email request accepted for ${payload.to_email}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      isSimulated: false,
      message:
        error?.message || "Failed to reach the authenticated email service.",
    };
  }
}

export async function sendTestEmail(
  targetEmail: string,
): Promise<SendEmailResult> {
  return sendEmailAlert({
    to_email: targetEmail,
    subject: "Test Email: SMIT Smart Attendance Alert System",
    message: `Hello,

This is a verified test email sent from your College Attendance Portal through the authenticated EduTrack backend.

Official attendance alerts and below-75% warning notices can now be delivered through the configured server-side email provider.

Regards,
SMIT Attendance Cell`,
    student_name: "Test Verification",
    college_name: "SMIT College of Engineering",
  });
}
