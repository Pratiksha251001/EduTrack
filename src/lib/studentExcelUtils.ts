import * as XLSX from "xlsx";
import { localDb } from "./supabase";
import {
  cleanMobile,
  isValid10DigitMobile,
  getMobileValidationError,
  isValidEmail,
  validateDateOfBirth,
} from "./validation";

export interface ParsedStudentRow {
  rowNumber: number;
  roll_number: string; // Unique Enrollment / Roll Number
  reg_number: string; // University Registration Number
  full_name: string;
  semester: number;
  parent_name: string;
  parent_mobile: string;
  student_mobile: string;
  email: string;
  date_of_birth: string;
  gender: "male" | "female" | "other" | "";
  address: string;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

/**
 * Normalizes header keys to easily match various casing, spaces, and punctuation
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Formats date values coming from Excel (strings, date objects, or Excel serial numbers)
 */
function normalizeDateValue(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "number") {
    try {
      const utcDays = Math.floor(raw - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) {
        return dateInfo.toISOString().split("T")[0];
      }
    } catch {
      return String(raw);
    }
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1950 && parsed.getFullYear() < 2035) {
    return parsed.toISOString().split("T")[0];
  }
  return str;
}

/**
 * Parses an Excel (.xlsx/.xls) or CSV file into student candidate rows
 */
export async function parseStudentSpreadsheet(
  file: File,
  defaultSemester: number = 1
): Promise<ParsedStudentRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    cellText: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No readable worksheet found in the uploaded file.");
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName],
    { defval: "", raw: true }
  );

  if (!rawRows || rawRows.length === 0) {
    throw new Error("The selected spreadsheet is empty or has no data rows.");
  }

  const existingStudents = localDb.students;
  const existingRolls = new Set(
    existingStudents.map((s) => s.roll_number.trim().toLowerCase())
  );
  const seenRollsInFile = new Set<string>();

  const parsedRows: ParsedStudentRow[] = rawRows.map((rawRow, index) => {
    const rowNumber = index + 2; // Row 1 is header
    const errors: string[] = [];
    const warnings: string[] = [];

    // Map keys intelligently
    const normalizedRow: Record<string, any> = {};
    Object.keys(rawRow).forEach((origKey) => {
      const normKey = normalizeKey(origKey);
      normalizedRow[normKey] = rawRow[origKey];
    });

    const getVal = (...possibleKeys: string[]): string => {
      for (const k of possibleKeys) {
        const normK = normalizeKey(k);
        if (normalizedRow[normK] !== undefined && normalizedRow[normK] !== null) {
          const val = String(normalizedRow[normK]).trim();
          if (val) return val;
        }
      }
      return "";
    };

    // 1. Enrollment / Roll Number (Unique Primary Key)
    let rollNumber = getVal(
      "enrollment_number",
      "enrollment_no",
      "enrollment",
      "enrolment_no",
      "enrolment",
      "roll_number",
      "roll_no",
      "rollno",
      "roll",
      "student_id",
      "usn",
      "admission_no"
    );

    // 2. University Registration Number
    const regNumber = getVal(
      "reg_number",
      "reg_no",
      "regno",
      "registration_number",
      "university_reg_no",
      "university_reg_number"
    );

    // If rollNumber was omitted but regNumber was provided, use it
    if (!rollNumber && regNumber) {
      rollNumber = regNumber;
    }

    // 3. Full Name
    const fullName = getVal(
      "full_name",
      "name",
      "student_name",
      "student_full_name",
      "candidate_name"
    );

    // 4. Semester
    const semRaw = getVal("semester", "sem", "class_semester");
    const semester = parseInt(semRaw, 10) || defaultSemester || 1;

    // 5. Parent Name
    const parentName = getVal(
      "parent_name",
      "guardian_name",
      "father_name",
      "mother_name",
      "parent",
      "guardian"
    );

    // 6. Parent Mobile (MANDATORY for attendance SMS alerts)
    const parentMobile = getVal(
      "parent_mobile",
      "parent_phone",
      "guardian_mobile",
      "guardian_phone",
      "father_mobile",
      "mother_mobile",
      "parent_contact"
    );

    // 7. Student Mobile
    let studentMobile = getVal(
      "student_mobile",
      "student_phone",
      "student_contact",
      "mobile",
      "phone",
      "contact"
    );
    // If "mobile" matched and is equal to parentMobile, don't duplicate
    if (studentMobile === parentMobile) {
      // keep it, but we validate below
    }

    // 8. Email
    const email = getVal("email", "student_email", "mail");

    // 9. Date of Birth
    const rawDob = normalizedRow[normalizeKey("date_of_birth")] ??
      normalizedRow[normalizeKey("dob")] ??
      normalizedRow[normalizeKey("birth_date")] ??
      "";
    const dob = normalizeDateValue(rawDob);

    // 10. Gender
    const rawGender = getVal("gender", "sex").toLowerCase();
    let gender: "male" | "female" | "other" | "" = "";
    if (rawGender.startsWith("m")) gender = "male";
    else if (rawGender.startsWith("f")) gender = "female";
    else if (rawGender.startsWith("o")) gender = "other";

    // 11. Address
    const address = getVal("address", "city", "location", "residential_address");

    // Clean mobile numbers to 10-digit format
    const cleanedParentMobile = cleanMobile(parentMobile);
    const cleanedStudentMobile = cleanMobile(studentMobile);

    // ==========================================
    // VALIDATION RULES
    // ==========================================
    if (!rollNumber) {
      errors.push("Unique Enrollment / Roll Number is required.");
    } else {
      const normRoll = rollNumber.toLowerCase();
      if (existingRolls.has(normRoll)) {
        errors.push(`Enrollment '${rollNumber}' already exists in institutional records.`);
      }
      if (seenRollsInFile.has(normRoll)) {
        errors.push(`Duplicate Enrollment '${rollNumber}' in uploaded spreadsheet.`);
      }
      seenRollsInFile.add(normRoll);
    }

    if (!fullName) {
      errors.push("Student Full Name is required.");
    }

    // Parent mobile validation (Mandatory 10 digits)
    if (!parentMobile) {
      errors.push("Parent Mobile is required (10-digit mobile number needed for SMS alerts).");
    } else {
      const parentErr = getMobileValidationError(parentMobile, "Parent Mobile", true);
      if (parentErr) {
        errors.push(parentErr);
      }
    }

    // Student mobile validation (Optional, but if provided must be valid 10 digits)
    if (studentMobile) {
      const studentErr = getMobileValidationError(studentMobile, "Student Mobile", false);
      if (studentErr) {
        warnings.push(studentErr);
      }
    }

    // Duplicate check between parent and student mobile
    if (cleanedParentMobile && cleanedStudentMobile && cleanedParentMobile === cleanedStudentMobile) {
      errors.push("Parent Mobile and Student Mobile cannot be identical (distinct numbers required).");
    }

    // Email validation
    if (email) {
      if (!isValidEmail(email)) {
        warnings.push(`Student Email '${email}' has an invalid format.`);
      }
    } else {
      warnings.push("Email missing (institutional @student.edutrack.edu will be auto-generated).");
    }

    // Date of Birth validation
    if (dob) {
      const dobErr = validateDateOfBirth(dob, 14, 45);
      if (dobErr) {
        warnings.push(dobErr);
      }
    }

    return {
      rowNumber,
      roll_number: rollNumber,
      reg_number: regNumber,
      full_name: fullName,
      semester,
      parent_name: parentName,
      parent_mobile: cleanedParentMobile || parentMobile,
      student_mobile: cleanedStudentMobile || studentMobile,
      email,
      date_of_birth: dob,
      gender,
      address,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  });

  return parsedRows;
}

