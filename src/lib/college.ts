import { SmsLanguage } from "./types";

export const college = {
  name: "EduTrack Institute of Technology",
  shortName: "EduTrack",
  tagline: "Manage Attendance. Alert Parents. Build Trust.",
  logoUrl: "/logo.png",
  minAttendance: 75,
  semesters: [1, 2, 3, 4, 5, 6, 7, 8],
};

export interface SmsLanguageOption {
  id: SmsLanguage;
  label: string;
  subLabel: string;
  flag: string;
}

export const SMS_LANGUAGES: SmsLanguageOption[] = [
  { id: "trilingual", label: "त्रिभाषिक (All 3)", subLabel: "English + मराठी + हिंदी", flag: "🌐" },
  { id: "mr", label: "मराठी", subLabel: "Marathi (स्थानिक पालकांसाठी)", flag: "🌐" },
  { id: "hi", label: "हिंदी", subLabel: "Hindi (सरल हिंदी संदेश)", flag: "🌐" },
  { id: "en", label: "English", subLabel: "Standard English", flag: "🌐" },
  { id: "bilingual_mr", label: "Eng + मराठी", subLabel: "English & Marathi", flag: "🌐" },
  { id: "bilingual_hi", label: "Eng + हिंदी", subLabel: "English & Hindi", flag: "🌐" },
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
 * Single language generator functions
 */
export function getEnglishAbsenceMessage(studentName: string, date: string, subjectName: string): string {
  return `Dear Parent,\nYour child, ${studentName}, was marked ABSENT today (${date}) for the lecture "${subjectName}" at ${college.name}.\n\nPlease ensure regular attendance. Kindly contact the class coordinator for queries.\n\nRegards,\n${college.name}`;
}

export function getMarathiAbsenceMessage(studentName: string, date: string, subjectName: string): string {
  return `आदरणीय पालक,\nआपला पाल्य ${studentName} आज दिनांक ${date} रोजी ${college.name} मध्ये "${subjectName}" या विषयाच्या तासाला गैरहजर (अनुपस्थित) होता/होती.\n\nकृपया आपल्या पाल्याच्या नियमित उपस्थितीची खात्री करावी. अधिक माहितीसाठी वर्ग समन्वयकांशी संपर्क साधावा.\n\nसस्नेह,\n${college.name}`;
}

export function getHindiAbsenceMessage(studentName: string, date: string, subjectName: string): string {
  return `आदरणीय अभिभावक,\nआपका बच्चा ${studentName} आज दिनांक ${date} को ${college.name} में "${subjectName}" विषय की कक्षा में अनुपस्थित (ABSENT) था/थी।\n\nकृपया नियमित उपस्थिति सुनिश्चित करें। किसी भी जानकारी के लिए वर्ग समन्वयक से संपर्क करें।\n\nसादर,\n${college.name}`;
}

export function getTrilingualAbsenceMessage(studentName: string, date: string, subjectName: string): string {
  return `Dear Parent, your child ${studentName} was marked ABSENT today (${date}) for the lecture "${subjectName}" at ${college.name}. Please ensure regular attendance.

आदरणीय पालक, आपला पाल्य ${studentName} आज दिनांक ${date} रोजी "${subjectName}" या विषयाच्या तासाला गैरहजर (अनुपस्थित) होता/होती. कृपया नियमित उपस्थितीची खात्री करावी.

आदरणीय अभिभावक, आपका बच्चा ${studentName} आज दिनांक ${date} को "${subjectName}" विषय की कक्षा में अनुपस्थित था/थी। कृपया नियमित उपस्थिति सुनिश्चित करें।

- ${college.name}`;
}

export function getBilingualMrMessage(studentName: string, date: string, subjectName: string): string {
  return getTrilingualAbsenceMessage(studentName, date, subjectName);
}

export function getBilingualHiMessage(studentName: string, date: string, subjectName: string): string {
  return getTrilingualAbsenceMessage(studentName, date, subjectName);
}

/**
 * Master generator function for attendance SMS alerts - always includes English, Marathi, and Hindi
 */
export function generateSmsMessage(
  studentName: string,
  date: string,
  subjectName: string,
  _lang: SmsLanguage = "trilingual"
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

