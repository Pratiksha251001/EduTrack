import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
interface StudentAccountLink {
  id: string;
  roll_number: string;
  department_id: string | null;
  email: string | null;
  full_name: string;
}
const resolveStudentAccountLink = async (
  authUserId: string,
  accountRole: UserRoleType,
): Promise<StudentAccountLink | null> => {
  if (accountRole !== "student") return null;
  const { data, error } = await supabase
    .from("students")
    .select("id,roll_number,department_id,email,full_name")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Could not load the linked student profile: ${error.message}`,
    );
  }
  return data as StudentAccountLink | null;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const openLogoutConfirm = () => setIsLogoutConfirmOpen(true);
  const closeLogoutConfirm = () => setIsLogoutConfirmOpen(false);

  // Auth-session race guard: invalidate stale asynchronous account restoration.
  const authEpoch = useRef(0);
  const credentialLoginActive = useRef(false);
  const demoSessionActive = useRef(getStorageItem("is_demo") === "true");
  const providerMounted = useRef(true);
  const clearAuthenticatedState = useCallback(() => {
    authEpoch.current += 1;
    setUser(null);
    setRole(null);
    setIsDemo(false);
    setMustChangePassword(false);
    setLoading(false);
    for (const key of [
      "user",
      "role",
      "is_demo",
      "must_change_password",
      "last_active_path",
      "last_authenticated_path",
    ]) {
      removeStorageItem(key);
    }
  }, []);
  useEffect(() => {
    providerMounted.current = true;
    let mounted = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let subscription: { unsubscribe: () => void } | null = null;
    const savedIsDemo = getStorageItem("is_demo") === "true";
    demoSessionActive.current = savedIsDemo;
    if (savedIsDemo) {
      setIsDemo(true);
      localDb.ensureDemoDataLoaded();
    }
    // Keep local/demo password requirements separate from remote authentication.
    const savedUser = getStorageItem("user");
    const savedRole = getStorageItem("role") as UserRoleType | null;
    const savedMustChange = getStorageItem("must_change_password") === "true";
    if (!isSupabaseConfigured && savedUser && savedRole) {
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
          if (!hasCustomPassword(identifiers) || savedMustChange) {
            setMustChangePassword(true);
            setStorageItem("must_change_password", "true");
          }
        }
      } catch (error) {
        console.error("Failed to parse saved user", error);
      }
    }
    const restoreSupabaseSession = async () => {
      if (
        !mounted ||
        credentialLoginActive.current ||
        demoSessionActive.current
      )
        return;
      const epoch = ++authEpoch.current;
      const isCurrent = () =>
        mounted &&
        epoch === authEpoch.current &&
        !credentialLoginActive.current &&
        !demoSessionActive.current;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isCurrent()) return;
        if (error) throw error;
        if (!data?.session) {
          clearAuthenticatedState();
          return;
        }
        const authUser = data.session.user;
        const { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("role,department_id")
          .eq("user_id", authUser.id);
        if (!isCurrent()) return;
        if (roleError) throw roleError;
        const preferredRole = getStorageItem("role");
        const roleRecord =
          roles?.find((row) => row.role === preferredRole) ||
          (roles?.length === 1 ? roles[0] : null);
        if (!roleRecord)
          throw new Error("No unambiguous portal role is available.");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name,must_change_password")
          .eq("id", authUser.id)
          .maybeSingle();
        if (!isCurrent()) return;
        if (profileError) throw profileError;
        if (!profile) throw new Error("The account profile is missing.");
        await localDb.waitUntilReady();
        if (!isCurrent()) return;
        const restoredRole = roleRecord.role as UserRoleType;
        const studentRecord = await resolveStudentAccountLink(
          authUser.id,
          restoredRole,
        );
        if (!isCurrent()) return;
        if (restoredRole === "student" && !studentRecord) {
          throw new Error("The student account has no linked student record.");
        }
        const { data: latest, error: latestError } =
          await supabase.auth.getSession();
        if (!isCurrent()) return;
        if (latestError) throw latestError;
        if (latest.session?.user.id !== authUser.id) {
          clearAuthenticatedState();
          return;
        }
        const restoredUser = {
          id: authUser.id,
          email: studentRecord?.email || authUser.email || "",
          full_name:
            studentRecord?.full_name ||
            profile.full_name ||
            authUser.user_metadata?.full_name ||
            "Portal User",
          department_id:
            studentRecord?.department_id || roleRecord.department_id,
          student_id: studentRecord?.id,
          roll_number: studentRecord?.roll_number,
        };
        setUser(restoredUser);
        setRole(restoredRole);
        setIsDemo(false);
        removeStorageItem("is_demo");
        setStorageItem("user", JSON.stringify(restoredUser));
        setStorageItem("role", restoredRole);
        const requiresChange = profile.must_change_password === true;
        setMustChangePassword(requiresChange);
        if (requiresChange) setStorageItem("must_change_password", "true");
        else removeStorageItem("must_change_password");
      } catch (error) {
        if (isCurrent()) {
          console.warn("Could not restore Supabase session:", error);
          clearAuthenticatedState();
        }
      } finally {
        if (
          mounted &&
          epoch === authEpoch.current &&
          !credentialLoginActive.current
        )
          setLoading(false);
      }
    };
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted || demoSessionActive.current) return;
        if (event === "SIGNED_OUT") {
          clearAuthenticatedState();
          return;
        }
        if (
          event === "SIGNED_IN" &&
          session?.user &&
          !credentialLoginActive.current
        ) {
          // Run outside the synchronous Auth callback to avoid client lock re-entry.
          const scheduledEpoch = authEpoch.current;
          const timer = setTimeout(() => {
            timers.delete(timer);
            if (
              mounted &&
              scheduledEpoch === authEpoch.current &&
              !credentialLoginActive.current &&
              !demoSessionActive.current
            ) {
              void restoreSupabaseSession();
            }
          }, 0);
          timers.add(timer);
        }
      });
      subscription = data.subscription;
      if (!savedIsDemo) void restoreSupabaseSession();
      else setLoading(false);
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
      providerMounted.current = false;
      authEpoch.current += 1;
      for (const timer of timers) clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, [clearAuthenticatedState]);

  const loginAsDemo = async (targetRole: UserRoleType) => {
    authEpoch.current += 1;
    demoSessionActive.current = true;

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
    const wasDemo = demoSessionActive.current;
    demoSessionActive.current = false;
    clearAuthenticatedState();
    if (isSupabaseConfigured && !wasDemo) {
      try {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) console.warn("Could not sign out of Supabase:", error);
      } catch (error) {
        console.warn("Could not sign out of Supabase:", error);
      }
    }
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
    const failLogin = (message: string) => ({ ok: false, message });
    const rawInput = identifier.trim();
    if (!rawInput || !password)
      return failLogin("Email/ID and password are required.");
    if (credentialLoginActive.current)
      return failLogin("A sign-in is already in progress.");
    credentialLoginActive.current = true;
    demoSessionActive.current = false;
    clearAuthenticatedState();
    setLoading(true);
    const epoch = authEpoch.current;
    const isCurrent = () =>
      providerMounted.current && epoch === authEpoch.current;
    const cancelled = () =>
      failLogin("Sign-in was cancelled. Please try again.");
    const rejectLogin = async (message: string) => {
      if (!isCurrent()) return cancelled();
      clearAuthenticatedState();
      try {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) console.warn("Could not close rejected sign-in:", error);
      } catch (error) {
        console.warn("Could not close rejected sign-in:", error);
      }
      return failLogin(message);
    };
    try {
      let email = rawInput.toLowerCase();
      if (!email.includes("@")) {
        await localDb.waitUntilReady();
        if (!isCurrent()) return cancelled();
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
      if (!isCurrent()) return cancelled();
      if (authError || !authData.user || !authData.session) {
        return await rejectLogin(
          authError?.message || "Invalid email or password.",
        );
      }
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role,department_id")
        .eq("user_id", authData.user.id);
      if (!isCurrent()) return cancelled();
      if (roleError)
        return await rejectLogin(
          "Could not verify portal access. Please try again.",
        );
      const roleRecord = roles?.find((row) => row.role === targetRole);
      if (!roleRecord)
        return await rejectLogin(
          "This account is not authorized for the selected portal.",
        );
      if (departmentId && roleRecord.department_id !== departmentId) {
        return await rejectLogin(
          "This account is not assigned to the selected department.",
        );
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name,must_change_password")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (!isCurrent()) return cancelled();
      if (profileError || !profile)
        return await rejectLogin("The account profile could not be loaded.");
      const studentRecord = await resolveStudentAccountLink(
        authData.user.id,
        targetRole,
      );
      if (!isCurrent()) return cancelled();
      if (targetRole === "student" && !studentRecord)
        return await rejectLogin(
          "This student account is not linked to a student profile. Ask an administrator to repair the account link.",
        );
      const { data: latest, error: latestError } =
        await supabase.auth.getSession();
      if (!isCurrent()) return cancelled();
      if (latestError || latest.session?.user.id !== authData.user.id) {
        return await rejectLogin(
          "Your sign-in session expired. Please sign in again.",
        );
      }
      const authenticatedUser = {
        id: authData.user.id,
        email: studentRecord?.email || authData.user.email || email,
        full_name:
          studentRecord?.full_name ||
          profile.full_name ||
          authData.user.user_metadata?.full_name ||
          "Portal User",
        department_id: studentRecord?.department_id || roleRecord.department_id,
        student_id: studentRecord?.id,
        roll_number: studentRecord?.roll_number,
      };
      setUser(authenticatedUser);
      setRole(targetRole);
      setIsDemo(false);
      setStorageItem("user", JSON.stringify(authenticatedUser));
      setStorageItem("role", targetRole);
      const requiresChange = profile.must_change_password === true;
      setMustChangePassword(requiresChange);
      if (requiresChange) setStorageItem("must_change_password", "true");
      else removeStorageItem("must_change_password");
      return { ok: true };
    } catch (error) {
      return await rejectLogin(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      credentialLoginActive.current = false;
      if (providerMounted.current) setLoading(false);
    }
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