/**
 * Downloads a sample Excel (.xlsx) template for student bulk import
 */
export function downloadStudentExcelTemplate(semester: number = 1) {
  const headers = [
    "Enrollment Number / Roll No*",
    "University Reg No",
    "Student Full Name*",
    "Semester",
    "Parent / Guardian Name",
    "Parent Mobile (10 Digits)*",
    "Student Mobile (10 Digits)",
    "Student Email",
    "Date of Birth (YYYY-MM-DD)",
    "Gender (male/female)",
    "Residential Address",
  ];

  const sampleData = [
    [
      "21CS101",
      "REG-2021-101",
      "Aarav Sharma",
      semester,
      "Rajesh Sharma",
      "9876543210",
      "9876543211",
      "aarav.s@student.edu",
      "2004-03-15",
      "male",
      "Plot 42, North Campus Enclave",
    ],
    [
      "21CS102",
      "REG-2021-102",
      "Diya Patel",
      semester,
      "Mukesh Patel",
      "9876543212",
      "9876543213",
      "diya.p@student.edu",
      "2004-07-22",
      "female",
      "14 Royal Palms Residency",
    ],
    [
      "21CS103",
      "REG-2021-103",
      "Rohan Verma",
      semester,
      "Suresh Verma",
      "9876543214",
      "9876543215",
      "",
      "rohan.v@student.edu",
      "2003-11-05",
      "male",
      "A-88 Green Park Extension",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths for readability
  ws["!cols"] = [
    { wch: 28 }, // Enrollment
    { wch: 20 }, // Reg No
    { wch: 24 }, // Name
    { wch: 10 }, // Semester
    { wch: 24 }, // Parent Name
    { wch: 28 }, // Parent Mobile
    { wch: 20 }, // Student Mobile
    { wch: 26 }, // Email
    { wch: 25 }, // DOB
    { wch: 20 }, // Gender
    { wch: 32 }, // Address
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Students_Sem_${semester}`);
  XLSX.writeFile(wb, `Student_Import_Template_Sem${semester}.xlsx`);
}

/**
 * Downloads a sample CSV (.csv) template for student bulk import
 */
export function downloadStudentCsvTemplate(semester: number = 1) {
  const headers = [
    "enrollment_number",
    "reg_number",
    "full_name",
    "semester",
    "parent_name",
    "parent_mobile",
    "student_mobile",
    "email",
    "date_of_birth",
    "gender",
    "address",
  ];

  const sampleRows = [
    [
      "21CS101",
      "REG-2021-101",
      "Aarav Sharma",
      semester,
      "Rajesh Sharma",
      "+91 98765 43210",
      "+91 98765 43211",
      "aarav.s@student.edu",
      "2004-03-15",
      "male",
      "Plot 42 North Campus Enclave",
    ],
    [
      "21CS102",
      "REG-2021-102",
      "Diya Patel",
      semester,
      "Mukesh Patel",
      "+91 98765 43212",
      "+91 98765 43213",
      "diya.p@student.edu",
      "2004-07-22",
      "female",
      "14 Royal Palms Residency",
    ],
  ];

  const csvContent = [
    headers.join(","),
    ...sampleRows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(",") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Student_Import_Template_Sem${semester}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
