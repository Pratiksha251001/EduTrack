import { apiFetch } from "./api";

export type ManagedRole = "hod" | "teacher" | "class_coordinator" | "student";

export interface ProvisionAccountInput {
  email: string;
  password: string;
  fullName: string;
  role: ManagedRole;
  departmentId?: string | null;
  teacherId?: string | null;
  studentId?: string | null;
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(
      data.message || `Account request failed with HTTP ${response.status}`,
    );
  }
  return data;
}

export async function provisionManagedAccount(input: ProvisionAccountInput) {
  const response = await apiFetch("/api/admin/accounts/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export interface UpdateAccountInput {
  email: string;
  fullName: string;
  role: ManagedRole;
  departmentId?: string | null;
  teacherId?: string | null;
  studentId?: string | null;
  previousRollNumber?: string | null;
  currentRollNumber?: string | null;
  password?: string;
  replaceDepartmentHod?: boolean;
}

export async function updateManagedAccount(input: UpdateAccountInput) {
  const response = await apiFetch("/api/admin/accounts/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function resetManagedAccountPassword(input: {
  teacherId?: string;
  studentId?: string;
  password: string;
}) {
  const response = await apiFetch("/api/admin/accounts/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}
