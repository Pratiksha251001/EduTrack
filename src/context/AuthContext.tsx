import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRoleType } from "../lib/types";
import { localDb } from "../lib/supabase";

interface User {
  id: string;
  email: string;
  full_name: string;
  department_id?: string | null;
  student_id?: string | null;
  teacher_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  role: UserRoleType | null;
  loading: boolean;
  loginAsDemo: (role: UserRoleType) => Promise<void>;
  signOut: () => Promise<void>;
  setPassword: (password: string) => void;
  registerAdmin: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  loginWithCredentials: (
    role: UserRoleType,
    email: string,
    password: string,
    departmentId?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStorageItem = (key: string) =>
  localStorage.getItem(`edutrack_${key}`) || localStorage.getItem(`smit_${key}`);

const setStorageItem = (key: string, value: string) => {
  localStorage.setItem(`edutrack_${key}`, value);
};

const removeStorageItem = (key: string) => {
  localStorage.removeItem(`edutrack_${key}`);
  localStorage.removeItem(`smit_${key}`);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRoleType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = getStorageItem("user");
    const savedRole = getStorageItem("role") as UserRoleType | null;
    if (savedUser && savedRole) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
    }
    setLoading(false);
  }, []);

  const loginAsDemo = async (targetRole: UserRoleType) => {
    setLoading(true);

    const defaultAdminEmail =
      import.meta.env.VITE_DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() ||
      "admin@edutrack.edu";
    const defaultAdminName =
      import.meta.env.VITE_DEFAULT_ADMIN_NAME?.trim() ||
      "Institutional Administrator";

    const demoUsers: Record<UserRoleType, User> = {
      admin: {
        id: "admin-1",
        email: defaultAdminEmail,
        full_name: defaultAdminName,
      },
      hod: {
        id: "hod-user-id",
        email: "hod.cse@edutrack.edu",
        full_name: "Dr. Robert Vance (HOD - CSE)",
        department_id: "dept-1",
        teacher_id: "t-1",
      },
      teacher: {
        id: "teacher-user-id",
        email: "teacher@edutrack.edu",
        full_name: "Prof. Sarah Jenkins",
        department_id: "dept-1",
        teacher_id: "t-2",
      },
      class_coordinator: {
        id: "cc-user-id",
        email: "cc@edutrack.edu",
        full_name: "Prof. Emily Watson (Class Coordinator)",
        department_id: "dept-1",
        teacher_id: "t-4",
      },
      student: {
        id: "student-user-id",
        email: "alex.h@student.edutrack.edu",
        full_name: "Alexander Hayes",
        department_id: "dept-1",
        student_id: "st-1",
      },
    };

    const demoUser = demoUsers[targetRole];
    setUser(demoUser);
    setRole(targetRole);
    setStorageItem("user", JSON.stringify(demoUser));
    setStorageItem("role", targetRole);
    if (
      targetRole === "student" &&
      !getStorageItem(`password_${demoUser.id}`)
    ) {
      setStorageItem(`password_${demoUser.id}`, "123");
    }
    setLoading(false);
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    removeStorageItem("user");
    removeStorageItem("role");
  };

  const setPassword = (password: string) => {
    if (user) setStorageItem(`password_${user.id}`, password);
  };

  const registerAdmin = async (
    fullName: string,
    email: string,
    password: string,
  ) => {
    if (getStorageItem("admin_account")) {
      return {
        ok: false,
        message: "An Admin account already exists for this institution.",
      };
    }
    const account = {
      id: "admin-1",
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
    };
    setStorageItem("admin_account", JSON.stringify(account));
    return { ok: true };
  };

  const loginWithCredentials = async (
    targetRole: UserRoleType,
    email: string,
    password: string,
    departmentId?: string,
  ) => {
    if (targetRole === "hod") {
      const accounts = localDb.users.filter(
        (item: any) =>
          item.role === "hod" &&
          item.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
          item.status === "active" &&
          (!departmentId || item.department_id === departmentId),
      );
      const account = accounts.find((item: any) => {
        const teacher = item.teacher_id
          ? localDb.teachers.find(
              (teacherItem) => teacherItem.id === item.teacher_id,
            )
          : undefined;
        return (
          teacher?.status === "active" &&
          getStorageItem(`password_${item.id}`) === password
        );
      });
      const teacherAccount = localDb.teachers.find(
        (item) =>
          item.role === "hod" &&
          item.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
          item.status === "active" &&
          (!departmentId || item.department_id === departmentId) &&
          (getStorageItem(`hod_password_${item.id}`) === password ||
            getStorageItem(`password_${item.id}`) === password),
      );
      if (teacherAccount) {
        const hodUser = {
          id: teacherAccount.user_id || `teacher-user-${teacherAccount.id}`,
          email: teacherAccount.email || email.trim().toLowerCase(),
          full_name: teacherAccount.full_name,
          department_id: teacherAccount.department_id,
          teacher_id: teacherAccount.id,
        };
        setUser(hodUser);
        setRole("hod");
        setStorageItem("user", JSON.stringify(hodUser));
        setStorageItem("role", "hod");
        return { ok: true };
      }
      const teacher = account?.teacher_id
        ? localDb.teachers.find((item) => item.id === account.teacher_id)
        : localDb.teachers.find(
            (item) =>
              item.email?.trim().toLowerCase() ===
                account?.email?.trim().toLowerCase() && item.role === "hod",
          );
      if (
        !account ||
        teacher?.status !== "active" ||
        !accounts.includes(account)
      ) {
        return {
          ok: false,
          message:
            "HOD email or password is incorrect, or the HOD has not been added by Admin.",
        };
      }
      const hodUser = {
        id: account.id,
        email: account.email,
        full_name: account.full_name,
        department_id: account.department_id,
        teacher_id: account.teacher_id,
      };
      setUser(hodUser);
      setRole("hod");
      setStorageItem("user", JSON.stringify(hodUser));
      setStorageItem("role", "hod");
      return { ok: true };
    }
    if (targetRole !== "admin")
      return {
        ok: false,
        message: "Use the available demo login for this role.",
      };

    const envEmail = import.meta.env.VITE_DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
    const envPassword = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD;
    const envName = import.meta.env.VITE_DEFAULT_ADMIN_NAME?.trim() || "Institutional Administrator";

    // 1. Check if matches environment-configured credentials
    if (envEmail && envPassword) {
      if (
        email.trim().toLowerCase() === envEmail &&
        password === envPassword
      ) {
        const adminUser = {
          id: "admin-env",
          email: envEmail,
          full_name: envName,
        };
        setUser(adminUser);
        setRole("admin");
        setStorageItem("user", JSON.stringify(adminUser));
        setStorageItem("role", "admin");
        return { ok: true };
      }
    }

    // 2. Check if matches locally registered admin account
    const saved = getStorageItem("admin_account");
    if (saved) {
      const account = JSON.parse(saved) as {
        id: string;
        full_name: string;
        email: string;
        password: string;
      };
      if (
        account.email === email.trim().toLowerCase() &&
        account.password === password
      ) {
        const adminUser = {
          id: account.id,
          email: account.email,
          full_name: account.full_name,
        };
        setUser(adminUser);
        setRole("admin");
        setStorageItem("user", JSON.stringify(adminUser));
        setStorageItem("role", "admin");
        return { ok: true };
      }
    }

    // 3. Fallback default credentials if not customized yet
    if (
      !envEmail &&
      !saved &&
      email.trim().toLowerCase() === "admin@edutrack.edu" &&
      password === "Admin@123"
    ) {
      const adminUser = {
        id: "admin-default",
        email: "admin@edutrack.edu",
        full_name: "Institutional Administrator",
      };
      setUser(adminUser);
      setRole("admin");
      setStorageItem("user", JSON.stringify(adminUser));
      setStorageItem("role", "admin");
      return { ok: true };
    }

    if (!saved && !envEmail) {
      return {
        ok: false,
        message: "No admin account configured. Enter admin credentials from .env or complete first-time setup.",
      };
    }

    return { ok: false, message: "Admin email or password is incorrect." };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        loginAsDemo,
        signOut,
        setPassword,
        registerAdmin,
        loginWithCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
};
