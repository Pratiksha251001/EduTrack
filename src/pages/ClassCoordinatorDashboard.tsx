import React, { useState, useMemo, useRef } from 'react';
import {
  GraduationCap,
  Upload,
  FileSpreadsheet,
  Search,
  Plus,
  Download,
  Trash2,
  Edit3,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  UserCog,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { Student } from '../lib/types';
import { college } from '../lib/college';
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

interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ParsedStudent {
  roll_number: string;
  reg_number?: string;
  full_name: string;
  parent_name?: string;
  parent_mobile: string;
  student_mobile?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  semester?: number;
  department_id?: string;
}

export const ClassCoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedStudent[]>([]);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importFileName, setImportFileName] = useState('');

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
  });

  const departments = localDb.departments;
  const students = localDb.students;
  const teachers = localDb.teachers;

  const me = teachers.find(t => t.id === user?.teacher_id);
  const myAssignedSemester = me?.assigned_semester;

  const myStudents = useMemo(() => {
    let list = students.filter(s => s.department_id === user?.department_id);
    if (myAssignedSemester) {
      list = list.filter(s => s.semester === myAssignedSemester);
    }
    if (semesterFilter !== 'all') {
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
  }, [students, user?.department_id, myAssignedSemester, semesterFilter, search]);

  const statsSemesters = useMemo(() => {
    const all = students.filter(s => s.department_id === user?.department_id);
    const my = myAssignedSemester ? all.filter(s => s.semester === myAssignedSemester) : all;
    const active = my.filter(s => s.status === 'active').length;
    return { total: my.length, active, inactive: my.length - active, sem: myAssignedSemester };
  }, [students, user?.department_id, myAssignedSemester]);

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
    });
    setStudentDialogOpen(true);
  };

  const validateStudentForm = (): string[] => {
    const errs: string[] = [];
    if (!studentForm.roll_number.trim()) errs.push('Roll Number is required');
    if (!studentForm.full_name.trim()) errs.push('Full Name is required');
    if (!studentForm.parent_mobile.trim()) errs.push('Parent Mobile is mandatory for SMS alerts');
    if (studentForm.parent_mobile && studentForm.student_mobile &&
        studentForm.parent_mobile === studentForm.student_mobile) {
      errs.push('Parent Mobile and Student Mobile cannot be the same');
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
      roll_number: studentForm.roll_number,
      reg_number: studentForm.reg_number || null,
      full_name: studentForm.full_name,
      department_id: user?.department_id,
      semester: Number(studentForm.semester),
      parent_name: studentForm.parent_name || null,
      parent_mobile: studentForm.parent_mobile,
      student_mobile: studentForm.student_mobile || null,
      email: studentForm.email || null,
      address: studentForm.address || null,
      date_of_birth: studentForm.date_of_birth || null,
      gender: studentForm.gender || null,
      status: 'active' as const,
    };

    if (editingStudent) {
      await localDb.update('students', editingStudent.id, data);
    } else {
      await localDb.insert('students', [data]);
    }

    setStudentDialogOpen(false);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Delete this student? This action cannot be undone.')) return;
    await localDb.delete('students', id);
  };

  const parseCSV = (text: string): ParsedStudent[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    const parsed: ParsedStudent[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
      const values = cols.slice(0, headers.length).map(v =>
        v.replace(/,$/, '').trim().replace(/^"|"$/g, '').replace(/""/g, '"')
      );

      const row: any = {};
      headers.forEach((h, idx) => {
        const val = values[idx] || '';
        if (h.includes('roll') && h.includes('no')) row.roll_number = val;
        else if (h === 'roll' || h === 'roll_number' || h === 'rollno') row.roll_number = val;
        else if (h.includes('reg')) row.reg_number = val;
        else if (h === 'name' || h.includes('full') || h === 'student_name' || h === 'studentname') row.full_name = val;
        else if (h.includes('parent') && (h.includes('name') || h.includes('guardian'))) row.parent_name = val;
        else if (h.includes('parent') && (h.includes('mobile') || h.includes('phone') || h.includes('contact'))) row.parent_mobile = val;
        else if (h.includes('student') && (h.includes('mobile') || h.includes('phone') || h.includes('contact'))) row.student_mobile = val;
        else if (h === 'mobile' || h === 'phone' || h === 'contact') row.student_mobile = val;
        else if (h.includes('email')) row.email = val;
        else if (h.includes('semester') || h === 'sem') row.semester = Number(val) || undefined;
        else if (h.includes('address')) row.address = val;
        else if (h.includes('dob') || h.includes('birth')) row.date_of_birth = val;
        else if (h === 'gender') row.gender = val;
      });

      parsed.push(row as ParsedStudent);
    }

    return parsed;
  };

  const validateParsedData = (data: ParsedStudent[]): ImportError[] => {
    const errs: ImportError[] = [];

    data.forEach((row, idx) => {
      const rowNum = idx + 2;
      if (!row.roll_number) {
        errs.push({ row: rowNum, field: 'roll_number', message: 'Roll number is required', value: row.roll_number });
      } else {
        const dupe = localDb.students.find(s => s.roll_number === row.roll_number);
        if (dupe) {
          errs.push({ row: rowNum, field: 'roll_number', message: 'Roll number already exists in system', value: row.roll_number });
        }
      }
      if (!row.full_name) {
        errs.push({ row: rowNum, field: 'full_name', message: 'Student full name is required', value: row.full_name });
      }
      if (!row.parent_mobile) {
        errs.push({ row: rowNum, field: 'parent_mobile', message: 'Parent mobile is MANDATORY for SMS alerts', value: row.parent_mobile });
      }
      if (row.parent_mobile && row.student_mobile && row.parent_mobile === row.student_mobile) {
        errs.push({ row: rowNum, field: 'student_mobile', message: 'Parent and Student mobile cannot be identical', value: row.student_mobile });
      }
    });

    const seenRolls = new Set<string>();
    data.forEach((row, idx) => {
      if (row.roll_number) {
        if (seenRolls.has(row.roll_number)) {
          errs.push({ row: idx + 2, field: 'roll_number', message: 'Duplicate roll number in uploaded file', value: row.roll_number });
        }
        seenRolls.add(row.roll_number);
      }
    });

    return errs;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);
    const errors = validateParsedData(parsed);

    setImportPreview(parsed);
    setImportErrors(errors);
    setImportDialogOpen(true);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    const validRows = importPreview.filter((_, idx) =>
      !importErrors.some(e => e.row === idx + 2)
    );

    const toInsert = validRows.map(r => ({
      roll_number: r.roll_number,
      reg_number: r.reg_number || null,
      full_name: r.full_name,
      department_id: user?.department_id,
      semester: r.semester || myAssignedSemester || 1,
      parent_name: r.parent_name || null,
      parent_mobile: r.parent_mobile,
      student_mobile: r.student_mobile || null,
      email: r.email || null,
      address: r.address || null,
      date_of_birth: r.date_of_birth || null,
      gender: (r.gender as 'male' | 'female' | 'other') || null,
      status: 'active' as const,
    }));

    if (toInsert.length > 0) {
      await localDb.insert('students', toInsert);
    }

    alert(`Successfully imported ${toInsert.length} student(s). ${importErrors.length} row(s) skipped due to errors.`);
    setImportDialogOpen(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportFileName('');
  };

  const downloadTemplate = () => {
    const headers = [
      'roll_number', 'reg_number', 'full_name', 'semester',
      'parent_name', 'parent_mobile', 'student_mobile',
      'email', 'address', 'date_of_birth', 'gender'
    ];
    const sampleRow = [
      '21CS101', 'REG-2021-101', 'John Smith', '5',
      'Mr. Smith', '+1 (555) 123-4567', '+1 (555) 123-4568',
      'john@student.edu', '123 College Ave', '2003-05-15', 'male'
    ];
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edutrack_student_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: myAssignedSemester ? `Semester ${myAssignedSemester} Students` : 'Dept Students', value: String(statsSemesters.total), sub: 'Total Enrolled', icon: GraduationCap, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20' },
    { label: 'Active Students', value: String(statsSemesters.active), sub: 'Currently Enrolled', icon: CheckCircle2, color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20' },
    { label: 'Inactive', value: String(statsSemesters.inactive), sub: 'On Leave / Dropped', icon: XCircle, color: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20' },
    { label: 'My Class', value: myAssignedSemester ? `Sem ${myAssignedSemester}` : 'All', sub: 'Assigned Semester', icon: UserCog, color: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20' },
  ];

  return (
    <div className="space-y-6">
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
            <Card key={i} className={`border ${s.color.split(' ').slice(-1)[0]} p-5 relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 h-20 w-20 rounded-bl-full bg-gradient-to-br ${s.color.split(' text')[0]} opacity-60 -mr-10 -mt-10`} />
              <div className="relative">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br ${s.color.split(' text')[0]} ${s.color.split('border ')[1].split(' ')[0]}`}>
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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" /> Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" /> Import CSV/Excel
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
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Parent Mobile * <Badge variant="default" className="text-[9px] ml-1 px-1 py-0">MANDATORY SMS</Badge>
                    </label>
                    <Input value={studentForm.parent_mobile} onChange={e => setStudentForm({ ...studentForm, parent_mobile: e.target.value })} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Student Mobile</label>
                    <Input value={studentForm.student_mobile} onChange={e => setStudentForm({ ...studentForm, student_mobile: e.target.value })} placeholder="+1 (555) 000-0001" />
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
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
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
                        <Button variant="ghost" size="icon" onClick={() => handleEditStudent(s)} className="h-7 w-7">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(s.id)} className="h-7 w-7 text-red-500 hover:text-red-500 hover:bg-red-500/10">
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

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex-row items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Review Student Import
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                File: <span className="font-mono">{importFileName}</span> • {importPreview.length} row(s) found
              </p>
            </div>
            <button onClick={() => setImportDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          {importErrors.length > 0 && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-500">
                <AlertTriangle className="h-4 w-4" />
                {importErrors.length} Validation Error{importErrors.length !== 1 ? 's' : ''} — These rows will be SKIPPED
              </div>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {importErrors.map((e, i) => (
                  <li key={i} className="flex gap-2 text-rose-500/90">
                    <span className="font-bold shrink-0">Row {e.row}:</span>
                    <span className="text-foreground/80">{e.message}</span>
                    {e.value && <span className="text-muted-foreground font-mono">({e.value})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-72">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Parent Mobile</TableHead>
                    <TableHead>Student Mobile</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((r, i) => {
                    const hasErr = importErrors.some(e => e.row === i + 2);
                    return (
                      <TableRow key={i} className={hasErr ? 'bg-rose-500/5' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{i + 2}</TableCell>
                        <TableCell className="font-mono text-xs font-bold">{r.roll_number}</TableCell>
                        <TableCell className="text-xs">{r.full_name}</TableCell>
                        <TableCell className="text-xs">{r.semester || '—'}</TableCell>
                        <TableCell>
                          <span className={`text-xs ${r.parent_mobile ? 'text-emerald-500' : 'text-rose-500 font-bold'}`}>
                            {r.parent_mobile || 'MISSING!'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs ${r.parent_mobile && r.student_mobile && r.parent_mobile === r.student_mobile ? 'text-rose-500 font-bold' : 'text-muted-foreground'}`}>
                            {r.student_mobile || '—'}
                            {r.parent_mobile && r.student_mobile && r.parent_mobile === r.student_mobile && ' ⚠'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {hasErr ? (
                            <Badge variant="destructive" className="text-[10px]">Skip</Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">Import</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importPreview.length === 0 || importPreview.length === importErrors.length}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirm Import ({importPreview.length - importErrors.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
