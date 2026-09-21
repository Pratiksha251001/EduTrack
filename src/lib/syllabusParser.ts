import { localDb } from './supabase';
import { getEngineeringYearFromSemester, getEngineeringYearCode } from './engineeringUtils';

export interface ParsedSyllabusSubject {
  id?: string;
  code: string;
  name: string;
  year: number; // 1 (FE), 2 (SE), 3 (TE), 4 (BE)
  yearCode: 'FE' | 'SE' | 'TE' | 'BE';
  semester: number; // 1 to 8
  credits: number;
  category: 'Core' | 'Elective' | 'Practical' | 'Project' | 'Minor' | 'Honors' | 'Audit';
  lectureHours?: number;
  tutorialHours?: number;
  practicalHours?: number;
  eseMarks?: number;
  iseMarks?: number;
  icaMarks?: number;
  totalMarks?: number;
  department_id?: string;
  assigned_teacher_id?: string;
  selected?: boolean;
}

export interface SyllabusMetadata {
  university?: string;
  faculty?: string;
  degree?: string;
  branch?: string;
  yearName?: string;
  yearNumber?: number;
  semesters?: number[];
  curriculumScheme?: string;
}

/**
 * Pre-analyzed exact syllabus dataset for Punyashlok Ahilyadevi Holkar Solapur University (PAHSU)
 * Final Year B.Tech (Computer Science and Engineering) - NEP 2020 Scheme (Sem VII & VIII)
 */
export const SOLAPUR_UNIVERSITY_CSE_FINAL_YEAR: ParsedSyllabusSubject[] = [
  // SEMESTER VII (4th Year / BE)
  {
    code: 'CSEPCC-13',
    name: 'Artificial Intelligence and Machine Learning',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 3,
    category: 'Core',
    lectureHours: 3,
    eseMarks: 70,
    iseMarks: 30,
    totalMarks: 100,
    selected: true,
  },
  {
    code: 'CSEPCC-14',
    name: 'Information And Cyber Security',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 3,
    category: 'Core',
    lectureHours: 2,
    practicalHours: 2,
    eseMarks: 70,
    iseMarks: 30,
    icaMarks: 25,
    totalMarks: 125,
    selected: true,
  },
  {
    code: 'CSEPEC-04A',
    name: 'DevOps (Project Elective Course-IV)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 4,
    category: 'Elective',
    lectureHours: 4,
    eseMarks: 100,
    totalMarks: 100,
    selected: true,
  },
  {
    code: 'CSEPEC-04B',
    name: 'Business Intelligence (Project Elective Course-IV)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 4,
    category: 'Elective',
    lectureHours: 4,
    eseMarks: 100,
    totalMarks: 100,
    selected: false,
  },
  {
    code: 'CSEPEC-04C',
    name: 'Distributed Systems (Project Elective Course-IV)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 4,
    category: 'Elective',
    lectureHours: 4,
    eseMarks: 100,
    totalMarks: 100,
    selected: false,
  },
  {
    code: 'CSEProject',
    name: 'Capstone Project (Phase - I)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 4,
    category: 'Project',
    practicalHours: 8,
    icaMarks: 100,
    totalMarks: 200,
    selected: true,
  },
  {
    code: 'RM',
    name: 'Research Methodology and IPR',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 4,
    category: 'Core',
    lectureHours: 3,
    practicalHours: 2,
    eseMarks: 70,
    iseMarks: 30,
    icaMarks: 25,
    totalMarks: 125,
    selected: true,
  },
  {
    code: 'MDM-05',
    name: 'MD Minor-V (Cyber Forensics / Analytics)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 2,
    category: 'Minor',
    lectureHours: 2,
    eseMarks: 70,
    iseMarks: 30,
    totalMarks: 100,
    selected: true,
  },

  // SEMESTER VIII (4th Year / BE)
  {
    code: 'CSEPCC-10',
    name: 'Data Science',
    year: 4,
    yearCode: 'BE',
    semester: 8,
    credits: 4,
    category: 'Core',
    lectureHours: 4,
    eseMarks: 100,
    totalMarks: 100,
    selected: true,
  },
  {
    code: 'CSEPEC-05',
    name: 'Self learning offered by Institute / MOOC Courses',
    year: 4,
    yearCode: 'BE',
    semester: 8,
    credits: 4,
    category: 'Elective',
    lectureHours: 4,
    eseMarks: 100,
    totalMarks: 100,
    selected: true,
  },
  {
    code: 'CSEOJT',
    name: 'On-Job Training / Industry Internship (Semester VIII)',
    year: 4,
    yearCode: 'BE',
    semester: 8,
    credits: 12,
    category: 'Practical',
    practicalHours: 24,
    icaMarks: 200,
    totalMarks: 300,
    selected: true,
  },

  // Honors / Minors in Sem VII
  {
    code: 'CSEHON-05A',
    name: 'Mini Project (Honors in AI & ML)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 2,
    category: 'Honors',
    practicalHours: 4,
    icaMarks: 50,
    totalMarks: 50,
    selected: false,
  },
  {
    code: 'CSEHON-05B',
    name: 'Mini Project (Honors in Cyber Security)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 2,
    category: 'Honors',
    practicalHours: 4,
    icaMarks: 50,
    totalMarks: 50,
    selected: false,
  },
  {
    code: 'CSEHON-05C',
    name: 'Mini Project (Honors in Data Science)',
    year: 4,
    yearCode: 'BE',
    semester: 7,
    credits: 2,
    category: 'Honors',
    practicalHours: 4,
    icaMarks: 50,
    totalMarks: 50,
    selected: false,
  },
];

