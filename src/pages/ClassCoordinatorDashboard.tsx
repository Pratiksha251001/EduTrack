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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { saveCredential } from '../lib/authUtils';
import { Student } from '../lib/types';
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

  const me = teachers.find(
    t =>
      t.id === user?.teacher_id ||
      (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.employee_id && t.employee_id === user.employee_id) ||
      (t.is_class_coordinator && t.department_id === (user?.department_id || 'dept-1'))
  );
  const myDepartmentId = user?.department_id || me?.department_id || 'dept-1';
  const myAssignedSemester = me?.assigned_semester || 5;

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
      parent_mobile: studentForm.parent_mobile.trim(),
      student_mobile: studentForm.student_mobile?.trim() || null,
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

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Class Coordinator Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage student roster, bulk imports via Excel/CSV, and validate parent contact details.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
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
