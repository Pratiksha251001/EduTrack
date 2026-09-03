import React, { useRef, useState } from "react";
import { ArrowLeft, Camera, Lock, Save, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { college } from "../lib/college";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export const StudentProfile: React.FC = () => {
  const { user, setPassword } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const student = localDb.students.find((item) => item.id === user?.student_id);
  const department = localDb.departments.find(
    (item) => item.id === student?.department_id,
  );
  const [form, setForm] = useState({
    email: student?.email || "",
    student_mobile: student?.student_mobile || "",
    address: student?.address || "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [, refresh] = useState(0);

  if (!student)
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Student profile is not available.
      </div>
    );

  const saveProfile = async () => {
    await localDb.update("students", student.id, form);
    alert("Profile updated successfully.");
    refresh((value) => value + 1);
  };

  const uploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await localDb.update("students", student.id, {
        photo_url: reader.result as string,
      });
      refresh((value) => value + 1);
    };
    reader.readAsDataURL(file);
  };

  const savePassword = () => {
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }
    const savedPassword =
      localStorage.getItem(`edutrack_password_${user?.id}`) ||
      localStorage.getItem(`smit_password_${user?.id}`);
    if (savedPassword && savedPassword !== currentPassword) {
      alert("Current password is incorrect.");
      return;
    }
    setPassword(newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    alert("Password set successfully.");
  };

  const isDefaultPassword =
    localStorage.getItem(`edutrack_password_${user?.id}`) === "123" ||
    localStorage.getItem(`smit_password_${user?.id}`) === "123";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Student Portal
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold">My Profile</h1>
        </div>
      </div>

      {isDefaultPassword && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              Please change your default password.
            </p>
            <p className="mt-1 text-xs opacity-80">
              Your temporary password is your enrollment number. Set a private
              password below.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-primary/20 bg-primary/10 text-2xl font-bold text-primary">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              student.full_name
                .split(" ")
                .map((name) => name[0])
                .slice(0, 2)
                .join("")
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadPhoto}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Add or change photo
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Your profile image is visible only in your student profile.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-primary" /> Personal and Academic
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ReadOnly label="Student ID / Roll No." value={student.roll_number} />
          <ReadOnly
            label="Registration No."
            value={student.reg_number || "—"}
          />
          <ReadOnly label="Full Name" value={student.full_name} />
          <ReadOnly
            label="Date of Birth"
            value={student.date_of_birth || "—"}
          />
          <ReadOnly label="Gender" value={student.gender || "—"} />
          <ReadOnly label="Department" value={department?.name || "—"} />
          <ReadOnly label="Class" value={`Semester ${student.semester}`} />
          <ReadOnly
            label="Academic Year"
            value={student.reg_number?.match(/20\d{2}/)?.[0] || "—"}
          />
          <ReadOnly
            label="Parent / Guardian Name"
            value={student.parent_name || "—"}
          />
          <ReadOnly
            label="Parent / Guardian Mobile"
            value={student.parent_mobile || "—"}
          />
          <div className="sm:col-span-2">
            <ReadOnly label="Address" value={student.address || "—"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allowed Personal Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            You can update your email, student mobile, and address. Academic and
            parent information is controlled by your institution.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
              type="email"
            />
            <Field
              label="Student Mobile"
              value={form.student_mobile}
              onChange={(value) => setForm({ ...form, student_mobile: value })}
            />
            <div className="sm:col-span-2">
              <Field
                label="Address"
                value={form.address}
                onChange={(value) => setForm({ ...form, address: value })}
              />
            </div>
          </div>
          <Button onClick={saveProfile}>
            <Save className="mr-2 h-4 w-4" /> Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" /> Set Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Set a password for your student account. Passwords are not displayed
            in your profile.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              type="password"
            />
            <Field
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              type="password"
            />
            <Field
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
            />
          </div>
          <Button onClick={savePassword}>Set password</Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{college.name}</p>
    </div>
  );
};

const ReadOnly: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
  </div>
);
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}> = ({ label, value, onChange, type = "text" }) => (
  <label className="space-y-1.5">
    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    <Input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);
