import * as XLSX from "xlsx";
import { localDb } from "./supabase";
import {
  cleanMobile,
  isValid10DigitMobile,
  getMobileValidationError,
  isValidEmail,
  validateDateOfBirth,
  getEmployeeIdValidationError,
} from "./validation";

export interface ParsedTeacherRow {
  rowNumber: number;
  full_name: string;
  employee_id: string;
  designation: string;
  department: string;
  qualification: string;
  date_of_birth: string;
  experience_years: string;
  mobile: string;
  email: string;
  role: "lecturer" | "class_coordinator";
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
    // Excel serial date to JS Date
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
  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Check DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  // Try standard Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1920 && parsed.getFullYear() < 2030) {
    return parsed.toISOString().split("T")[0];
  }
  return str;
}

/**
 * Parses an Excel (.xlsx/.xls) or CSV file into teacher candidate rows
 */
export async function parseTeacherSpreadsheet(
  file: File,
  defaultDepartmentName: string = ""
): Promise<ParsedTeacherRow[]> {
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

  const existingTeachers = localDb.teachers;
  const existingEmpIds = new Set(
    existingTeachers.map((t) => t.employee_id.trim().toLowerCase())
  );
  const seenEmpIdsInFile = new Set<string>();

  const parsed: ParsedTeacherRow[] = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 1-based, +1 for header row

    // Find column values using normalized keys
    let full_name = "";
    let employee_id = "";
    let designation = "";
    let department = defaultDepartmentName;
    let qualification = "";
    let date_of_birth = "";
    let experience_years = "";
    let mobile = "";
    let email = "";
    let role: "lecturer" | "class_coordinator" = "lecturer";

    for (const [key, val] of Object.entries(row)) {
      const norm = normalizeKey(key);
      const strVal = val !== undefined && val !== null ? String(val).trim() : "";

      // Full Name
      if (
        norm === "fullname" ||
        norm === "teachername" ||
        norm === "facultyname" ||
        norm === "name" ||
        norm === "staffname"
      ) {
        if (!full_name) full_name = strVal;
      }
      // College Employee ID Reference No
      else if (
        norm === "collegeemployeeidreferenceno" ||
        norm === "employeeidreferenceno" ||
        norm === "collegeemployeeid" ||
        norm === "employeeid" ||
        norm === "empid" ||
        norm === "referenceno" ||
        norm === "refno" ||
        norm === "staffid" ||
        norm === "id"
      ) {
        if (!employee_id) employee_id = strVal;
      }
      // Designation
      else if (
        norm === "designation" ||
        norm === "post" ||
        norm === "jobtitle" ||
        norm === "title" ||
        norm === "position"
      ) {
        if (!designation) designation = strVal;
      }
      // Department
      else if (
        norm === "department" ||
        norm === "dept" ||
        norm === "branch" ||
        norm === "discipline"
      ) {
        if (strVal) department = strVal;
      }
      // Qualification
      else if (
        norm === "qualification" ||
        norm === "qualifications" ||
        norm === "degree" ||
        norm === "highestqualification" ||
        norm === "education"
      ) {
        if (!qualification) qualification = strVal;
      }
      // Date of Birth
      else if (
        norm === "dateofbirth" ||
        norm === "dob" ||
        norm === "birthdate" ||
        norm === "birth"
      ) {
        if (!date_of_birth) date_of_birth = normalizeDateValue(val);
      }
      // Year of Experience
      else if (
        norm === "yearofexperience" ||
        norm === "yearsofexperience" ||
        norm === "experienceyears" ||
        norm === "experience" ||
        norm === "totalexperience" ||
        norm === "exp"
      ) {
        if (!experience_years) experience_years = strVal;
      }
      // Phone / Mobile ("pho will manualy or option to set")
      else if (
        norm === "mobile" ||
        norm === "phone" ||
        norm === "phonenumber" ||
        norm === "contact" ||
        norm === "contactnumber" ||
        norm === "cell"
      ) {
        if (!mobile) mobile = strVal;
      }
      // Email
      else if (
        norm === "email" ||
        norm === "emailaddress" ||
        norm === "mail"
      ) {
        if (!email) email = strVal;
      }
      // Role
      else if (norm === "role") {
        if (strVal.toLowerCase().includes("coordinator")) {
          role = "class_coordinator";
        }
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Mobile cleaning and validation
    const cleanedMobile = cleanMobile(mobile);

    // Validation
    if (!full_name) {
      errors.push("Teacher Full Name is required");
    }
    if (!employee_id) {
      errors.push("College Employee ID Reference No is required");
    } else {
      const normEmp = employee_id.trim().toLowerCase();
      if (existingEmpIds.has(normEmp)) {
        errors.push(`Employee ID "${employee_id}" already exists in system database`);
      }
      if (seenEmpIdsInFile.has(normEmp)) {
        errors.push(`Duplicate Employee ID "${employee_id}" within uploaded file`);
      }
      seenEmpIdsInFile.add(normEmp);
    }

    // Optional fields default warnings / remarks
    if (!designation) {
      warnings.push("Designation empty (will default to Assistant Professor)");
      designation = "Assistant Professor";
    }
    if (!qualification) {
      warnings.push("Qualification empty");
    }
    if (!date_of_birth) {
      warnings.push("Date of birth not provided");
    }
    if (!experience_years) {
      warnings.push("Experience not provided");
    }

    // Mobile validation (Optional, but if provided must be valid 10 digits)
    if (!mobile) {
      warnings.push("Phone not set (can be updated manually in profile)");
    } else {
      const mobileErr = getMobileValidationError(mobile, "Phone / Mobile", false);
      if (mobileErr) {
        errors.push(mobileErr);
      }
    }

    // Email validation
    if (email && !isValidEmail(email)) {
      warnings.push(`Faculty Email '${email}' has an invalid email format`);
    }

    parsed.push({
      rowNumber,
      full_name,
      employee_id,
      designation,
      department,
      qualification,
      date_of_birth,
      experience_years,
      mobile: cleanedMobile || mobile,
      email,
      role,
      errors,
      warnings,
      isValid: errors.length === 0,
    });
  });

  return parsed;
}

