import { SmsLanguage } from "./types";
export * from "./engineeringUtils";

export const college = {
  name: "Smart Attendance System",
  shortName: "Attendance System",
  tagline: "Manage Attendance. Alert Parents. Build Trust.",
  logoUrl: "/logo.png",
  minAttendance: 75,
  engineeringYears: [1, 2, 3, 4],
  semesters: [1, 2, 3, 4, 5, 6, 7, 8],
};

export const ACADEMIC_YEARS = ["2026-27", "2025-26", "2027-28", "2028-29"];
export const CURRENT_ACADEMIC_YEAR = "2026-27";

export interface SmsLanguageOption {
  id: SmsLanguage;
  label: string;
  subLabel: string;
  flag: string;
}

export const SMS_LANGUAGES: SmsLanguageOption[] = [
  {
    id: "en",
    label: "Eng (English)",
    subLabel: "Standard English (Default)",
    flag: "🇬🇧",
  },
  {
    id: "mr",
    label: "Marathi (मराठी)",
    subLabel: "स्थानिक पालकांसाठी मराठी संदेश",
    flag: "🇮🇳",
  },
  {
    id: "other",
    label: "Ot Msg (Other)",
    subLabel: "Bilingual / Custom Alert",
    flag: "📝",
  },
  {
    id: "bilingual_mr",
    label: "Eng + मराठी",
    subLabel: "English & Marathi",
    flag: "🌐",
  },
  {
    id: "trilingual",
    label: "त्रिभाषिक (All 3)",
    subLabel: "English + मराठी + हिंदी",
    flag: "🌐",
  },
  {
    id: "hi",
    label: "हिंदी (Hindi)",
    subLabel: "सरल हिंदी संदेश",
    flag: "🌐",
  },
];

/**
 * Remove legacy prefixes like "🚩 [मराठी संदेश]:" or "🇮🇳 [हिंदी संदेश]:" from any stored or generated message
 */
export function cleanSmsMessage(msg: string): string {
  if (!msg) return "";
  return msg
    .replace(/🚩\s*\[\s*मराठी(?:\s*संदेश)?\s*\]\s*:\s*/gi, "")
    .replace(/🇮🇳\s*\[\s*हिंदी(?:\s*संदेश)?\s*\]\s*:\s*/gi, "")
    .replace(/\[\s*मराठी(?:\s*संदेश)?\s*\]\s*:\s*/gi, "")
    .replace(/\[\s*हिंदी(?:\s*संदेश)?\s*\]\s*:\s*/gi, "")
    .replace(/🚩\s*मराठी(?:\s*संदेश)?\s*:\s*/gi, "")
    .replace(/🇮🇳\s*हिंदी(?:\s*संदेश)?\s*:\s*/gi, "")
    .replace(/🚩/g, "")
    .replace(/🇮🇳/g, "")
    .trim();
}

/**
 * Extract or generate standard short abbreviation/code for a subject
 * e.g., "Database Management Systems" -> "DMS", "Computer Networks" -> "CN"
 */
export function getSubjectShortName(subjectNameOrCode?: string): string {
  if (!subjectNameOrCode) return "Lecture";
  const trimmed = subjectNameOrCode.trim();

  // If already an acronym or short code (<= 5 chars, no spaces)
  if (trimmed.length <= 5 && !trimmed.includes(" ")) {
    return trimmed.toUpperCase();
  }

  const commonMap: Record<string, string> = {
    "database management systems": "DMS",
    "database management system": "DMS",
    dbms: "DMS",
    "computer networks": "CN",
    "computer network": "CN",
    "data structures & algorithms": "DSA",
    "data structures and algorithms": "DSA",
    "data structures": "DS",
    "design and analysis of algorithms": "DAA",
    "digital electronics & logic design": "DELD",
    "digital electronics": "DE",
    "software engineering": "SE",
    "operating systems": "OS",
    "operating system": "OS",
    "web technology": "WT",
    "web development": "WD",
    "cloud computing": "CC",
    "artificial intelligence": "AI",
    "machine learning": "ML",
    "internet of things": "IoT",
    "information security": "IS",
    "cyber security": "CS",
    "engineering mathematics i": "M-I",
    "engineering mathematics ii": "M-II",
    "engineering mathematics iii": "M-III",
    "engineering mathematics": "EM",
    "programming for problem solving in c": "PPS",
  };

  const lower = trimmed.toLowerCase();
  if (commonMap[lower]) {
    return commonMap[lower];
  }

  // Generate abbreviation from first letters of significant words
  const stopWords = new Set([
    "and",
    "&",
    "for",
    "in",
    "of",
    "the",
    "to",
    "with",
    "a",
    "an",
  ]);
  const words = trimmed
    .replace(/[()]/g, "")
    .split(/[\s\-_/]+/)
    .filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));

  if (words.length > 1) {
    const acronym = words.map((w) => w[0].toUpperCase()).join("");
    if (acronym.length >= 2 && acronym.length <= 6) {
      return acronym;
    }
  }

  return words[0] || trimmed;
}

