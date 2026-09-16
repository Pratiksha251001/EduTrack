import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Upload,
  Search,
  Plus,
  Trash2,
  Edit3,
  Save,
  CheckCircle2,
  XCircle,
  X,
  UserCog,
  ClipboardList,
  KeyRound,
  ShieldCheck,
  MessageSquare,
  Globe,
  BookOpen,
  UserCheck,
  Users,
  Building2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { saveCredential } from '../lib/authUtils';
import { Student, Subject } from '../lib/types';
import { college } from '../lib/college';
import {
  sanitizeMobileInput,
  getMobileValidationError,
  cleanMobile,
  isValid10DigitMobile,
  isValidEmail,
  getEmailValidationError,
  getNameValidationError,
  getRollNumberValidationError,
  validateDateOfBirth,
} from '../lib/validation';
import { StudentImportModal } from '../components/StudentImportModal';
import { StudentPasswordModal } from '../components/StudentPasswordModal';
import { ParentAlertModal } from '../components/ParentAlertModal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

export const ClassCoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'students' | 'subjects'>('students');
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [studentImportModalOpen, setStudentImportModalOpen] = useState(false);
  const [passwordModalStudent, setPasswordModalStudent] = useState<Student | null>(null);
  const [batchPasswordModalOpen, setBatchPasswordModalOpen] = useState(false);
  const [alertStudent, setAlertStudent] = useState<Student | null>(null);
  const [successToastMsg, setSuccessToastMsg] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [version, setVersion] = useState(0);

  // Subject management state
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState<string>('all');
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [assignFacultyModalOpen, setAssignFacultyModalOpen] = useState(false);
  const [targetSubjectForAssign, setTargetSubjectForAssign] = useState<Subject | null>(null);
  const [selectedFacultyForAssign, setSelectedFacultyForAssign] = useState('');
  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    semester: '5',
    department_id: '',
    credits: '3',
    teacher_id: '',
  });

  const [studentForm, setStudentForm] = useState({
    roll_number: '',
    reg_number: '',
    full_name: '',
    semester: '1',
    parent_name: '',
    parent_mobile: '',
    student_mobile: '',
    email: '',
    address: '',
    date_of_birth: '',
    gender: '' as '' | 'male' | 'female' | 'other',
    password: '',
  });

  const departments = localDb.departments;
  const students = localDb.students;
  const teachers = localDb.teachers;
  const allSubjects = localDb.subjects;
  const teacherSubjects = localDb.teacher_subjects;

  const me = teachers.find(
    t =>
      t.id === user?.teacher_id ||
      (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.employee_id && t.employee_id === user.employee_id) ||
      (t.is_class_coordinator && t.department_id === (user?.department_id || 'dept-1'))
  );
  const myDepartmentId = user?.department_id || me?.department_id || 'dept-1';
  const myDepartment = departments.find(d => d.id === myDepartmentId);
  const myAssignedSemester = me?.assigned_semester || 5;

  // Faculty members belonging to coordinator's department (imported or created by HOD)
  const departmentTeachers = useMemo(() => {
    return teachers.filter(t => !myDepartmentId || t.department_id === myDepartmentId);
  }, [teachers, myDepartmentId, version]);

  // Subjects for coordinator's department / semester
  const coordinatorSubjects = useMemo(() => {
    let list = allSubjects.filter(s => !myDepartmentId || s.department_id === myDepartmentId);
    if (subjectSemesterFilter !== 'all') {
      list = list.filter(s => s.semester === Number(subjectSemesterFilter));
    }
    if (subjectSearch) {
      const q = subjectSearch.toLowerCase();
      list = list.filter(s => {
        const assignedT = departmentTeachers.find(t => t.id === (s as any).teacher_id);
        const tsMapped = teacherSubjects.filter(ts => ts.subject_id === s.id);
        const mappedNames = tsMapped
          .map(ts => teachers.find(t => t.id === ts.teacher_id)?.full_name || '')
          .join(' ')
          .toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (assignedT && assignedT.full_name.toLowerCase().includes(q)) ||
          mappedNames.includes(q)
        );
      });
    }
    return list;
  }, [allSubjects, myDepartmentId, subjectSemesterFilter, subjectSearch, departmentTeachers, teacherSubjects, version]);

  const subjectStats = useMemo(() => {
    const deptSubs = allSubjects.filter(s => !myDepartmentId || s.department_id === myDepartmentId);
    const total = deptSubs.length;
    const assigned = deptSubs.filter(s => {
      const hasDirect = !!(s as any).teacher_id;
      const hasMapping = teacherSubjects.some(ts => ts.subject_id === s.id);
      return hasDirect || hasMapping;
    }).length;
    const unassigned = total - assigned;
    return {
      total,
      assigned,
      unassigned,
      facultyCount: departmentTeachers.length,
    };
  }, [allSubjects, myDepartmentId, teacherSubjects, departmentTeachers, version]);

  const myStudents = useMemo(() => {
    let list = students.filter(s => !myDepartmentId || s.department_id === myDepartmentId);
    if (myAssignedSemester && semesterFilter === 'all') {
      // Prioritize assigned semester if coordinator has one, but show all if none found
      const semList = list.filter(s => s.semester === myAssignedSemester);
      if (semList.length > 0) list = semList;
    } else if (semesterFilter !== 'all') {
      list = list.filter(s => s.semester === Number(semesterFilter));
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(st =>
        st.full_name.toLowerCase().includes(s) ||
        st.roll_number.toLowerCase().includes(s) ||
        (st.reg_number || '').toLowerCase().includes(s) ||
        (st.parent_mobile || '').includes(s)
      );
    }
    return list;
  }, [students, myDepartmentId, myAssignedSemester, semesterFilter, search, version]);

  const statsSemesters = useMemo(() => {
    const all = students.filter(s => !myDepartmentId || s.department_id === myDepartmentId);
    const my = myAssignedSemester ? all.filter(s => s.semester === myAssignedSemester) : all;
    const active = my.filter(s => s.status === 'active').length;
    return { total: my.length, active, inactive: my.length - active, sem: myAssignedSemester };
  }, [students, myDepartmentId, myAssignedSemester, version]);

  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      roll_number: '',
      reg_number: '',
      full_name: '',
      semester: String(myAssignedSemester || 1),
      parent_name: '',
      parent_mobile: '',
      student_mobile: '',
      email: '',
      address: '',
      date_of_birth: '',
      gender: '',
      password: '',
    });
    setStudentDialogOpen(true);
  };

  const handleEditStudent = (s: Student) => {
    setEditingStudent(s);
    setStudentForm({
      roll_number: s.roll_number,
      reg_number: s.reg_number || '',
      full_name: s.full_name,
      semester: String(s.semester),
      parent_name: s.parent_name || '',
      parent_mobile: s.parent_mobile || '',
      student_mobile: s.student_mobile || '',
      email: s.email || '',
      address: s.address || '',
      date_of_birth: s.date_of_birth || '',
      gender: (s.gender as '' | 'male' | 'female' | 'other') || '',
      password: '',
    });
    setStudentDialogOpen(true);
  };

  const validateStudentForm = (): string[] => {
    const errs: string[] = [];
    const rollErr = getRollNumberValidationError(studentForm.roll_number);
    if (rollErr) errs.push(rollErr);

    // Uniqueness of roll number
    const normRoll = studentForm.roll_number.trim().toLowerCase();
    const duplicateStudent = localDb.students.find(
      s => s.roll_number.trim().toLowerCase() === normRoll && (!editingStudent || s.id !== editingStudent.id)
    );
    if (duplicateStudent) {
      errs.push(`Roll Number '${studentForm.roll_number}' already belongs to another student (${duplicateStudent.full_name}).`);
    }

    const nameErr = getNameValidationError(studentForm.full_name);
    if (nameErr) errs.push(nameErr);

    // Parent mobile: strictly 10 digits required
    const parentMobileErr = getMobileValidationError(studentForm.parent_mobile, 'Parent Mobile', true);
    if (parentMobileErr) errs.push(parentMobileErr);

    // Student mobile: strictly 10 digits if provided
    if (studentForm.student_mobile) {
      const studentMobileErr = getMobileValidationError(studentForm.student_mobile, 'Student Mobile', false);
      if (studentMobileErr) errs.push(studentMobileErr);
    }

    // Must not be identical
    const clParent = cleanMobile(studentForm.parent_mobile);
    const clStudent = cleanMobile(studentForm.student_mobile);
    if (clParent && clStudent && clParent === clStudent) {
      errs.push('Parent Mobile and Student Mobile cannot be identical numbers.');
    }

    // Email format
    if (studentForm.email) {
      const emailErr = getEmailValidationError(studentForm.email);
      if (emailErr) errs.push(emailErr);
    }

    // DOB
    if (studentForm.date_of_birth) {
      const dobErr = validateDateOfBirth(studentForm.date_of_birth);
      if (dobErr) errs.push(dobErr);
    }

    return errs;
  };

  const handleStudentSubmit = async () => {
    const errs = validateStudentForm();
    if (errs.length > 0) {
      alert(errs.join('\n'));
      return;
    }

    const data = {
      roll_number: studentForm.roll_number.trim(),
      reg_number: studentForm.reg_number?.trim() || null,
      full_name: studentForm.full_name.trim(),
      department_id: user?.department_id,
      semester: Number(studentForm.semester),
      parent_name: studentForm.parent_name?.trim() || null,
      parent_mobile: cleanMobile(studentForm.parent_mobile),
      student_mobile: cleanMobile(studentForm.student_mobile) || null,
      email: studentForm.email?.trim() || null,
      address: studentForm.address?.trim() || null,
      date_of_birth: studentForm.date_of_birth || null,
      gender: studentForm.gender || null,
      status: 'active' as const,
    };

    const effectivePwd = studentForm.password.trim() || data.roll_number || '123';

    if (editingStudent) {
      await localDb.update('students', editingStudent.id, data);
      const account = localDb.users.find(u => u.student_id === editingStudent.id);
      if (account) {
        await localDb.update('users', account.id, {
          full_name: data.full_name,
          email: data.email || account.email,
        });
      }
      if (studentForm.password.trim() || !account) {
        saveCredential(
          [
            editingStudent.id,
            account?.id,
            `student-user-${editingStudent.id}`,
            data.roll_number,
            data.reg_number,
            data.email,
          ],
          effectivePwd,
        );
      }
    } else {
      const inserted = await localDb.insert('students', [data]);
      const student = inserted[0];
      if (student) {
        const accountId = `student-user-${student.id}`;
        await localDb.insert('users', [
          {
            id: accountId,
            full_name: student.full_name,
            email: student.email || `${student.roll_number.toLowerCase()}@student.edutrack.edu`,
            role: 'student',
            department_id: user?.department_id,
            student_id: student.id,
            status: 'active',
          },
        ]);
        saveCredential(
          [
            accountId,
            student.id,
            student.roll_number,
            student.reg_number,
            student.email,
          ],
          effectivePwd,
        );
      }
    }

    setStudentDialogOpen(false);
    setVersion(v => v + 1);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Delete this student? This action cannot be undone.')) return;
    await localDb.delete('students', id);
    setVersion(v => v + 1);
  };

  // SUBJECT & TEACHER ASSIGNMENT HANDLERS
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      code: '',
      name: '',
      semester: String(myAssignedSemester || 5),
      department_id: myDepartmentId,
      credits: '3',
      teacher_id: '',
    });
    setSubjectDialogOpen(true);
  };

  const handleOpenEditSubject = (s: Subject) => {
    setEditingSubject(s);
    const currentTs = teacherSubjects.find(ts => ts.subject_id === s.id);
    setSubjectForm({
      code: s.code,
      name: s.name,
      semester: String(s.semester),
      department_id: s.department_id || myDepartmentId,
      credits: String(s.credits || 3),
      teacher_id: currentTs?.teacher_id || (s as any).teacher_id || '',
    });
    setSubjectDialogOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectForm.code.trim()) {
      alert('Please enter a subject code (e.g. CS501).');
      return;
    }
    if (!subjectForm.name.trim()) {
      alert('Please enter a subject name.');
      return;
    }

    const codeNorm = subjectForm.code.trim().toUpperCase();
    const duplicate = allSubjects.find(
      s =>
        s.code.trim().toUpperCase() === codeNorm &&
        s.department_id === myDepartmentId &&
        (!editingSubject || s.id !== editingSubject.id)
    );
    if (duplicate) {
      alert(`Subject code '${codeNorm}' already exists in this department (${duplicate.name}).`);
      return;
    }

    const assignedTeacher = departmentTeachers.find(t => t.id === subjectForm.teacher_id);

    if (editingSubject) {
      await localDb.update('subjects', editingSubject.id, {
        code: codeNorm,
        name: subjectForm.name.trim(),
        department_id: subjectForm.department_id || myDepartmentId,
        semester: Number(subjectForm.semester),
        credits: Number(subjectForm.credits) || 3,
        teacher_id: subjectForm.teacher_id || null,
      });

      const existingTs = teacherSubjects.filter(ts => ts.subject_id === editingSubject.id);
      for (const ts of existingTs) {
        await localDb.delete('teacher_subjects', ts.id);
      }
      if (subjectForm.teacher_id) {
        await localDb.insert('teacher_subjects', [{
          id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          teacher_id: subjectForm.teacher_id,
          subject_id: editingSubject.id,
          class_name: null,
          created_at: new Date().toISOString(),
        }]);
      }

      setSuccessToastMsg(
        `Updated subject ${codeNorm} - ${subjectForm.name.trim()}${
          assignedTeacher ? ` and mapped to ${assignedTeacher.full_name} (Imported by HOD)` : ''
        }!`
      );
    } else {
      const newSubjectId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const inserted = await localDb.insert('subjects', [{
        id: newSubjectId,
        code: codeNorm,
        name: subjectForm.name.trim(),
        department_id: subjectForm.department_id || myDepartmentId,
        semester: Number(subjectForm.semester),
        credits: Number(subjectForm.credits) || 3,
        teacher_id: subjectForm.teacher_id || null,
        created_at: new Date().toISOString(),
      }]);

      if (subjectForm.teacher_id && inserted[0]) {
        await localDb.insert('teacher_subjects', [{
          id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          teacher_id: subjectForm.teacher_id,
          subject_id: inserted[0].id,
          class_name: null,
          created_at: new Date().toISOString(),
        }]);
      }

      setSuccessToastMsg(
        `Created subject ${codeNorm} - ${subjectForm.name.trim()}${
          assignedTeacher ? ` and assigned to ${assignedTeacher.full_name} (Imported by HOD)` : ''
        }!`
      );
    }

    window.dispatchEvent(new CustomEvent('edutrack_data_updated'));
    setSubjectDialogOpen(false);
    setVersion(v => v + 1);
    setTimeout(() => setSuccessToastMsg(null), 5000);
  };

  const handleDeleteSubject = async (s: Subject) => {
    if (!confirm(`Are you sure you want to delete subject '${s.code} - ${s.name}'?`)) return;
    await localDb.delete('subjects', s.id);
    const existingTs = teacherSubjects.filter(ts => ts.subject_id === s.id);
    for (const ts of existingTs) {
      await localDb.delete('teacher_subjects', ts.id);
    }
    window.dispatchEvent(new CustomEvent('edutrack_data_updated'));
    setSuccessToastMsg(`Subject ${s.code} deleted successfully.`);
    setVersion(v => v + 1);
    setTimeout(() => setSuccessToastMsg(null), 4000);
  };

  const handleOpenQuickAssign = (s: Subject) => {
    setTargetSubjectForAssign(s);
    const currentTs = teacherSubjects.find(ts => ts.subject_id === s.id);
    setSelectedFacultyForAssign(currentTs?.teacher_id || (s as any).teacher_id || '');
    setAssignFacultyModalOpen(true);
  };

  const handleSaveQuickAssign = async () => {
    if (!targetSubjectForAssign) return;

    await localDb.update('subjects', targetSubjectForAssign.id, {
      teacher_id: selectedFacultyForAssign || null,
    });

    const existingTs = teacherSubjects.filter(ts => ts.subject_id === targetSubjectForAssign.id);
    for (const ts of existingTs) {
      await localDb.delete('teacher_subjects', ts.id);
    }

    const assignedTeacher = departmentTeachers.find(t => t.id === selectedFacultyForAssign);

    if (selectedFacultyForAssign) {
      await localDb.insert('teacher_subjects', [{
        id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        teacher_id: selectedFacultyForAssign,
        subject_id: targetSubjectForAssign.id,
        class_name: null,
        created_at: new Date().toISOString(),
      }]);
      setSuccessToastMsg(
        `Assigned ${assignedTeacher?.full_name || 'Faculty'} (Imported by HOD) to ${targetSubjectForAssign.code}!`
      );
    } else {
      setSuccessToastMsg(`Unassigned faculty from ${targetSubjectForAssign.code}.`);
    }

    window.dispatchEvent(new CustomEvent('edutrack_data_updated'));
    setAssignFacultyModalOpen(false);
    setTargetSubjectForAssign(null);
    setVersion(v => v + 1);
    setTimeout(() => setSuccessToastMsg(null), 4000);
  };

  const handleUnassignFaculty = async (s: Subject) => {
    if (!confirm(`Unassign teacher from ${s.code} - ${s.name}?`)) return;
    await localDb.update('subjects', s.id, { teacher_id: null });
    const existingTs = teacherSubjects.filter(ts => ts.subject_id === s.id);
    for (const ts of existingTs) {
      await localDb.delete('teacher_subjects', ts.id);
    }
    window.dispatchEvent(new CustomEvent('edutrack_data_updated'));
    setSuccessToastMsg(`Teacher unassigned from ${s.code}.`);
    setVersion(v => v + 1);
    setTimeout(() => setSuccessToastMsg(null), 4000);
  };

  const statCards = [
    {
      label: myAssignedSemester ? `Semester ${myAssignedSemester} Students` : 'Dept Students',
      value: String(statsSemesters.total),
      sub: 'Total Enrolled',
      icon: GraduationCap,
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
    {
      label: 'Active Students',
      value: String(statsSemesters.active),
      sub: 'Currently Enrolled',
      icon: CheckCircle2,
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Inactive',
      value: String(statsSemesters.inactive),
      sub: 'On Leave / Dropped',
      icon: XCircle,
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    {
      label: 'My Class',
      value: myAssignedSemester ? `Sem ${myAssignedSemester}` : 'All',
      sub: 'Assigned Semester',
      icon: UserCog,
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
  ];

  const subjectStatCards = [
    {
      label: 'Curriculum Subjects',
      value: String(subjectStats.total),
      sub: `${myDepartment?.name || 'Department'} Courses`,
      icon: BookOpen,
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Assigned to Faculty',
      value: String(subjectStats.assigned),
      sub: 'Teachers Mapped',
      icon: UserCheck,
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Pending Assignment',
      value: String(subjectStats.unassigned),
      sub: subjectStats.unassigned > 0 ? 'Needs Teacher Assignment' : 'All Subjects Assigned',
      icon: subjectStats.unassigned > 0 ? XCircle : CheckCircle2,
      border: subjectStats.unassigned > 0 ? 'border-amber-500/20' : 'border-emerald-500/20',
      iconBg:
        subjectStats.unassigned > 0
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'HOD Faculty Pool',
      value: String(subjectStats.facultyCount),
      sub: 'Imported Teachers Available',
      icon: Users,
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToastMsg && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successToastMsg}</span>
          </div>
          <button
            onClick={() => setSuccessToastMsg(null)}
            className="hover:opacity-75 p-0.5 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Class Coordinator Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage student roster, create curriculum subjects, and assign teaching faculty imported by HOD.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveMainTab('students')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMainTab === 'students'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Student Roster</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {myStudents.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveMainTab('subjects')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMainTab === 'subjects'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Subjects & Faculty</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {coordinatorSubjects.length}
            </Badge>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(activeMainTab === 'students' ? statCards : subjectStatCards).map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className={`border ${s.border} p-5 relative overflow-hidden`}>
              <div className="relative">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${s.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black text-foreground">{s.value}</div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* STUDENT ROSTER TAB */}
      {activeMainTab === 'students' && (
        <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Student Roster
            </h2>
            <p className="text-xs text-muted-foreground">
              {myStudents.length} student{myStudents.length !== 1 ? 's' : ''} in your class
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchPasswordModalOpen(true)}
              className="text-xs"
              title="Set or reset portal login passwords for all students in class"
            >
              <KeyRound className="h-3.5 w-3.5 mr-1.5 text-primary" /> Batch Set Passwords
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStudentImportModalOpen(true)}
              className="text-xs font-medium"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Import CSV/Excel
            </Button>
            <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleAddStudent}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Roll No *</label>
                    <Input value={studentForm.roll_number} onChange={e => setStudentForm({ ...studentForm, roll_number: e.target.value })} placeholder="21CS101" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reg Number</label>
                    <Input value={studentForm.reg_number} onChange={e => setStudentForm({ ...studentForm, reg_number: e.target.value })} placeholder="REG-2021-101" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full Name *</label>
                    <Input value={studentForm.full_name} onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })} placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Semester</label>
                    <Select value={studentForm.semester} onValueChange={v => setStudentForm({ ...studentForm, semester: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {college.semesters.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Gender</label>
                    <Select value={studentForm.gender} onValueChange={v => setStudentForm({ ...studentForm, gender: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Parent / Guardian Name</label>
                    <Input value={studentForm.parent_name} onChange={e => setStudentForm({ ...studentForm, parent_name: e.target.value })} placeholder="Mr. Smith" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-muted-foreground block">
                        Parent Mobile * <Badge variant="default" className="text-[9px] ml-1 px-1 py-0">MANDATORY SMS</Badge>
                      </label>
                      <span className={`text-[10px] font-mono ${studentForm.parent_mobile.length === 10 ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                        {studentForm.parent_mobile.length}/10 digits
                      </span>
                    </div>
                    <Input
                      value={studentForm.parent_mobile}
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={e => setStudentForm({ ...studentForm, parent_mobile: sanitizeMobileInput(e.target.value) })}
                      placeholder="9876543210 (10 digits)"
                      className={studentForm.parent_mobile && !isValid10DigitMobile(studentForm.parent_mobile) ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Must be strictly 10 digits for automated absentee SMS.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-muted-foreground block">Student Mobile</label>
                      {studentForm.student_mobile && (
                        <span className={`text-[10px] font-mono ${studentForm.student_mobile.length === 10 ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                          {studentForm.student_mobile.length}/10 digits
                        </span>
                      )}
                    </div>
                    <Input
                      value={studentForm.student_mobile}
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={e => setStudentForm({ ...studentForm, student_mobile: sanitizeMobileInput(e.target.value) })}
                      placeholder="9876543211 (Optional 10 digits)"
                      className={studentForm.student_mobile && !isValid10DigitMobile(studentForm.student_mobile) ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Optional student personal phone.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Student Email</label>
                    <Input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} placeholder="john@student.edu" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date of Birth</label>
                    <Input type="date" value={studentForm.date_of_birth} onChange={e => setStudentForm({ ...studentForm, date_of_birth: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Address</label>
                    <Input value={studentForm.address} onChange={e => setStudentForm({ ...studentForm, address: e.target.value })} placeholder="123 College Ave" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Login Password</label>
                    <Input
                      type="password"
                      value={studentForm.password}
                      onChange={e => setStudentForm({ ...studentForm, password: e.target.value })}
                      placeholder={editingStudent ? "Leave blank to keep current password" : "Default: Student's Roll Number"}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Students can log in to their student portal using their Roll Number and password.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setStudentDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleStudentSubmit}>
                    <Save className="h-4 w-4 mr-1.5" /> {editingStudent ? 'Update' : 'Add Student'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, roll, reg, or parent mobile..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {college.semesters.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Sem</TableHead>
                  <TableHead>Parent Contact</TableHead>
                  <TableHead>Student No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[115px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                      No students found. Import via CSV or add manually.
                    </TableCell>
                  </TableRow>
                )}
                {myStudents.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-bold text-xs">{s.roll_number}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{s.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.email || '—'}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">Sem {s.semester}</Badge></TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium text-foreground">{s.parent_name || 'Guardian'}</div>
                        <div className="text-muted-foreground">{s.parent_mobile || <span className="text-rose-500 font-bold">NO CONTACT!</span>}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {s.parent_mobile && s.student_mobile && s.parent_mobile === s.student_mobile ? (
                          <Badge variant="destructive" className="text-[10px]">Same as Parent!</Badge>
                        ) : (
                          s.student_mobile || '—'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAlertStudent(s)}
                          className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                          title="Send Parent Absentee Alert / SMS (English, मराठी, हिंदी)"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPasswordModalStudent(s)}
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Set / Reset Student Portal Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditStudent(s)} className="h-7 w-7" title="Edit Student">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(s.id)} className="h-7 w-7 text-red-500 hover:text-red-500 hover:bg-red-500/10" title="Delete Student">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
      )}

      {/* SUBJECTS & TEACHER ASSIGNMENT TAB */}
      {activeMainTab === 'subjects' && (
        <Card className="p-5">
          {/* Informational Guidance Banner */}
          <div className="p-4 mb-5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Class Coordinator Curriculum & Faculty Mapping</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Define and organize courses for <strong className="text-foreground">{myDepartment?.name || 'Department'}</strong> (Semester {myAssignedSemester || 'All'}), and assign lecturers from faculty members imported or managed by your Head of Department (HOD).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                <Users className="h-3.5 w-3.5" />
                <span>{departmentTeachers.length} Faculty in Department Pool</span>
              </span>
            </div>
          </div>

          {/* Action and Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Class Subjects
              </h2>
              <p className="text-xs text-muted-foreground">
                {coordinatorSubjects.length} subject{coordinatorSubjects.length !== 1 ? 's' : ''} in curriculum
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleOpenAddSubject} className="text-xs font-semibold">
                <Plus className="h-4 w-4 mr-1.5" /> Create Subject
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subject code, subject title, or assigned lecturer..."
                value={subjectSearch}
                onChange={e => setSubjectSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Select value={subjectSemesterFilter} onValueChange={setSubjectSemesterFilter}>
              <SelectTrigger className="w-[170px] text-xs">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {college.semesters.map(s => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subjects Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead className="w-[90px]">Sem</TableHead>
                    <TableHead className="w-[80px]">Credits</TableHead>
                    <TableHead>Assigned Faculty (Imported by HOD)</TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coordinatorSubjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                          <p className="font-semibold text-foreground">No subjects found</p>
                          <p className="text-xs">Click "Create Subject" to add curriculum courses and assign HOD faculty.</p>
                          <Button size="sm" onClick={handleOpenAddSubject} className="mt-2 text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Create First Subject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {coordinatorSubjects.map(sub => {
                    const directTeacher = departmentTeachers.find(t => t.id === (sub as any).teacher_id);
                    const tsMappings = teacherSubjects.filter(ts => ts.subject_id === sub.id);
                    const mappedTeachers = tsMappings
                      .map(ts => teachers.find(t => t.id === ts.teacher_id))
                      .filter(Boolean);
                    const assignedList = mappedTeachers.length > 0 ? mappedTeachers : (directTeacher ? [directTeacher] : []);

                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-muted text-foreground border border-border/80">
                            {sub.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{sub.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {departments.find(d => d.id === sub.department_id)?.name || 'General Department'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-semibold">
                            Sem {sub.semester}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {sub.credits || 3} Cr
                        </TableCell>
                        <TableCell>
                          {assignedList.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {assignedList.map((t: any) => (
                                <div
                                  key={t.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium"
                                >
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>{t.full_name}</span>
                                  <span className="text-[10px] text-muted-foreground">({t.employee_id})</span>
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                                    {t.designation || (t.role === 'hod' ? 'HOD & Lecturer' : 'Faculty')}
                                  </span>
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenQuickAssign(sub)}
                                className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
                                title="Change or reassign teacher"
                              >
                                Reassign
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnassignFaculty(sub)}
                                className="h-6 text-[11px] px-1.5 text-rose-500 hover:bg-rose-500/10"
                                title="Unassign teacher"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                ⚠️ No Teacher Assigned
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenQuickAssign(sub)}
                                className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1" /> Assign Teacher
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenQuickAssign(sub)}
                              className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                              title="Assign / Reassign Teacher (Imported by HOD)"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditSubject(sub)}
                              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="Edit Subject"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSubject(sub)}
                              className="h-7 w-7 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                              title="Delete Subject"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {/* Create / Edit Subject Dialog */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? `Edit Subject: ${editingSubject.code}` : 'Create New Subject'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Subject Code *
                </label>
                <Input
                  value={subjectForm.code}
                  onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  placeholder="CS501"
                  className="font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Credits
                </label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={subjectForm.credits}
                  onChange={e => setSubjectForm({ ...subjectForm, credits: e.target.value })}
                  placeholder="3"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Subject Title / Name *
              </label>
              <Input
                value={subjectForm.name}
                onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                placeholder="e.g. Compiler Design & Construction"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Semester *
                </label>
                <Select
                  value={subjectForm.semester}
                  onValueChange={v => setSubjectForm({ ...subjectForm, semester: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {college.semesters.map(s => (
                      <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Department
                </label>
                <Select
                  value={subjectForm.department_id}
                  onValueChange={v => setSubjectForm({ ...subjectForm, department_id: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned Teacher Section */}
            <div className="pt-2 border-t border-border/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  Assign Teacher / Lecturer (Imported by HOD)
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {departmentTeachers.length} available
                </span>
              </div>
              <Select
                value={subjectForm.teacher_id}
                onValueChange={v => setSubjectForm({ ...subjectForm, teacher_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select Faculty Member --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">-- Unassigned (Assign Later) --</SelectItem>
                  {departmentTeachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} ({t.employee_id}) — {t.designation || (t.role === 'hod' ? 'HOD & Lecturer' : 'Faculty')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Lists all teachers imported via Excel/CSV or added to this department by the Head of Department (HOD).
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSubjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubject}>
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Teacher Assignment Modal */}
      <Dialog open={assignFacultyModalOpen} onOpenChange={setAssignFacultyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Assign Teacher to Subject
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-3">
            {targetSubjectForAssign && (
              <div className="p-3 rounded-lg bg-muted/60 border border-border/80 text-xs">
                <div className="font-bold text-sm text-foreground">
                  {targetSubjectForAssign.code} — {targetSubjectForAssign.name}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  Semester {targetSubjectForAssign.semester} • {targetSubjectForAssign.credits || 3} Credits
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Select Teaching Faculty (Imported by HOD):
              </label>
              <Select
                value={selectedFacultyForAssign}
                onValueChange={setSelectedFacultyForAssign}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select Teacher / Lecturer --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">-- Unassigned (No Teacher) --</SelectItem>
                  {departmentTeachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} ({t.employee_id}) — {t.designation || (t.role === 'hod' ? 'HOD & Lecturer' : 'Faculty')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                The assigned teacher will be able to conduct lectures, take attendance, and track student compliance for this subject.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssignFacultyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuickAssign}>
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Bulk Excel/CSV Import Modal */}
      <StudentImportModal
        open={studentImportModalOpen}
        onOpenChange={setStudentImportModalOpen}
        departmentId={myDepartmentId}
        defaultSemester={myAssignedSemester || (semesterFilter !== 'all' ? Number(semesterFilter) : 1)}
        onImportComplete={(count) => {
          setVersion(v => v + 1);
          setSuccessToastMsg(`Successfully imported ${count} students and generated portal accounts!`);
          setTimeout(() => setSuccessToastMsg(null), 5000);
        }}
      />

      {/* Individual Student Password Management Modal */}
      <StudentPasswordModal
        open={!!passwordModalStudent}
        onOpenChange={(open) => {
          if (!open) setPasswordModalStudent(null);
        }}
        student={passwordModalStudent}
        onSuccess={(msg) => {
          setVersion(v => v + 1);
          setSuccessToastMsg(msg);
          setTimeout(() => setSuccessToastMsg(null), 4000);
        }}
      />

      {/* Class Batch Student Password Management Modal */}
      <StudentPasswordModal
        open={batchPasswordModalOpen}
        onOpenChange={setBatchPasswordModalOpen}
        isBatch={true}
        studentsList={myStudents}
        semesterName={`Semester ${myAssignedSemester || semesterFilter}`}
        onSuccess={(msg) => {
          setVersion(v => v + 1);
          setSuccessToastMsg(msg);
          setTimeout(() => setSuccessToastMsg(null), 4000);
        }}
      />

      {/* Multilingual Parent Alert Modal */}
      <ParentAlertModal
        open={!!alertStudent}
        onOpenChange={(open) => {
          if (!open) setAlertStudent(null);
        }}
        studentName={alertStudent?.full_name || ''}
        parentMobile={alertStudent?.parent_mobile || ''}
        parentName={alertStudent?.parent_name || 'Parent'}
        date={new Date().toISOString().split('T')[0]}
        initialLanguage="trilingual"
        onSuccess={(msg) => {
          setVersion(v => v + 1);
          setSuccessToastMsg(msg);
          setTimeout(() => setSuccessToastMsg(null), 4000);
        }}
      />
    </div>
  );
};
