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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRoleType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("smit_user");
    const savedRole = localStorage.getItem("smit_role") as UserRoleType | null;
    if (savedUser && savedRole) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
    }
    setLoading(false);
  }, []);

  const loginAsDemo = async (targetRole: UserRoleType) => {
    setLoading(true);

    const demoUsers: Record<UserRoleType, User> = {
      admin: {
        id: "admin-1",
        email: "admin@edutrack.edu",
        full_name: "Dr. Arthur Pendelton (Administrator)",
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
    localStorage.setItem("smit_user", JSON.stringify(demoUser));
    localStorage.setItem("smit_role", targetRole);
    if (
      targetRole === "student" &&
      !localStorage.getItem(`smit_password_${demoUser.id}`)
    ) {
      localStorage.setItem(`smit_password_${demoUser.id}`, "123");
    }
    setLoading(false);
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem("smit_user");
    localStorage.removeItem("smit_role");
  };

  const setPassword = (password: string) => {
    if (user) localStorage.setItem(`smit_password_${user.id}`, password);
  };

  const registerAdmin = async (
    fullName: string,
    email: string,
    password: string,
  ) => {
    if (localStorage.getItem("smit_admin_account")) {
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
    localStorage.setItem("smit_admin_account", JSON.stringify(account));
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
          localStorage.getItem(`smit_password_${item.id}`) === password
        );
      });
      const teacherAccount = localDb.teachers.find(
        (item) =>
          item.role === "hod" &&
          item.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
          item.status === "active" &&
          (!departmentId || item.department_id === departmentId) &&
          localStorage.getItem(`smit_hod_password_${item.id}`) === password,
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
        localStorage.setItem("smit_user", JSON.stringify(hodUser));
        localStorage.setItem("smit_role", "hod");
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
      localStorage.setItem("smit_user", JSON.stringify(hodUser));
      localStorage.setItem("smit_role", "hod");
      return { ok: true };
    }
    if (targetRole !== "admin")
      return {
        ok: false,
        message: "Use the available demo login for this role.",
      };
    const saved = localStorage.getItem("smit_admin_account");
    if (!saved)
      return {
        ok: false,
        message: "Register the institution Admin before signing in.",
      };
    const account = JSON.parse(saved) as {
      id: string;
      full_name: string;
      email: string;
      password: string;
    };
    if (
      account.email !== email.trim().toLowerCase() ||
      account.password !== password
    ) {
      return { ok: false, message: "Admin email or password is incorrect." };
    }
    const adminUser = {
      id: account.id,
      email: account.email,
      full_name: account.full_name,
    };
    setUser(adminUser);
    setRole("admin");
    localStorage.setItem("smit_user", JSON.stringify(adminUser));
    localStorage.setItem("smit_role", "admin");
    return { ok: true };
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