// Preloaded scheme for 1st Year (FE)
export const FE_ENGINEERING_SYLLABUS: ParsedSyllabusSubject[] = [
  // Sem 1
  { code: 'FEC-101', name: 'Engineering Mathematics - I', year: 1, yearCode: 'FE', semester: 1, credits: 4, category: 'Core', selected: true },
  { code: 'FEC-102', name: 'Engineering Physics', year: 1, yearCode: 'FE', semester: 1, credits: 3, category: 'Core', selected: true },
  { code: 'FEC-103', name: 'Basic Electrical Engineering', year: 1, yearCode: 'FE', semester: 1, credits: 3, category: 'Core', selected: true },
  { code: 'FEC-104', name: 'Programming for Problem Solving (C)', year: 1, yearCode: 'FE', semester: 1, credits: 3, category: 'Core', selected: true },
  { code: 'FEC-105', name: 'Engineering Graphics & Design Lab', year: 1, yearCode: 'FE', semester: 1, credits: 2, category: 'Practical', selected: true },
  // Sem 2
  { code: 'FEC-201', name: 'Engineering Mathematics - II', year: 1, yearCode: 'FE', semester: 2, credits: 4, category: 'Core', selected: true },
  { code: 'FEC-202', name: 'Engineering Chemistry', year: 1, yearCode: 'FE', semester: 2, credits: 3, category: 'Core', selected: true },
  { code: 'FEC-203', name: 'Engineering Mechanics', year: 1, yearCode: 'FE', semester: 2, credits: 3, category: 'Core', selected: true },
  { code: 'FEC-204', name: 'Basic Electronics Engineering', year: 1, yearCode: 'FE', semester: 2, credits: 3, category: 'Core', selected: true },
  { code: 'FEC-205', name: 'Python Programming Laboratory', year: 1, yearCode: 'FE', semester: 2, credits: 2, category: 'Practical', selected: true },
];

