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
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRoleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const openLogoutConfirm = () => setIsLogoutConfirmOpen(true);
  const closeLogoutConfirm = () => setIsLogoutConfirmOpen(false);

  useEffect(() => {
    let mounted = true;
    let listenerSubscription: { unsubscribe: () => void } | null = null;

    if (isSupabaseConfigured) {
      const restoreSupabaseSession = async () => {
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
          setMustChangePassword(profile?.must_change_password === true);
        } catch (err) {
          console.warn("Could not restore Supabase session:", err);
        }
      };
      void restoreSupabaseSession();

      try {
        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (!session && mounted) {
              setUser(null);
              setRole(null);
              setMustChangePassword(false);
            }
          },
        );
        listenerSubscription = listener.subscription;
      } catch (err) {
        console.warn("Could not attach Supabase auth listener:", err);
      }
    }
    const savedUser = getStorageItem("user");
    const savedRole = getStorageItem("role") as UserRoleType | null;
    const savedIsDemo = getStorageItem("is_demo") === "true";
    const savedMustChange = getStorageItem("must_change_password") === "true";
    if (savedIsDemo) {
      setIsDemo(true);
      localDb.ensureDemoDataLoaded();
    }
    if (savedUser && savedRole) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setRole(savedRole);
        if (savedIsDemo) {
          setMustChangePassword(false);
          removeStorageItem("must_change_password");
        } else if (savedRole !== "admin") {
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
      "admin@edutrack.edu";
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
    newPassword: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    if (!user || !role) {
      return { ok: false, message: "No active user session." };
    }
    const cleanPassword = newPassword.trim();
    if (cleanPassword.length < 6) {
      return {
        ok: false,
        message: "Password must be at least 6 characters long.",
      };
    }

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
          "New password cannot be a default institutional password (e.g. HOD@123, CC@123, Teacher@123, 123, or your roll number/employee ID). Please set your own unique private password.",
      };
    }

    const identifiers = [
      user.id,
      user.email,
      user.teacher_id,
      user.student_id,
      user.employee_id,
      user.roll_number,
      role === "hod" && user.teacher_id ? `hod_${user.teacher_id}` : null,
    ].filter(Boolean);

    if (isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user.id === user.id) {
          const { error } = await supabase.auth.updateUser({
            password: cleanPassword,
          });
          if (error) return { ok: false, message: error.message };
          await supabase
            .from("profiles")
            .update({ must_change_password: false })
            .eq("id", user.id);
        } else {
          saveCredential(identifiers, cleanPassword);
          markCustomPasswordSet(identifiers);
        }
      } catch {
        saveCredential(identifiers, cleanPassword);
        markCustomPasswordSet(identifiers);
      }
    } else {
      saveCredential(identifiers, cleanPassword);
      markCustomPasswordSet(identifiers);
    }
    const matchingUser = localDb.users.find(
      (u) =>
        u.id === user.id ||
        (user.email && normalizeId(u.email) === normalizeId(user.email)) ||
        (user.teacher_id && u.teacher_id === user.teacher_id) ||
        (user.student_id && u.student_id === user.student_id),
    );
    if (matchingUser) {
      await localDb.update("users", matchingUser.id, {
        updated_at: new Date().toISOString(),
      });
    }

    setMustChangePassword(false);
    removeStorageItem("must_change_password");

    return { ok: true };
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
    identifier: string,
    password: string,
    departmentId?: string,
  ) => {
    const rawInput = identifier.trim();
    const cleanId = normalizeId(rawInput);
    setIsDemo(false);
    removeStorageItem("is_demo");
    const failLogin = (message: string) => {
      recordFailedLoginNotification({
        attemptedRole: targetRole,
        identifier: rawInput,
        reason: message,
      });
      return { ok: false, message };
    };

    // Admin and student accounts are provisioned in Supabase Auth.
    // HOD, coordinator, and teacher emails continue through the institutional
    // record and credential checks below until those roles are provisioned.
    if (
      isSupabaseConfigured &&
      (targetRole === "admin" || targetRole === "student") &&
      rawInput.includes("@")
    ) {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: rawInput.toLowerCase(),
          password,
        });
      if (authError) {
        return failLogin(authError.message || "Invalid email or password.");
      }
      if (authData.user) {
        const { data: roleRecord } = await supabase
          .from("user_roles")
          .select("role, department_id")
          .eq("user_id", authData.user.id)
          .maybeSingle();
        if (!roleRecord || roleRecord.role !== targetRole) {
          await supabase.auth.signOut();
          return failLogin(
            "This account is not authorized for the selected portal.",
          );
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, must_change_password")
          .eq("id", authData.user.id)
          .maybeSingle();
        const studentRecord =
          targetRole === "student"
            ? localDb.students.find((item) => item.user_id === authData.user.id)
            : undefined;
        const authenticatedUser = {
          id: authData.user.id,
          email: authData.user.email || rawInput.toLowerCase(),
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
      }
    }

    // ==========================================
    // 1. ADMIN LOGIN
    // ==========================================
    if (targetRole === "admin") {
      const envEmail =
        import.meta.env.VITE_DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
      const envPassword = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD;
      const envName =
        import.meta.env.VITE_DEFAULT_ADMIN_NAME?.trim() ||
        "Institutional Administrator";

      // 1.1 Check environment-configured credentials
      if (envEmail && envPassword) {
        if (cleanId === envEmail && password === envPassword) {
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

      // 1.2 Check locally registered admin account
      const saved = getStorageItem("admin_account");
      if (saved) {
        const account = JSON.parse(saved) as {
          id: string;
          full_name: string;
          email: string;
          password: string;
        };
        if (
          normalizeId(account.email) === cleanId &&
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

      // 1.3 Check default admin credentials fallback
      if (
        (cleanId === "admin@edutrack.edu" ||
          cleanId === "admin@edutrack.com" ||
          cleanId === "admin") &&
        (password === "Admin@123" || password === "Admin@1234")
      ) {
        const adminUser = {
          id: "admin-default",
          email: cleanId.includes("@") ? cleanId : "admin@edutrack.com",
          full_name: envName,
        };
        setUser(adminUser);
        setRole("admin");
        setStorageItem("user", JSON.stringify(adminUser));
        setStorageItem("role", "admin");
        return { ok: true };
      }

      return failLogin("Invalid Admin email or password.");
    }

    // ==========================================
    // 2. HOD LOGIN (Created by Admin)
    // ==========================================
    if (targetRole === "hod") {
      // Find teacher assigned as HOD or with role "hod"
      const matchedTeacher = localDb.teachers.find((t) => {
        const isHodRole =
          t.role === "hod" ||
          localDb.departments.some((d) => d.hod_id === t.id);
        const matchesIdentifier =
          normalizeId(t.email) === cleanId ||
          normalizeId(t.employee_id) === cleanId ||
          t.id === rawInput;
        const matchesDept = !departmentId || t.department_id === departmentId;
        return (
          isHodRole && matchesIdentifier && matchesDept && t.status === "active"
        );
      });

      // Also check user accounts
      const matchedUserAcc = localDb.users.find(
        (u) =>
          u.role === "hod" &&
          (normalizeId(u.email) === cleanId || u.id === rawInput) &&
          (!departmentId || u.department_id === departmentId) &&
          u.status === "active",
      );

      const teacherId = matchedTeacher?.id || matchedUserAcc?.teacher_id;
      const deptId =
        matchedTeacher?.department_id ||
        matchedUserAcc?.department_id ||
        departmentId;
      const email = matchedTeacher?.email || matchedUserAcc?.email || rawInput;
      const fullName =
        matchedTeacher?.full_name ||
        matchedUserAcc?.full_name ||
        "Head of Department";

      if (!matchedTeacher && !matchedUserAcc) {
        // Check if demo HOD was requested
        if (
          cleanId === "hod.cse@edutrack.edu" &&
          (password === "Hod@123" ||
            password === "HOD@123" ||
            password === "123456" ||
            password === "Admin@123")
        ) {
          const hodUser = {
            id: "hod-user-id",
            email: "hod.cse@edutrack.edu",
            full_name: "Dr. Robert Vance (HOD - CSE)",
            department_id: "dept-1",
            teacher_id: "t-1",
            employee_id: "EMP-CSE-01",
          };
          setUser(hodUser);
          setRole("hod");
          setMustChangePassword(true);
          setStorageItem("must_change_password", "true");
          setStorageItem("user", JSON.stringify(hodUser));
          setStorageItem("role", "hod");
          return { ok: true };
        }
        return failLogin(
          "HOD not found. Ensure the Admin has added this HOD and assigned their department.",
        );
      }

      const isValidPassword = verifyPassword(
        password,
        [
          matchedUserAcc?.id,
          teacherId,
          matchedTeacher?.employee_id,
          email,
          `hod_${teacherId}`,
        ],
        [
          "Hod@123",
          "HOD@123",
          "hod@123",
          matchedTeacher?.employee_id,
          "123456",
          "Admin@123",
        ],
      );

      if (!isValidPassword) {
        return failLogin(
          "Incorrect HOD password. Default is HOD@123 or employee ID.",
        );
      }

      const hodUser = {
        id:
          matchedUserAcc?.id ||
          (teacherId ? `teacher-user-${teacherId}` : `hod-${Date.now()}`),
        email,
        full_name: fullName,
        department_id: deptId,
        teacher_id: teacherId,
        employee_id: matchedTeacher?.employee_id,
      };

      const isDefault = isDefaultPassword(password, "hod", {
        employee_id: matchedTeacher?.employee_id,
        email,
        id: hodUser.id,
      });

      const hasCustom = hasCustomPassword([
        hodUser.id,
        hodUser.email,
        matchedTeacher?.employee_id,
        teacherId,
      ]);

      setUser(hodUser);
      setRole("hod");
      if (isDefault || !hasCustom) {
        setMustChangePassword(true);
        setStorageItem("must_change_password", "true");
      } else {
        setMustChangePassword(false);
        removeStorageItem("must_change_password");
      }
      setStorageItem("user", JSON.stringify(hodUser));
      setStorageItem("role", "hod");
      return { ok: true };
    }

    // ==========================================
    // 3. CLASS COORDINATOR (CC) LOGIN (Created by HOD)
    // ==========================================
    if (targetRole === "class_coordinator") {
      const matchedTeacher = localDb.teachers.find((t) => {
        const isCC =
          t.role === "class_coordinator" ||
          t.is_class_coordinator === true ||
          (localDb.class_coordinator_assignments || []).some(
            (a) => a.teacher_id === t.id,
          );
        const matchesIdentifier =
          normalizeId(t.email) === cleanId ||
          normalizeId(t.employee_id) === cleanId ||
          t.id === rawInput;
        return isCC && matchesIdentifier && t.status === "active";
      });

      const matchedUserAcc = localDb.users.find(
        (u) =>
          u.role === "class_coordinator" &&
          (normalizeId(u.email) === cleanId || u.id === rawInput) &&
          u.status === "active",
      );

      if (!matchedTeacher && !matchedUserAcc) {
        // Fallback demo CC
        if (
          cleanId === "cc@edutrack.edu" &&
          (password === "Cc@123" ||
            password === "CC@123" ||
            password === "123456" ||
            password === "Teacher@123")
        ) {
          const ccUser = {
            id: "cc-user-id",
            email: "cc@edutrack.edu",
            full_name: "Prof. Emily Watson (Class Coordinator)",
            department_id: "dept-1",
            teacher_id: "t-4",
            employee_id: "EMP-CSE-04",
          };
          setUser(ccUser);
          setRole("class_coordinator");
          setMustChangePassword(true);
          setStorageItem("must_change_password", "true");
          setStorageItem("user", JSON.stringify(ccUser));
          setStorageItem("role", "class_coordinator");
          return { ok: true };
        }
        return failLogin(
          "Class Coordinator not found. Ensure the HOD has created or assigned this coordinator.",
        );
      }

      const teacherId = matchedTeacher?.id || matchedUserAcc?.teacher_id;
      const isValidPassword = verifyPassword(
        password,
        [
          matchedUserAcc?.id,
          teacherId,
          matchedTeacher?.employee_id,
          matchedTeacher?.email,
          matchedUserAcc?.email,
        ],
        [
          "Cc@123",
          "CC@123",
          "cc@123",
          "Teacher@123",
          matchedTeacher?.employee_id,
          "123456",
        ],
      );

      if (!isValidPassword) {
        return failLogin(
          "Incorrect Class Coordinator password. Default is CC@123 or employee ID.",
        );
      }

      const ccUser = {
        id:
          matchedUserAcc?.id ||
          (teacherId ? `cc-user-${teacherId}` : `cc-${Date.now()}`),
        email: matchedTeacher?.email || matchedUserAcc?.email || rawInput,
        full_name:
          matchedTeacher?.full_name ||
          matchedUserAcc?.full_name ||
          "Class Coordinator",
        department_id:
          matchedTeacher?.department_id || matchedUserAcc?.department_id,
        teacher_id: teacherId,
        employee_id: matchedTeacher?.employee_id,
      };

      const isDefault = isDefaultPassword(password, "class_coordinator", {
        employee_id: matchedTeacher?.employee_id,
        email: ccUser.email,
        id: ccUser.id,
      });

      const hasCustom = hasCustomPassword([
        ccUser.id,
        ccUser.email,
        teacherId,
        matchedTeacher?.employee_id,
      ]);

      setUser(ccUser);
      setRole("class_coordinator");
      if (isDefault || !hasCustom) {
        setMustChangePassword(true);
        setStorageItem("must_change_password", "true");
      } else {
        setMustChangePassword(false);
        removeStorageItem("must_change_password");
      }
      setStorageItem("user", JSON.stringify(ccUser));
      setStorageItem("role", "class_coordinator");
      return { ok: true };
    }

    // ==========================================
    // 4. TEACHER / LECTURER LOGIN (Created by HOD)
    // ==========================================
    if (targetRole === "teacher") {
      const matchedTeacher = localDb.teachers.find((t) => {
        const matchesIdentifier =
          normalizeId(t.email) === cleanId ||
          normalizeId(t.employee_id) === cleanId ||
          t.id === rawInput;
        return matchesIdentifier && t.status === "active";
      });

      const matchedUserAcc = localDb.users.find(
        (u) =>
          (u.role === "teacher" || (u.role as string) === "lecturer") &&
          (normalizeId(u.email) === cleanId || u.id === rawInput) &&
          u.status === "active",
      );

      if (!matchedTeacher && !matchedUserAcc) {
        if (
          cleanId === "teacher@edutrack.edu" &&
          (password === "Teacher@123" || password === "123456")
        ) {
          const teacherUser = {
            id: "teacher-user-id",
            email: "teacher@edutrack.edu",
            full_name: "Prof. Sarah Jenkins",
            department_id: "dept-1",
            teacher_id: "t-2",
            employee_id: "EMP-CSE-02",
          };
          setUser(teacherUser);
          setRole("teacher");
          setMustChangePassword(true);
          setStorageItem("must_change_password", "true");
          setStorageItem("user", JSON.stringify(teacherUser));
          setStorageItem("role", "teacher");
          return { ok: true };
        }
        return failLogin(
          "Faculty teacher not found. Ensure the HOD has created this teacher.",
        );
      }

      const teacherId = matchedTeacher?.id || matchedUserAcc?.teacher_id;
      const isValidPassword = verifyPassword(
        password,
        [
          matchedUserAcc?.id,
          teacherId,
          matchedTeacher?.employee_id,
          matchedTeacher?.email,
          matchedUserAcc?.email,
        ],
        ["Teacher@123", "teacher@123", matchedTeacher?.employee_id, "123456"],
      );

      if (!isValidPassword) {
        return failLogin(
          "Incorrect faculty password. Default is Teacher@123 or employee ID.",
        );
      }

      const teacherUser = {
        id:
          matchedUserAcc?.id ||
          (teacherId ? `teacher-user-${teacherId}` : `teacher-${Date.now()}`),
        email: matchedTeacher?.email || matchedUserAcc?.email || rawInput,
        full_name:
          matchedTeacher?.full_name ||
          matchedUserAcc?.full_name ||
          "Faculty Member",
        department_id:
          matchedTeacher?.department_id || matchedUserAcc?.department_id,
        teacher_id: teacherId,
        employee_id: matchedTeacher?.employee_id,
      };

      const isDefault = isDefaultPassword(password, "teacher", {
        employee_id: matchedTeacher?.employee_id,
        email: teacherUser.email,
        id: teacherUser.id,
      });

      const hasCustom = hasCustomPassword([
        teacherUser.id,
        teacherUser.email,
        teacherId,
        matchedTeacher?.employee_id,
      ]);

      setUser(teacherUser);
      setRole("teacher");
      if (isDefault || !hasCustom) {
        setMustChangePassword(true);
        setStorageItem("must_change_password", "true");
      } else {
        setMustChangePassword(false);
        removeStorageItem("must_change_password");
      }
      setStorageItem("user", JSON.stringify(teacherUser));
      setStorageItem("role", "teacher");
      return { ok: true };
    }

    // ==========================================
    // 5. STUDENT LOGIN (Created by Coordinator / Teacher / HOD)
    // ==========================================
    if (targetRole === "student") {
      const matchedStudent = localDb.students.find((s) => {
        const matchesIdentifier =
          normalizeId(s.roll_number) === cleanId ||
          normalizeId(s.reg_number) === cleanId ||
          normalizeId(s.email) === cleanId ||
          s.id === rawInput;
        return matchesIdentifier && s.status === "active";
      });

      const matchedUserAcc = localDb.users.find(
        (u) =>
          u.role === "student" &&
          (normalizeId(u.email) === cleanId || u.id === rawInput) &&
          u.status === "active",
      );

      if (!matchedStudent && !matchedUserAcc) {
        if (
          (cleanId === "123" || cleanId === "alex.h@student.edutrack.edu") &&
          (password === "123" || password === "Student@123")
        ) {
          const studentUser = {
            id: "student-user-id",
            email: "alex.h@student.edutrack.edu",
            full_name: "Alexander Hayes",
            department_id: "dept-1",
            student_id: "st-1",
            roll_number: "101",
          };
          setUser(studentUser);
          setRole("student");
          setMustChangePassword(true);
          setStorageItem("must_change_password", "true");
          setStorageItem("user", JSON.stringify(studentUser));
          setStorageItem("role", "student");
          return { ok: true };
        }
        return failLogin(
          "Student record not found. Check your Roll Number or contact your Class Teacher.",
        );
      }

      const studentId = matchedStudent?.id || matchedUserAcc?.student_id;
      const rollNumber = matchedStudent?.roll_number;
      const regNumber = matchedStudent?.reg_number;

      const isValidPassword = verifyPassword(
        password,
        [
          matchedUserAcc?.id,
          studentId,
          rollNumber,
          regNumber,
          matchedStudent?.email,
          matchedUserAcc?.email,
        ],
        [rollNumber, regNumber, "123", "Student@123", "student@123", "123456"],
      );

      if (!isValidPassword) {
        return failLogin(
          `Incorrect password. Default student password is your Roll Number (${rollNumber || "e.g. 101"}).`,
        );
      }

      const studentUser = {
        id:
          matchedUserAcc?.id ||
          (studentId ? `student-user-${studentId}` : `student-${Date.now()}`),
        email:
          matchedStudent?.email ||
          matchedUserAcc?.email ||
          `${normalizeId(rollNumber || "student")}@student.edutrack.edu`,
        full_name:
          matchedStudent?.full_name ||
          matchedUserAcc?.full_name ||
          "Enrolled Student",
        department_id:
          matchedStudent?.department_id || matchedUserAcc?.department_id,
        student_id: studentId,
        roll_number: rollNumber,
      };

      const isDefault = isDefaultPassword(password, "student", {
        roll_number: rollNumber,
        reg_number: regNumber,
        email: studentUser.email,
        id: studentUser.id,
      });

      const hasCustom = hasCustomPassword([
        studentUser.id,
        studentUser.email,
        studentId,
        rollNumber,
        regNumber,
      ]);

      setUser(studentUser);
      setRole("student");
      if (isDefault || !hasCustom) {
        setMustChangePassword(true);
        setStorageItem("must_change_password", "true");
      } else {
        setMustChangePassword(false);
        removeStorageItem("must_change_password");
      }
      setStorageItem("user", JSON.stringify(studentUser));
      setStorageItem("role", "student");
      return { ok: true };
    }

    return { ok: false, message: "Invalid role selected." };
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
