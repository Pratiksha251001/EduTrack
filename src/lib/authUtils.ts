export const normalizeId = (str: string | null | undefined): string =>
  (str || "").trim().toLowerCase();

/**
 * Save login credentials under multiple normalized identifiers (e.g. ID, email, employee ID, roll number)
 */
export const saveCredential = (
  identifiers: (string | null | undefined)[],
  password: string
) => {
  if (!password) return;
  identifiers
    .filter(Boolean)
    .map((id) => normalizeId(id))
    .filter((id) => id.length > 0)
    .forEach((key) => {
      localStorage.setItem(`edutrack_pwd_${key}`, password);
      localStorage.setItem(`smit_pwd_${key}`, password);
    });
};

/**
 * Retrieve saved password for any of the provided identifiers
 */
export const getCredential = (
  ...identifiers: (string | null | undefined)[]
): string | null => {
  for (const id of identifiers) {
    if (!id) continue;
    const key = normalizeId(id);
    if (!key) continue;

    const val =
      localStorage.getItem(`edutrack_pwd_${key}`) ||
      localStorage.getItem(`smit_pwd_${key}`) ||
      localStorage.getItem(`edutrack_password_${key}`) ||
      localStorage.getItem(`smit_password_${key}`) ||
      localStorage.getItem(`edutrack_hod_password_${key}`) ||
      localStorage.getItem(`smit_hod_password_${key}`);

    if (val) return val;
  }
  return null;
};

/**
 * Check if the input password matches stored password or accepted default passwords
 */
export const verifyPassword = (
  inputPassword: string,
  identifiers: (string | null | undefined)[],
  acceptedDefaults: (string | null | undefined)[] = []
): boolean => {
  if (!inputPassword) return false;

  const stored = getCredential(...identifiers);
  if (stored && stored === inputPassword) {
    return true;
  }

  // Check if it matches any of the accepted default passwords
  for (const def of acceptedDefaults) {
    if (def && def === inputPassword) {
      return true;
    }
  }

  return false;
};

/**
 * Identify if a given password is an institutional default password for a role
 */
export const isDefaultPassword = (
  password: string,
  role: string | null | undefined,
  details?: {
    employee_id?: string | null;
    roll_number?: string | null;
    reg_number?: string | null;
    email?: string | null;
    id?: string | null;
  }
): boolean => {
  if (!password || role === "admin") return false;

  const raw = password.trim();
  const lower = raw.toLowerCase();

  // Universal simple defaults
  const universalDefaults = [
    "123",
    "1234",
    "12345",
    "123456",
    "password",
    "admin@123",
    "admin@1234",
  ];
  if (universalDefaults.includes(lower)) return true;

  // Check matching employee_id
  if (details?.employee_id) {
    const emp = details.employee_id.trim().toLowerCase();
    if (emp && (lower === emp || lower === emp.replace(/[^a-z0-9]/g, ""))) {
      return true;
    }
  }

  // Check matching roll_number or reg_number
  if (details?.roll_number) {
    const roll = details.roll_number.trim().toLowerCase();
    if (roll && (lower === roll || lower === roll.replace(/[^a-z0-9]/g, ""))) {
      return true;
    }
  }
  if (details?.reg_number) {
    const reg = details.reg_number.trim().toLowerCase();
    if (reg && (lower === reg || lower === reg.replace(/[^a-z0-9]/g, ""))) {
      return true;
    }
  }

  // Role-specific defaults
  if (role === "hod") {
    const hodDefaults = ["hod@123", "hod123", "123456", "admin@123"];
    if (hodDefaults.includes(lower)) return true;
  }

  if (role === "class_coordinator") {
    const ccDefaults = ["cc@123", "cc123", "teacher@123", "teacher123", "123456"];
    if (ccDefaults.includes(lower)) return true;
  }

  if (role === "teacher" || role === "lecturer") {
    const teacherDefaults = ["teacher@123", "teacher123", "123456"];
    if (teacherDefaults.includes(lower)) return true;
  }

  if (role === "student") {
    const studentDefaults = ["student@123", "student123", "123", "123456"];
    if (studentDefaults.includes(lower)) return true;
  }

  return false;
};

/**
 * Mark that a custom password has been set for these identifiers
 */
export const markCustomPasswordSet = (
  identifiers: (string | null | undefined)[]
) => {
  identifiers
    .filter(Boolean)
    .map((id) => normalizeId(id))
    .filter((id) => id.length > 0)
    .forEach((key) => {
      localStorage.setItem(`edutrack_custom_pwd_${key}`, "true");
      localStorage.setItem(`smit_custom_pwd_${key}`, "true");
    });
};

/**
 * Check if a custom password was previously set for any of these identifiers
 */
export const hasCustomPassword = (
  ...identifiers: (string | null | undefined | (string | null | undefined)[])[]
): boolean => {
  const flat = identifiers.flat();
  for (const id of flat) {
    if (!id || typeof id !== "string") continue;
    const key = normalizeId(id);
    if (!key) continue;
    if (
      localStorage.getItem(`edutrack_custom_pwd_${key}`) === "true" ||
      localStorage.getItem(`smit_custom_pwd_${key}`) === "true"
    ) {
      return true;
    }
  }
  return false;
};

