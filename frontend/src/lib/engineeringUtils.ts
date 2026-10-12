export interface EngineeringYearInfo {
  year: number; // 1, 2, 3, 4
  code: "FE" | "SE" | "TE" | "BE";
  name: string; // "1st Year (FE)"
  fullName: string; // "First Year Engineering (FE)"
  semesters: [number, number]; // e.g. [1, 2]
  oddSemester: number; // 1, 3, 5, 7
  evenSemester: number; // 2, 4, 6, 8
}

export const ENGINEERING_YEARS: EngineeringYearInfo[] = [
  {
    year: 1,
    code: "FE",
    name: "1st Year (FE)",
    fullName: "First Year Engineering (FE)",
    semesters: [1, 2],
    oddSemester: 1,
    evenSemester: 2,
  },
  {
    year: 2,
    code: "SE",
    name: "2nd Year (SE)",
    fullName: "Second Year Engineering (SE)",
    semesters: [3, 4],
    oddSemester: 3,
    evenSemester: 4,
  },
  {
    year: 3,
    code: "TE",
    name: "3rd Year (TE)",
    fullName: "Third Year Engineering (TE)",
    semesters: [5, 6],
    oddSemester: 5,
    evenSemester: 6,
  },
  {
    year: 4,
    code: "BE",
    name: "4th Year (BE / Final Year)",
    fullName: "Final Year Engineering (BE)",
    semesters: [7, 8],
    oddSemester: 7,
    evenSemester: 8,
  },
];

/**
 * Get Engineering Year (1, 2, 3, 4) from overall semester number (1 to 8)
 */
export function getEngineeringYearFromSemester(sem: number): number {
  if (sem <= 2) return 1;
  if (sem <= 4) return 2;
  if (sem <= 6) return 3;
  return 4;
}

/**
 * Get semester number within the academic year (1st Sem or 2nd Sem)
 * e.g. Sem 3 is 1st Sem of 2nd Year, Sem 4 is 2nd Sem of 2nd Year
 */
export function getSemNumberInYear(sem: number): 1 | 2 {
  return sem % 2 === 1 ? 1 : 2;
}

/**
 * Get engineering year short code: FE, SE, TE, BE
 */
export function getEngineeringYearCode(yearOrSem: number, isSem = false): "FE" | "SE" | "TE" | "BE" {
  const year = isSem ? getEngineeringYearFromSemester(yearOrSem) : yearOrSem;
  if (year === 1) return "FE";
  if (year === 2) return "SE";
  if (year === 3) return "TE";
  return "BE";
}

/**
 * Get display title for Year
 */
export function getEngineeringYearName(year: number): string {
  const entry = ENGINEERING_YEARS.find((y) => y.year === year);
  return entry ? entry.name : `Year ${year}`;
}

/**
 * Full descriptive label for an engineering semester:
 * e.g. "2nd Year · Sem 3 (2nd Year 1st Sem / SE)"
 */
export function getSemesterEngineeringLabel(sem: number): string {
  const year = getEngineeringYearFromSemester(sem);
  const semInYear = getSemNumberInYear(sem);
  const code = getEngineeringYearCode(year);
  const ordYear = year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : "4th";
  const ordSem = semInYear === 1 ? "1st" : "2nd";

  return `${ordYear} Year · Sem ${sem} (${ordYear} Year ${ordSem} Sem · ${code})`;
}

/**
 * Concise compact label for badges or pills:
 * e.g. "2nd Yr · 1st Sem (Sem 3)"
 */
export function getSemesterCompactBadge(sem: number): string {
  const year = getEngineeringYearFromSemester(sem);
  const semInYear = getSemNumberInYear(sem);
  const ordYear = year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : "4th";
  const ordSem = semInYear === 1 ? "1st" : "2nd";
  return `${ordYear} Yr · ${ordSem} Sem (Sem ${sem})`;
}

/**
 * Teacher teaching workload descriptor:
 * e.g. "Teaching 2nd Year 1st Sem (Semester 3)"
 */
export function getTeacherTeachingSemesterLabel(sem: number, customYear?: number | null): string {
  const year = customYear || getEngineeringYearFromSemester(sem);
  const semInYear = getSemNumberInYear(sem);
  const ordYear = year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : "4th";
  const ordSem = semInYear === 1 ? "1st" : "2nd";
  return `${ordYear} Year, ${ordSem} Sem (Semester ${sem})`;
}

