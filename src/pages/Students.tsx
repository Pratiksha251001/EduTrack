import React from 'react';
import { CrudPage } from '../components/CrudPage';
import { Student } from '../lib/types';
import { localDb } from '../lib/supabase';
import { college } from '../lib/college';
import { Badge } from '../components/ui/badge';

export const Students: React.FC = () => {
  const departments = localDb.departments;

  return (
    <CrudPage<Student>
      title="Students"
      description="Student roster and guardian contact registry for absentee SMS communication."
      table="students"
      searchKeys={['full_name', 'roll_number', 'reg_number', 'parent_mobile']}
      fields={[
        { key: 'roll_number', label: 'Roll Number', required: true },
        { key: 'reg_number', label: 'University Reg Number' },
        { key: 'full_name', label: 'Student Full Name', required: true },
        {
          key: 'department_id',
          label: 'Department',
          type: 'select',
          options: departments.map((d) => ({ value: d.id, label: d.name })),
        },
        {
          key: 'semester',
          label: 'Semester',
          type: 'select',
          required: true,
          options: college.semesters.map((s) => ({ value: String(s), label: `Semester ${s}` })),
        },
        { key: 'parent_name', label: 'Parent / Guardian Name' },
        { key: 'parent_mobile', label: 'Parent Mobile (For SMS Alerts)' },
        { key: 'student_mobile', label: 'Student Mobile' },
        { key: 'email', label: 'Student Email', type: 'email' },
        {
          key: 'status',
          label: 'Enrollment Status',
          type: 'select',
          required: true,
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
      ]}
      columns={[
        { header: 'Roll No', render: (s) => <span className="font-mono text-xs font-bold">{s.roll_number}</span> },
        { header: 'Full Name', render: (s) => <span className="font-semibold">{s.full_name}</span> },
        { header: 'Reg No', render: (s) => s.reg_number || '—' },
        { header: 'Department', render: (s) => departments.find((d) => d.id === s.department_id)?.code || '—' },
        { header: 'Sem', render: (s) => s.semester },
        { header: 'Parent Contact', render: (s) => `${s.parent_name || 'Guardian'} (${s.parent_mobile || 'No Mobile'})` },
        {
          header: 'Status',
          render: (s) => <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge>,
        },
      ]}
    />
  );
};