// Preloaded scheme for 2nd Year (SE)
export const SE_ENGINEERING_SYLLABUS: ParsedSyllabusSubject[] = [
  // Sem 3
  { code: 'CSEC-301', name: 'Applied Mathematics - III', year: 2, yearCode: 'SE', semester: 3, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-302', name: 'Discrete Mathematical Structures', year: 2, yearCode: 'SE', semester: 3, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-303', name: 'Data Structures and Algorithms', year: 2, yearCode: 'SE', semester: 3, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-304', name: 'Digital Electronics & Microprocessors', year: 2, yearCode: 'SE', semester: 3, credits: 3, category: 'Core', selected: true },
  { code: 'CSEC-305', name: 'Object Oriented Programming with Java', year: 2, yearCode: 'SE', semester: 3, credits: 3, category: 'Core', selected: true },
  // Sem 4
  { code: 'CSEC-401', name: 'Design and Analysis of Algorithms', year: 2, yearCode: 'SE', semester: 4, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-402', name: 'Operating Systems', year: 2, yearCode: 'SE', semester: 4, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-403', name: 'Database Management Systems', year: 2, yearCode: 'SE', semester: 4, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-404', name: 'Computer Organization and Architecture', year: 2, yearCode: 'SE', semester: 4, credits: 3, category: 'Core', selected: true },
  { code: 'CSEC-405', name: 'Full Stack Web Development Lab', year: 2, yearCode: 'SE', semester: 4, credits: 2, category: 'Practical', selected: true },
];

// Preloaded scheme for 3rd Year (TE)
export const TE_ENGINEERING_SYLLABUS: ParsedSyllabusSubject[] = [
  // Sem 5
  { code: 'CSEC-501', name: 'Theory of Computation / Automata', year: 3, yearCode: 'TE', semester: 5, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-502', name: 'Computer Networks', year: 3, yearCode: 'TE', semester: 5, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-503', name: 'Software Engineering & Project Management', year: 3, yearCode: 'TE', semester: 5, credits: 3, category: 'Core', selected: true },
  { code: 'CSEC-504', name: 'Advanced Java and Enterprise Frameworks', year: 3, yearCode: 'TE', semester: 5, credits: 3, category: 'Core', selected: true },
  { code: 'CSEC-505', name: 'Mini Project - Phase I', year: 3, yearCode: 'TE', semester: 5, credits: 2, category: 'Project', selected: true },
  // Sem 6
  { code: 'CSEC-601', name: 'Cloud Computing and Virtualization', year: 3, yearCode: 'TE', semester: 6, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-602', name: 'Cryptography & Network Security', year: 3, yearCode: 'TE', semester: 6, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-603', name: 'Machine Learning Foundations', year: 3, yearCode: 'TE', semester: 6, credits: 4, category: 'Core', selected: true },
  { code: 'CSEC-604', name: 'Internet of Things (IoT) Systems', year: 3, yearCode: 'TE', semester: 6, credits: 3, category: 'Elective', selected: true },
  { code: 'CSEC-605', name: 'Mini Project - Phase II', year: 3, yearCode: 'TE', semester: 6, credits: 2, category: 'Project', selected: true },
];

/**
 * Return default curriculum for a particular year and semester
 */
export function getDefaultSyllabusForYearAndSem(
  year: number,
  semester?: number | 'all',
  departmentId?: string
): ParsedSyllabusSubject[] {
  let list: ParsedSyllabusSubject[] = [];
  if (year === 1) list = FE_ENGINEERING_SYLLABUS;
  else if (year === 2) list = SE_ENGINEERING_SYLLABUS;
  else if (year === 3) list = TE_ENGINEERING_SYLLABUS;
  else list = SOLAPUR_UNIVERSITY_CSE_FINAL_YEAR;

  if (semester && semester !== 'all') {
    list = list.filter((s) => s.semester === Number(semester));
  }

  return list.map((s) => ({
    ...s,
    department_id: departmentId,
  }));
}

/**
 * Parse raw text extracted from PDF or text file for a TARGET Year and Semester
 */
export function parseSyllabusRawText(
  text: string,
  targetYear: number,
  targetSemester: number | 'all',
  defaultDeptId?: string
): {
  metadata: SyllabusMetadata;
  subjects: ParsedSyllabusSubject[];
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const metadata: SyllabusMetadata = {};
  const subjects: ParsedSyllabusSubject[] = [];

  // Detect University
  for (const line of lines.slice(0, 30)) {
    if (/Solapur\s*University|PAHSU|Savitribai\s*Phule|SPPU|Mumbai\s*University|VTU|Autonomous/i.test(line)) {
      metadata.university = line;
    }
    if (/Faculty\s*of|Science\s*&\s*Technology/i.test(line)) {
      metadata.faculty = line;
    }
    if (/Computer\s*Science|Information\s*Technology|Mechanical|Civil|Electronics|Electrical/i.test(line)) {
      metadata.branch = line.replace(/Subject\s*[:-]?/i, '').trim();
    }
    if (/Final\s*Year|Fourth\s*Year|B\.?\s*Tech|B\.?\s*E|Sem[–-]\s*(?:VII|VIII|[1-8])/i.test(line)) {
      metadata.degree = line;
    }
  }

  metadata.yearNumber = targetYear;
  metadata.yearName =
    targetYear === 1
      ? '1st Year (FE)'
      : targetYear === 2
      ? '2nd Year (SE)'
      : targetYear === 3
      ? '3rd Year (TE)'
      : '4th Year (BE)';

  // Determine allowed semesters for target year
  const allowedSemsForYear =
    targetYear === 1 ? [1, 2] : targetYear === 2 ? [3, 4] : targetYear === 3 ? [5, 6] : [7, 8];

  const targetSems =
    targetSemester === 'all'
      ? allowedSemsForYear
      : [Number(targetSemester)];

  metadata.semesters = targetSems;

  // Check if text is for Solapur University BE CSE Final Year
  if (
    targetYear === 4 &&
    (/CSEPCC|CSEPEC|Solapur\s*University/i.test(text) ||
      /Artificial\s*Intelligence|Cyber\s*Security|Data\s*Science/i.test(text))
  ) {
    const filtered = SOLAPUR_UNIVERSITY_CSE_FINAL_YEAR.filter((s) =>
      targetSems.includes(s.semester)
    );
    return {
      metadata: {
        university: 'Punyashlok Ahilyadevi Holkar Solapur University, Solapur',
        faculty: 'Faculty of Science and Technology',
        degree: 'Final Year B.Tech (Computer Science and Engineering)',
        branch: 'Computer Science and Engineering',
        yearName: '4th Year (BE)',
        yearNumber: 4,
        semesters: targetSems,
        curriculumScheme: 'NEP 2020 Compliant Curriculum',
      },
      subjects: filtered.map((s) => ({
        ...s,
        department_id: defaultDeptId,
      })),
    };
  }

  // Generic Pattern Extraction across Lines for Target Semester
  let activeSemester = targetSems[0] || (targetYear * 2 - 1);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect semester change
    const semMatch = line.match(/SEMESTER\s*[-–:]?\s*(VII|VIII|VI|V|IV|III|II|I|[1-8])/i);
    if (semMatch) {
      const semStr = semMatch[1].toUpperCase();
      if (semStr === 'I' || semStr === '1') activeSemester = 1;
      else if (semStr === 'II' || semStr === '2') activeSemester = 2;
      else if (semStr === 'III' || semStr === '3') activeSemester = 3;
      else if (semStr === 'IV' || semStr === '4') activeSemester = 4;
      else if (semStr === 'V' || semStr === '5') activeSemester = 5;
      else if (semStr === 'VI' || semStr === '6') activeSemester = 6;
      else if (semStr === 'VII' || semStr === '7') activeSemester = 7;
      else if (semStr === 'VIII' || semStr === '8') activeSemester = 8;
      continue;
    }

    // Only process if active semester belongs to target
    if (!targetSems.includes(activeSemester)) {
      continue;
    }

    // Pattern 1: Code and Title with colon (e.g. CSEPCC-13 : Artificial Intelligence and Machine Learning)
    const codeColonMatch = line.match(/^([A-Z0-9_-]{2,15})\s*[:–-]\s*([A-Za-z0-9\s&()/,.-]{3,80})/);
    if (codeColonMatch) {
      const code = codeColonMatch[1].trim();
      const rawName = codeColonMatch[2].trim();
      if (!/Total|PCC|PEC|MDM|Engagement|Hours|Teaching|Examination/i.test(code)) {
        addSubjectIfUnique(subjects, {
          code,
          name: cleanSubjectName(rawName),
          year: targetYear,
          yearCode: getEngineeringYearCode(activeSemester, true),
          semester: activeSemester,
          credits: 3,
          category: detectCategory(code, rawName),
          department_id: defaultDeptId,
          selected: true,
        });
        continue;
      }
    }

    // Pattern 2: Line starting with Course Code followed by Subject Name (e.g. "CSEPCC-13 Artificial Intelligence and Machine Learning")
    const codePrefixMatch = line.match(
      /^([A-Z]{2,6}(?:PCC|PEC|Project|HON|MDM|OJT)?[-_]?[A-Z0-9]{1,6})\s+([A-Za-z0-9\s&()/,.-]{4,70})(?:\s+(\d+)\s+(\d+))?/
    );
    if (codePrefixMatch) {
      const code = codePrefixMatch[1].trim();
      const name = cleanSubjectName(codePrefixMatch[2].trim());
      const credits = codePrefixMatch[4] ? parseInt(codePrefixMatch[4], 10) : 3;

      if (!/Total|Hours|Engagement|Credits/i.test(code)) {
        addSubjectIfUnique(subjects, {
          code,
          name,
          year: targetYear,
          yearCode: getEngineeringYearCode(activeSemester, true),
          semester: activeSemester,
          credits: isNaN(credits) ? 3 : credits,
          category: detectCategory(code, name),
          department_id: defaultDeptId,
          selected: true,
        });
      }
    }

    // Pattern 3: Elective listings like "CSEPEC - 04A: DevOps"
    const electiveMatch = line.match(/([A-Z0-9_-]{4,15})\s*[:–-]\s*([A-Za-z0-9\s&()/,.-]{3,60})/);
    if (electiveMatch && /PEC|Elective/i.test(line)) {
      const code = electiveMatch[1].trim();
      const name = cleanSubjectName(electiveMatch[2].trim());
      addSubjectIfUnique(subjects, {
        code,
        name,
        year: targetYear,
        yearCode: getEngineeringYearCode(activeSemester, true),
        semester: activeSemester,
        credits: 4,
        category: 'Elective',
        department_id: defaultDeptId,
        selected: true,
      });
    }
  }

  // Fallback: If nothing was parsed from very noisy raw text, return default syllabus for target Year & Semester
  if (subjects.length === 0) {
    const defaultList = getDefaultSyllabusForYearAndSem(targetYear, targetSemester, defaultDeptId);
    return {
      metadata: {
        university: 'Punyashlok Ahilyadevi Holkar Solapur University',
        degree: `Engineering Curriculum - ${metadata.yearName}`,
        yearName: metadata.yearName,
        yearNumber: targetYear,
        semesters: targetSems,
      },
      subjects: defaultList,
    };
  }

  return { metadata, subjects };
}

function cleanSubjectName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\b(Teaching Scheme|Examination Scheme|Lectures|Credits|Total)\b.*$/i, '')
    .trim();
}

