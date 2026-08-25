import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppShell } from "./components/AppShell";

import { LandingAuth } from "./pages/LandingAuth";
import { AccessHub } from "./pages/AccessHub";
import { Dashboard } from "./pages/Dashboard";
import { Attendance } from "./pages/Attendance";
import { Departments } from "./pages/Departments";
import { Teachers } from "./pages/Teachers";
import { Subjects } from "./pages/Subjects";
import { Students } from "./pages/Students";
import { Reports } from "./pages/Reports";
import { SmsLogs } from "./pages/SmsLogs";
import { HODDashboard } from "./pages/HODDashboard";
import { ClassCoordinatorDashboard } from "./pages/ClassCoordinatorDashboard";
import { Users } from "./pages/Users";
import { Notices } from "./pages/Notices";
import { StudentDashboard } from "./pages/StudentDashboard";
import { StudentProfile } from "./pages/StudentProfile";
import { HODStaff } from "./pages/HODStaff";
import { HODClasses } from "./pages/HODClasses";
import { HODStudents } from "./pages/HODStudents";
import { ClassTeacherLogin } from "./pages/ClassTeacherLogin";
import { ClassTeacherDashboard } from "./pages/ClassTeacherDashboard";

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  denyAdmin?: boolean;
  denyHod?: boolean;
  denyStudent?: boolean;
  studentOnly?: boolean;
  roleOnly?: "hod" | "admin" | "teacher" | "class_coordinator" | "student";
}> = ({
  children,
  adminOnly = false,
  denyAdmin = false,
  denyHod = false,
  denyStudent = false,
  studentOnly = false,
  roleOnly,
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (denyAdmin && role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (denyHod && role === "hod") {
    return <Navigate to="/dashboard" replace />;
  }

  if (denyStudent && role === "student") {
    return <Navigate to="/dashboard" replace />;
  }

  if (studentOnly && role !== "student") {
    return <Navigate to="/dashboard" replace />;
  }

  if (roleOnly && role !== roleOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RoleDashboard: React.FC = () => {
  const { role } = useAuth();

  if (role === "hod") return <HODDashboard />;
  if (role === "class_coordinator") return <ClassCoordinatorDashboard />;
  if (role === "student") return <StudentDashboard />;
  return <Dashboard />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AccessHub />} />
            <Route path="/teacher/login" element={<ClassTeacherLogin />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<RoleDashboard />} />
            <Route path="/teacher/dashboard" element={<ProtectedRoute roleOnly="teacher"><ClassTeacherDashboard /></ProtectedRoute>} />
              <Route
                path="/hod/teachers"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODStaff mode="teachers" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/coordinators"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODStaff mode="coordinators" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/classes"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODClasses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/students"
                element={
                  <ProtectedRoute roleOnly="hod">
                    <HODStudents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute denyAdmin denyStudent denyHod>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments"
                element={
                  <ProtectedRoute adminOnly>
                    <Departments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute adminOnly>
                    <Teachers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subjects"
                element={
                  <ProtectedRoute adminOnly>
                    <Subjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students"
                element={
                  <ProtectedRoute adminOnly>
                    <Students />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute adminOnly>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notices"
                element={
                  <ProtectedRoute adminOnly>
                    <Notices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute denyStudent>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sms-logs"
                element={
                  <ProtectedRoute denyStudent>
                    <SmsLogs />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute studentOnly>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
