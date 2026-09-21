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

export const ACADEMIC_YEARS = ["2025-26", "2026-27", "2027-28"];
export const CURRENT_ACADEMIC_YEAR = "2025-26";

export interface SmsLanguageOption {
  id: SmsLanguage;
  label: string;
  subLabel: string;
  flag: string;
}

export const SMS_LANGUAGES: SmsLanguageOption[] = [
  {
    id: "trilingual",
    label: "त्रिभाषिक (All 3)",
    subLabel: "English + मराठी + हिंदी",
    flag: "🌐",
  },
  {
    id: "mr",
    label: "मराठी",
    subLabel: "Marathi (स्थानिक पालकांसाठी)",
    flag: "🌐",
  },
  { id: "hi", label: "हिंदी", subLabel: "Hindi (सरल हिंदी संदेश)", flag: "🌐" },
  { id: "en", label: "English", subLabel: "Standard English", flag: "🌐" },
  {
    id: "bilingual_mr",
    label: "Eng + मराठी",
    subLabel: "English & Marathi",
    flag: "🌐",
  },
  {
    id: "bilingual_hi",
    label: "Eng + हिंदी",
    subLabel: "English & Hindi",
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
    "dbms": "DMS",
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
  const stopWords = new Set(["and", "&", "for", "in", "of", "the", "to", "with", "a", "an"]);
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

/**
 * Master generator function for attendance SMS alerts - formatted in English & Marathi with common student name
 */
export function generateSmsMessage(
  studentName: string,
  date: string,
  subjectName: string,
  _lang: SmsLanguage = "bilingual_mr",
): string {
  return getTrilingualAbsenceMessage(studentName, date, subjectName);
}

/**
 * Format clean phone number and generate WhatsApp direct send URL
 */
export function formatParentPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  // If standard Indian 10 digits without country code, prepend 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
}

export function getParentWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = formatParentPhoneForWhatsApp(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
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