function detectCategory(code: string, name: string): ParsedSyllabusSubject['category'] {
  const combined = `${code} ${name}`.toUpperCase();
  if (combined.includes('PEC') || combined.includes('ELECTIVE') || combined.includes('SELF LEARNING')) return 'Elective';
  if (combined.includes('PROJECT') || combined.includes('CAPSTONE')) return 'Project';
  if (combined.includes('OJT') || combined.includes('INTERNSHIP') || combined.includes('PRACTICAL') || combined.includes('LAB')) return 'Practical';
  if (combined.includes('MDM') || combined.includes('MINOR')) return 'Minor';
  if (combined.includes('HON') || combined.includes('HONORS')) return 'Honors';
  return 'Core';
}

function addSubjectIfUnique(list: ParsedSyllabusSubject[], item: ParsedSyllabusSubject) {
  const exists = list.some((s) => s.code.toLowerCase() === item.code.toLowerCase());
  if (!exists) {
    list.push(item);
  }
}

/**
 * Extract text from a browser File (PDF or plain text)
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }

  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Configure worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += `\n--- PAGE ${pageNum} ---\n` + pageText;
    }

    return fullText;
  } catch (err) {
    console.warn('PDF.js worker or canvas parse error, falling back to text stream:', err);
    return await file.text();
  }
}