/**
 * Single language generator functions
 */
export function getEnglishAbsenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `Dear Parent, ${studentName} is absent for ${shortSub} today. - EduTrack`;
}

export function getMarathiAbsenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `${studentName} आज ${shortSub} साठी गैरहजर आहे. - EduTrack`;
}

export function getHindiAbsenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `${studentName} आज ${shortSub} के लिए अनुपस्थित है। - EduTrack`;
}

export function getTrilingualAbsenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `Dear Parent, ${studentName} is absent for ${shortSub} today. ${studentName} आज ${shortSub} साठी गैरहजर आहे. - EduTrack`;
}

export function getBilingualMrMessage(
  studentName: string,
  date: string,
  subjectName: string,
): string {
  return getTrilingualAbsenceMessage(studentName, date, subjectName);
}

export function getBilingualHiMessage(
  studentName: string,
  date: string,
  subjectName: string,
): string {
  return getTrilingualAbsenceMessage(studentName, date, subjectName);
}

export function getOtherAbsenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `Dear Parent, ${studentName} is absent for ${shortSub} today. ${studentName} आज ${shortSub} साठी गैरहजर आहे. - EduTrack`;
}

/**
 * Presence (Present Confirmation) SMS Generator Functions
 */
export function getEnglishPresenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `Dear Parent, ${studentName} is marked PRESENT for ${shortSub} today. - EduTrack`;
}

export function getMarathiPresenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `पालकहो, विद्यार्थी ${studentName} आज ${shortSub} तासाला उपस्थित (PRESENT) आहे. - EduTrack`;
}

export function getHindiPresenceMessage(
  studentName: string,
  _date: string,
  subjectName: string,
): string {
  const shortSub = getSubjectShortName(subjectName);
  return `प्रिय अभिभावक, छात्र ${studentName} आज ${shortSub} कक्षा में उपस्थित (PRESENT) है। - EduTrack`;
}

export function generatePresenceSmsMessage(
  studentName: string,
  date: string,
  subjectName: string,
  lang: SmsLanguage = "en",
): string {
  if (lang === "mr") {
    return getMarathiPresenceMessage(studentName, date, subjectName);
  }
  if (lang === "hi") {
    return getHindiPresenceMessage(studentName, date, subjectName);
  }
  if (lang === "bilingual_mr" || lang === "trilingual") {
    const shortSub = getSubjectShortName(subjectName);
    return `Dear Parent, ${studentName} is PRESENT for ${shortSub} today. विद्यार्थी ${studentName} आज ${shortSub} तासाला उपस्थित आहे. - EduTrack`;
  }
  return getEnglishPresenceMessage(studentName, date, subjectName);
}

/**
 * Master generator function for attendance SMS alerts - formatted in English, Marathi, or Other message (default English)
 */