/**
 * Class coordinator descriptor:
 * e.g. "Year 2 Coordinator (SE) · Semester 3"
 */
export function getCoordinatorScopeLabel(year?: number | null, sem?: number | null): string {
  if (!year && !sem) return "Class Coordinator";
  if (year && (!sem || sem === 0)) {
    const code = getEngineeringYearCode(year);
    const ordYear = year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : "4th";
    return `${ordYear} Year (${code}) Coordinator · Full Academic Year`;
  }
  const resolvedYear = year || (sem ? getEngineeringYearFromSemester(sem) : 1);
  const code = getEngineeringYearCode(resolvedYear);
  const ordYear = resolvedYear === 1 ? "1st" : resolvedYear === 2 ? "2nd" : resolvedYear === 3 ? "3rd" : "4th";
  const semInYear = sem ? getSemNumberInYear(sem) : 1;
  const ordSem = semInYear === 1 ? "1st" : "2nd";
  return `${ordYear} Year (${code}) Coordinator · Sem ${sem} (${ordYear} Yr ${ordSem} Sem)`;
}

/**
 * Pre-defined parallel semester tracks running concurrently in engineering
 */
export interface ParallelSemesterTrack {
  id: string;
  name: string;
  description: string;
  semesters: number[];
  years: number[];
  badge: string;
}

export const PARALLEL_SEMESTER_TRACKS: ParallelSemesterTrack[] = [
  {
    id: "all",
    name: "All 4 Years (All 8 Semesters)",
    description: "Complete department view across FE, SE, TE & BE",
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    years: [1, 2, 3, 4],
    badge: "All 4 Years",
  },
  {
    id: "odd_cycle",
    name: "Parallel Odd Semesters (Sem 1, 3, 5, 7)",
    description: "Ongoing parallel term: FE Sem 1, SE Sem 3, TE Sem 5, BE Sem 7",
    semesters: [1, 3, 5, 7],
    years: [1, 2, 3, 4],
    badge: "Odd Cycle (1, 3, 5, 7)",
  },
  {
    id: "even_cycle",
    name: "Parallel Even Semesters (Sem 2, 4, 6, 8)",
    description: "Ongoing parallel term: FE Sem 2, SE Sem 4, TE Sem 6, BE Sem 8",
    semesters: [2, 4, 6, 8],
    years: [1, 2, 3, 4],
    badge: "Even Cycle (2, 4, 6, 8)",
  },
  {
    id: "junior_senior_split",
    name: "Parallel 1st & 3rd Sem (Junior Engineering)",
    description: "Concurrently running 1st Year (FE) & 2nd Year (SE)",
    semesters: [1, 3],
    years: [1, 2],
    badge: "Sem 1 & 3",
  },
  {
    id: "upper_years_split",
    name: "Parallel 6th & 8th Sem (Upper Engineering)",
    description: "Concurrently running 3rd Year (TE) & 4th Year (BE)",
    semesters: [6, 8],
    years: [3, 4],
    badge: "Sem 6 & 8",
  },
];

/**
 * Engineering Year selection options for dropdowns
 */
export const ENGINEERING_YEAR_OPTIONS = [
  { value: "1", label: "1st Year (FE - First Year Engineering)" },
  { value: "2", label: "2nd Year (SE - Second Year Engineering)" },
  { value: "3", label: "3rd Year (TE - Third Year Engineering)" },
  { value: "4", label: "4th Year (BE - Final Year Engineering)" },
];

/**
 * Get available semester options depending on chosen engineering year
 */
export function getSemesterOptionsForEngineeringYear(year?: number | string | null) {
  const y = Number(year);
  if (!y || y < 1 || y > 4) {
    // Return all 8 semesters with rich labels
    return [1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
      value: String(s),
      label: getSemesterEngineeringLabel(s),
      sem: s,
      year: getEngineeringYearFromSemester(s),
    }));
  }

  const yearInfo = ENGINEERING_YEARS.find((item) => item.year === y);
  if (!yearInfo) return [];

  const [s1, s2] = yearInfo.semesters;
  const ordYear = y === 1 ? "1st" : y === 2 ? "2nd" : y === 3 ? "3rd" : "4th";

  return [
    {
      value: String(s1),
      label: `Semester ${s1} (${ordYear} Year 1st Sem)`,
      sem: s1,
      year: y,
    },
    {
      value: String(s2),
      label: `Semester ${s2} (${ordYear} Year 2nd Sem)`,
      sem: s2,
      year: y,
    },
  ];
}
