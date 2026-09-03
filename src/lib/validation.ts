/**
 * Centralized Form & Data Validation Utilities
 * Enforces strict 10-digit mobile numbers, valid emails, name formats, and date limits.
 */

/**
 * Strips formatting, spaces, hyphens, and leading +91 / 0 prefix to extract pure 10-digit mobile number.
 */
export function cleanMobile(val: string | null | undefined): string {
  if (!val) return '';
  const digits = String(val).replace(/\D/g, '');
  // If user pasted with 91 (India) country code e.g. 919876543210 (12 digits)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If user entered with leading 0 e.g. 09876543210 (11 digits)
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.slice(0, 10);
}

/**
 * Validates whether a mobile number is strictly a valid 10-digit number (starting with 6, 7, 8, 9).
 */
export function isValid10DigitMobile(val: string | null | undefined): boolean {
  if (!val) return false;
  const cleaned = cleanMobile(val);
  return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Returns a human-friendly validation error message for a mobile field, or null if valid.
 */
export function getMobileValidationError(
  val: string | null | undefined,
  fieldName = 'Mobile number',
  isRequired = true
): string | null {
  const raw = String(val || '').trim();
  if (!raw) {
    return isRequired ? `${fieldName} is mandatory (10 digits required).` : null;
  }
  const cleaned = cleanMobile(raw);
  if (cleaned.length === 0) {
    return `${fieldName} must contain numbers only.`;
  }
  if (cleaned.length < 10) {
    return `${fieldName} must be exactly 10 digits (currently ${cleaned.length} digit${cleaned.length === 1 ? '' : 's'}).`;
  }
  if (!/^[6-9]/.test(cleaned)) {
    return `${fieldName} must start with 6, 7, 8, or 9 (e.g. 9876543210).`;
  }
  return null;
}

/**
 * Formats a 10-digit number for display (e.g., "98765 43210")
 */
export function formatMobileDisplay(val: string | null | undefined): string {
  const cleaned = cleanMobile(val);
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return val ? String(val).trim() : '';
}

/**
 * Restricts live user typing to only digits and maximum 10 digits.
 * Useful for onChange handlers: `onChange={e => setValue(sanitizeMobileInput(e.target.value))}`
 */
export function sanitizeMobileInput(val: string): string {
  return val.replace(/\D/g, '').slice(0, 10);
}

/**
 * Validates email format.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

/**
 * Returns validation error message for email or null.
 */
export function getEmailValidationError(
  email: string | null | undefined,
  fieldName = 'Email address',
  isRequired = false
): string | null {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return isRequired ? `${fieldName} is required.` : null;
  }
  if (!isValidEmail(trimmed)) {
    return `${fieldName} must be a valid email format (e.g., name@example.com).`;
  }
  return null;
}

/**
 * Validates full name: letters, spaces, dots, apostrophes, hyphens, min 2 chars.
 */
export function isValidName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  return /^[a-zA-Z\s\.\'\-]{2,60}$/.test(trimmed);
}

export function getNameValidationError(
  name: string | null | undefined,
  fieldName = 'Full Name',
  isRequired = true
): string | null {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return isRequired ? `${fieldName} is required.` : null;
  }
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters.`;
  }
  if (!isValidName(trimmed)) {
    return `${fieldName} can only contain letters, spaces, dots, or hyphens.`;
  }
  return null;
}

/**
 * Validates Roll Number / Enrollment Number.
 */
export function isValidRollNumber(roll: string | null | undefined): boolean {
  if (!roll) return false;
  const trimmed = roll.trim();
  return /^[a-zA-Z0-9\-\_\/]{2,30}$/.test(trimmed);
}

export function getRollNumberValidationError(roll: string | null | undefined): string | null {
  const trimmed = String(roll || '').trim();
  if (!trimmed) {
    return 'Enrollment / Roll Number is required.';
  }
  if (!isValidRollNumber(trimmed)) {
    return 'Roll number can only contain alphanumeric characters, hyphens, underscores, or slashes.';
  }
  return null;
}

/**
 * Validates Employee ID.
 */
export function isValidEmployeeId(empId: string | null | undefined): boolean {
  if (!empId) return false;
  const trimmed = empId.trim();
  return /^[a-zA-Z0-9\-\_\/]{2,30}$/.test(trimmed);
}

export function getEmployeeIdValidationError(empId: string | null | undefined): string | null {
  const trimmed = String(empId || '').trim();
  if (!trimmed) {
    return 'Employee ID is required.';
  }
  if (!isValidEmployeeId(trimmed)) {
    return 'Employee ID can only contain alphanumeric characters, hyphens, underscores, or slashes.';
  }
  return null;
}

/**
 * Validates date of birth (must not be in future, and student/faculty must be reasonable age).
 */
export function validateDateOfBirth(
  dobString: string | null | undefined,
  minAge = 14,
  maxAge = 100
): string | null {
  if (!dobString) return null; // optional
  const date = new Date(dobString);
  if (isNaN(date.getTime())) {
    return 'Invalid Date of Birth format (expected YYYY-MM-DD).';
  }
  const now = new Date();
  if (date > now) {
    return 'Date of Birth cannot be in the future.';
  }

  const ageDifMs = now.getTime() - date.getTime();
  const ageDate = new Date(ageDifMs);
  const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);

  if (calculatedAge < minAge) {
    return `Student/Person must be at least ${minAge} years old (calculated: ${calculatedAge} yrs).`;
  }
  if (calculatedAge > maxAge) {
    return `Date of birth appears too far in the past (> ${maxAge} yrs).`;
  }

  return null;
}

/**
 * Validates semester (1-8).
 */
export function isValidSemester(sem: number | string | null | undefined): boolean {
  const num = Number(sem);
  return !isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 8;
}