export function generateSmsMessage(
  studentName: string,
  date: string,
  subjectName: string,
  lang: SmsLanguage = "en",
  status: "absent" | "present" = "absent",
): string {
  if (status === "present") {
    return generatePresenceSmsMessage(studentName, date, subjectName, lang);
  }
  if (lang === "en") {
    return getEnglishAbsenceMessage(studentName, date, subjectName);
  }
  if (lang === "mr") {
    return getMarathiAbsenceMessage(studentName, date, subjectName);
  }
  if (lang === "other" || lang === "custom") {
    return getOtherAbsenceMessage(studentName, date, subjectName);
  }
  if (lang === "hi") {
    return getHindiAbsenceMessage(studentName, date, subjectName);
  }
  if (lang === "bilingual_mr" || lang === "trilingual") {
    return getTrilingualAbsenceMessage(studentName, date, subjectName);
  }
  return getEnglishAbsenceMessage(studentName, date, subjectName);
}

export interface MonthlyLowAttendanceMsgParams {
  studentName: string;
  rollNumber: string;
  monthName: string;
  percentage: number;
  totalSessions: number;
  attendedSessions: number;
  minAttendance?: number;
  lang?: SmsLanguage;
}

/**
 * Generate monthly low attendance alert message for parents (< 75% attendance)
 * Compact format: English and Marathi with common student name and - EduTrack signoff
 */
export function getMonthlyLowAttendanceMessage({
  studentName,
  rollNumber: _rollNumber,
  monthName,
  percentage,
  totalSessions: _totalSessions,
  attendedSessions: _attendedSessions,
  minAttendance = college.minAttendance || 75,
  lang = "bilingual_mr",
}: MonthlyLowAttendanceMsgParams): string {
  const enMsg = `Dear Parent, ${studentName} has ${percentage}% attendance in ${monthName} (below ${minAttendance}%).`;
  const mrMsg = `${studentName} ची ${monthName} मध्ये उपस्थिती ${percentage}% आहे (${minAttendance}% पेक्षा कमी). - EduTrack`;

  if (lang === "en") return `${enMsg} - EduTrack`;
  if (lang === "mr") return mrMsg;
  return `${enMsg} ${mrMsg}`;
}

/**
 * Generate official Email content for attendance and <75% defaulter warning
 */
export function generateEmailAlertContent(
  studentName: string,
  date: string,
  subjectName: string,
  status: "absent" | "present" = "absent",
  currentRate?: number,
): { subject: string; body: string } {
  const shortSub = getSubjectShortName(subjectName);
  const isDefaulter = typeof currentRate === "number" && currentRate < 75;

  if (status === "absent" && isDefaulter) {
    const subject = `⚠️ Low Attendance Warning (Below 75%): ${studentName} - ${shortSub}`;
    const body = `Dear Parent / Guardian,

This is an official attendance notice from EduTrack Academic Portal.

Your ward ${studentName} was marked ABSENT today (${date}) for ${subjectName}.

CRITICAL DEFICIT NOTICE:
Current Overall Attendance: ${currentRate}% (Below the mandatory 75% university minimum requirement).

Students maintaining less than 75% aggregate attendance face debarment from appearing in university semester examinations. Please ensure regular attendance immediately and consult the Class Coordinator.

Best regards,
Head of Department & Academic Cell
EduTrack Engineering Portal`;
    return { subject, body };
  }

  if (status === "absent") {
    const subject = `Attendance Notice: ${studentName} marked Absent for ${shortSub}`;
    const body = `Dear Parent / Guardian,

This is to inform you that your ward ${studentName} was marked ABSENT today (${date}) for ${subjectName}.
${typeof currentRate === "number" ? `Current Cumulative Attendance: ${currentRate}%` : ""}

Please ensure regular presence in subsequent scheduled lectures.

Regards,
Faculty & Department Administration
EduTrack Portal`;
    return { subject, body };
  }

  const subject = `Attendance Update: ${studentName} marked Present for ${shortSub}`;
  const body = `Dear Parent / Guardian,

Your ward ${studentName} was marked PRESENT today (${date}) for ${subjectName}.
${typeof currentRate === "number" ? `Current Cumulative Attendance: ${currentRate}%` : ""}

Regards,
EduTrack Portal`;
  return { subject, body };
}