/**
 * Generates and downloads a sample Excel (.xlsx) file with the requested format
 */
export function downloadTeacherExcelTemplate(departmentName: string = "Computer Science & Engineering") {
  const sampleData = [
    {
      "Full Name": "Dr. Aarav Sharma",
      "College Employee ID Reference No": "EMP-CSE-201",
      "Designation": "Associate Professor",
      "Department": departmentName,
      "Qualification": "Ph.D in Artificial Intelligence",
      "Date of Birth": "1984-07-18",
      "Year of Experience": "12 Years",
      "Phone": "9876543210",
      "Email": "aarav.sharma@edutrack.edu",
    },
    {
      "Full Name": "Prof. Meera Kulkarni",
      "College Employee ID Reference No": "EMP-CSE-202",
      "Designation": "Assistant Professor",
      "Department": departmentName,
      "Qualification": "M.Tech in Cyber Security",
      "Date of Birth": "1991-03-25",
      "Year of Experience": "6 Years",
      "Phone": "9876543211",
      "Email": "meera.k@edutrack.edu",
    },
    {
      "Full Name": "Mr. Rajesh Pillai",
      "College Employee ID Reference No": "EMP-CSE-203",
      "Designation": "Lecturer",
      "Department": departmentName,
      "Qualification": "M.Sc in Computer Science",
      "Date of Birth": "1994-11-12",
      "Year of Experience": "4 Years",
      "Phone": "", // Optional
      "Email": "", // Optional
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 24 }, // Full Name
    { wch: 32 }, // College Employee ID Reference No
    { wch: 22 }, // Designation
    { wch: 32 }, // Department
    { wch: 32 }, // Qualification
    { wch: 16 }, // Date of Birth
    { wch: 20 }, // Year of Experience
    { wch: 18 }, // Phone
    { wch: 28 }, // Email
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");

  XLSX.writeFile(workbook, "EduTrack_Teacher_Import_Template.xlsx");
}

/**
 * Generates and downloads a sample CSV (.csv) file with the requested format
 */
export function downloadTeacherCsvTemplate(departmentName: string = "Computer Science & Engineering") {
  const headers = [
    "Full Name",
    "College Employee ID Reference No",
    "Designation",
    "Department",
    "Qualification",
    "Date of Birth",
    "Year of Experience",
    "Phone",
    "Email",
  ];

  const rows = [
    [
      "Dr. Aarav Sharma",
      "EMP-CSE-201",
      "Associate Professor",
      `"${departmentName}"`,
      "Ph.D in Artificial Intelligence",
      "1984-07-18",
      "12 Years",
      "+91 98765 43210",
      "aarav.sharma@edutrack.edu",
    ],
    [
      "Prof. Meera Kulkarni",
      "EMP-CSE-202",
      "Assistant Professor",
      `"${departmentName}"`,
      "M.Tech in Cyber Security",
      "1991-03-25",
      "6 Years",
      "+91 98765 43211",
      "meera.k@edutrack.edu",
    ],
    [
      "Mr. Rajesh Pillai",
      "EMP-CSE-203",
      "Lecturer",
      `"${departmentName}"`,
      "M.Sc in Computer Science",
      "1994-11-12",
      "4 Years",
      "",
      "",
    ],
  ];

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "EduTrack_Teacher_Import_Template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
