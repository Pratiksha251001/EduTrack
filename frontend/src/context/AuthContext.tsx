import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRoleType } from "../lib/types";
import { localDb, supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  normalizeId,
  saveCredential,
  verifyPassword,
  isDefaultPassword,
  markCustomPasswordSet,
  hasCustomPassword,
} from "../lib/authUtils";
import { recordFailedLoginNotification } from "../lib/notificationService";

interface User {
  id: string;
  email: string;
  full_name: string;
  department_id?: string | null;
  student_id?: string | null;
  teacher_id?: string | null;
  employee_id?: string | null;
  roll_number?: string | null;
}

interface AuthContextType {
  user: User | null;
  role: UserRoleType | null;
  loading: boolean;
  isDemo: boolean;
  mustChangePassword: boolean;
  loginAsDemo: (role: UserRoleType) => Promise<void>;
  loginAsRandomDemo: () => Promise<UserRoleType>;
  signOut: () => Promise<void>;
  isLogoutConfirmOpen: boolean;
  isLoggingOut: boolean;
  openLogoutConfirm: () => void;
  closeLogoutConfirm: () => void;
  confirmLogout: () => Promise<void>;
  setPassword: (password: string) => void;
  updateUserPassword: (
    newPassword: string,
  ) => Promise<{ ok: boolean; message?: string }>;
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
  localStorage.getItem(`edutrack_${key}`) ||
  localStorage.getItem(`smit_${key}`);

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
  // Synchronous initialization from localStorage so page refreshes never drop session
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = getStorageItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState<UserRoleType | null>(() => {
    return (getStorageItem("role") as UserRoleType | null) || null;
  });
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return getStorageItem("is_demo") === "true";
  });
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    return getStorageItem("must_change_password") === "true";
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const savedUser = getStorageItem("user");
    const savedRole = getStorageItem("role");
    // If we already have a saved session, we are ready immediately (no loading spinner flash)
    return !(savedUser && savedRole);
  });
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const openLogoutConfirm = () => setIsLogoutConfirmOpen(true);
  const closeLogoutConfirm = () => setIsLogoutConfirmOpen(false);

  useEffect(() => {
    let mounted = true;
    let listenerSubscription: { unsubscribe: () => void } | null = null;
    let restoreSupabaseSession: (() => Promise<void>) | null = null;

    // 1. If demo mode was saved, load demo dataset so mock records are populated
    const savedIsDemo = getStorageItem("is_demo") === "true";
    if (savedIsDemo) {
      setIsDemo(true);
      localDb.ensureDemoDataLoaded();
    }

    // 2. Re-verify password requirements for non-admin
    const savedUser = getStorageItem("user");
    const savedRole = getStorageItem("role") as UserRoleType | null;
    const savedMustChange = getStorageItem("must_change_password") === "true";

    if (savedUser && savedRole) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (!savedIsDemo && savedRole !== "admin") {
          const identifiers = [
            parsedUser.id,
            parsedUser.email,
            parsedUser.teacher_id,
            parsedUser.employee_id,
            parsedUser.student_id,
            parsedUser.roll_number,
          ];
          const hasCustom = hasCustomPassword(identifiers);
          if (!hasCustom || savedMustChange) {
            setMustChangePassword(true);
            setStorageItem("must_change_password", "true");
          }
        }
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }

    // 3. Supabase background session sync (if configured)
    if (isSupabaseConfigured) {
      restoreSupabaseSession = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (!mounted || !data?.session) return;
          const authUser = data.session.user;
          const { data: roleRecord } = await supabase
            .from("user_roles")
            .select("role, department_id")
            .eq("user_id", authUser.id)
            .maybeSingle();
          if (!roleRecord) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, must_change_password")
            .eq("id", authUser.id)
            .maybeSingle();
          const restoredUser = {
            id: authUser.id,
            email: authUser.email || "",
            full_name:
              profile?.full_name ||
              authUser.user_metadata?.full_name ||
              "Portal User",
            department_id: roleRecord.department_id,
          };
          setUser(restoredUser);
          setRole(roleRecord.role as UserRoleType);
          setStorageItem("user", JSON.stringify(restoredUser));
          setStorageItem("role", roleRecord.role as string);
          setMustChangePassword(profile?.must_change_password === true);
        } catch (err) {
          console.warn("Could not restore Supabase session:", err);
        }
      };
      void restoreSupabaseSession?.();

      try {
        const { data: listener } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;
            // CRITICAL FIX: Only clear state if explicitly SIGNED_OUT and no local session exists.
            // Never wipe user on INITIAL_SESSION when session is null.
            if (event === "SIGNED_OUT") {
              const currentSaved = getStorageItem("user");
              if (!currentSaved) {
                setUser(null);
                setRole(null);
                setMustChangePassword(false);
              }
            } else if (event === "SIGNED_IN" && session?.user) {
              void restoreSupabaseSession?.();
            }
          },
        );
        listenerSubscription = listener.subscription;
      } catch (err) {
        console.warn("Could not attach Supabase auth listener:", err);
      }
    }
    // Finished background check
    setLoading(false);

    return () => {
      mounted = false;
      listenerSubscription?.unsubscribe();
    };
  }, []);

  const loginAsDemo = async (targetRole: UserRoleType) => {
    setLoading(true);

    // Ensure database mock records are loaded so dashboard and profiles are populated
    localDb.ensureDemoDataLoaded();

    const defaultAdminEmail =
      import.meta.env.VITE_DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() ||
      "edutrack.work@gmail.com";
    const defaultAdminName =
      import.meta.env.VITE_DEFAULT_ADMIN_NAME?.trim() ||
      "Institutional Administrator";

    const demoUsers: Record<UserRoleType, User> = {
      admin: {
        id: "admin-1",
        email: defaultAdminEmail,
        full_name: defaultAdminName,
        employee_id: "ADM-SYS-2025",
      },
      hod: {
        id: "hod-user-id",
        email: "hod.cse@edutrack.edu",
        full_name: "Dr. Robert Vance (HOD)",
        department_id: "dept-1",
        teacher_id: "t-1",
        employee_id: "EMP-101",
      },
      teacher: {
        id: "teacher-user-id",
        email: "s.jenkins@edutrack.edu",
        full_name: "Prof. Sarah Jenkins",
        department_id: "dept-1",
        teacher_id: "t-2",
        employee_id: "EMP-102",
      },
      class_coordinator: {
        id: "cc-user-id",
        email: "e.watson@edutrack.edu",
        full_name: "Prof. Emily Watson (Class Coordinator)",
        department_id: "dept-1",
        teacher_id: "t-4",
        employee_id: "EMP-104",
      },
      student: {
        id: "student-user-id",
        email: "alex.h@student.edutrack.edu",
        full_name: "Alexander Hayes",
        department_id: "dept-1",
        student_id: "st-1",
        roll_number: "21CS001",
      },
    };

    const demoUser = demoUsers[targetRole];
    setUser(demoUser);
    setRole(targetRole);
    setIsDemo(true);
    setStorageItem("user", JSON.stringify(demoUser));
    setStorageItem("role", targetRole);
    setStorageItem("is_demo", "true");

    // In demo / study mode, never block user with password change modal
    setMustChangePassword(false);
    removeStorageItem("must_change_password");

    if (
      targetRole === "student" &&
      !getStorageItem(`password_${demoUser.id}`)
    ) {
      setStorageItem(`password_${demoUser.id}`, "123");
    }
    const defaultPath =
      targetRole === "teacher" ? "/teacher/dashboard" : "/dashboard";
    localStorage.setItem("edutrack_last_active_path", defaultPath);
    setLoading(false);
  };

  const loginAsRandomDemo = async (): Promise<UserRoleType> => {
    const roles: UserRoleType[] = [
      "admin",
      "hod",
      "class_coordinator",
      "teacher",
      "student",
    ];
    const candidates = roles.filter((r) => r !== role);
    const chosenRole =
      candidates[Math.floor(Math.random() * candidates.length)] || "admin";
    await loginAsDemo(chosenRole);
    return chosenRole;
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Could not sign out of Supabase:", err);
      }
    }
    setUser(null);
    setRole(null);
    setIsDemo(false);
    setMustChangePassword(false);
    removeStorageItem("user");
    removeStorageItem("role");
    removeStorageItem("is_demo");
    removeStorageItem("must_change_password");
    removeStorageItem("last_active_path");
    localStorage.removeItem("edutrack_last_active_path");
    localStorage.removeItem("smit_last_active_path");
    localStorage.removeItem("edutrack_last_authenticated_path");
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  };

  const setPassword = (password: string) => {
    if (user) {
      setStorageItem(`password_${user.id}`, password);
      const identifiers = [
        user.id,
        user.email,
        user.teacher_id,
        user.student_id,
        user.employee_id,
        user.roll_number,
      ].filter(Boolean);
      saveCredential(identifiers, password);
      markCustomPasswordSet(identifiers);
    }
  };

  const updateUserPassword = async (
    password: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    const cleanPassword = password.trim();
    if (!user || !role)
      return { ok: false, message: "No active user session." };
    if (cleanPassword.length < 8)
      return {
        ok: false,
        message: "Password must be at least 8 characters long.",
      };
    if (
      isDefaultPassword(cleanPassword, role, {
        employee_id: user.employee_id,
        roll_number: user.roll_number,
        email: user.email,
        id: user.id,
      })
    ) {
      return {
        ok: false,
        message:
          "Choose a private password that is different from institutional defaults and account identifiers.",
      };
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user.id !== user.id)
      return {
        ok: false,
        message:
          "Your Supabase session is missing or expired. Sign in again before changing the password.",
      };
    const { error } = await supabase.auth.updateUser({
      password: cleanPassword,
    });
    if (error) return { ok: false, message: error.message };
    await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
    setMustChangePassword(false);
    removeStorageItem("must_change_password");
    return { ok: true };
  };

  const registerAdmin = async (
    fullName: string,
    email: string,
    password: string,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      if (!data.user) {
        return {
          ok: false,
          message: "Supabase did not create the Admin account.",
        };
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        email: normalizedEmail,
        must_change_password: false,
      });
      if (profileError) {
        return {
          ok: false,
          message: `Admin Auth account was created, but the profile could not be saved: ${profileError.message}`,
        };
      }

      const { error: roleError } = await supabase.from("user_roles").upsert(
        {
          user_id: data.user.id,
          role: "admin",
          department_id: null,
        },
        { onConflict: "user_id,role" },
      );
      if (roleError) {
        return {
          ok: false,
          message: `Admin profile was saved, but the Admin role could not be saved: ${roleError.message}`,
        };
      }

      return {
        ok: true,
        message: data.session
          ? undefined
          : "Admin registered. Confirm the email in Supabase before signing in.",
      };
    }

    if (getStorageItem("admin_account")) {
      return {
        ok: false,
        message: "An Admin account already exists for this institution.",
      };
    }
    const account = {
      id: "admin-1",
      full_name: fullName.trim(),
      email: normalizedEmail,
      password,
    };
    setStorageItem("admin_account", JSON.stringify(account));
    return { ok: true };
  };

  const loginWithCredentials = async (
    targetRole: UserRoleType,
    identifier: string,
    password: string,
    departmentId?: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    const rawInput = identifier.trim();
    const failLogin = (message: string): { ok: boolean; message?: string } => ({
      ok: false,
      message,
    });
    if (!rawInput || !password)
      return failLogin("Email/ID and password are required.");

    let email = rawInput.toLowerCase();
    if (!email.includes("@")) {
      if (targetRole === "student") {
        const student = localDb.students.find((item) =>
          [item.roll_number, item.reg_number, item.prn_number]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase() === email),
        );
        email = student?.email?.trim().toLowerCase() || "";
      } else {
        const teacher = localDb.teachers.find(
          (item) => item.employee_id?.trim().toLowerCase() === email,
        );
        email = teacher?.email?.trim().toLowerCase() || "";
      }
    }
    if (!email)
      return failLogin(
        "This record has no email-linked Supabase account. Ask an administrator to provision it.",
      );

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user)
      return failLogin(authError?.message || "Invalid email or password.");
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role,department_id")
      .eq("user_id", authData.user.id);
    const roleRecord = roles?.find((row) => row.role === targetRole);
    if (roleError || !roleRecord) {
      await supabase.auth.signOut();
      return failLogin(
        "This account is not authorized for the selected portal.",
      );
    }
    if (
      departmentId &&
      roleRecord.department_id &&
      roleRecord.department_id !== departmentId
    ) {
      await supabase.auth.signOut();
      return failLogin(
        "This account is not assigned to the selected department.",
      );
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,must_change_password")
      .eq("id", authData.user.id)
      .maybeSingle();
    const studentRecord =
      targetRole === "student"
        ? localDb.students.find((item) => item.user_id === authData.user.id)
        : undefined;
    const authenticatedUser = {
      id: authData.user.id,
      email: authData.user.email || email,
      full_name:
        profile?.full_name ||
        authData.user.user_metadata?.full_name ||
        "Portal User",
      department_id: roleRecord.department_id,
      student_id: studentRecord?.id,
      roll_number: studentRecord?.roll_number,
    };
    setUser(authenticatedUser);
    setRole(targetRole);
    setStorageItem("user", JSON.stringify(authenticatedUser));
    setStorageItem("role", targetRole);
    const requiresChange = profile?.must_change_password === true;
    setMustChangePassword(requiresChange);
    if (requiresChange) setStorageItem("must_change_password", "true");
    else removeStorageItem("must_change_password");
    return { ok: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isDemo,
        mustChangePassword,
        loginAsDemo,
        loginAsRandomDemo,
        signOut,
        isLogoutConfirmOpen,
        isLoggingOut,
        openLogoutConfirm,
        closeLogoutConfirm,
        confirmLogout,
        setPassword,
        updateUserPassword,
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
