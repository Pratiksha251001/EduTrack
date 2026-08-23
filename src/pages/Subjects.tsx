import React from 'react';
import { CrudPage } from '../components/CrudPage';
import { Subject } from '../lib/types';
import { localDb } from '../lib/supabase';
import { college } from '../lib/college';

export const Subjects: React.FC = () => {
  const departments = localDb.departments;
  const teachers = localDb.teachers;

  return (
    <CrudPage<Subject>
      title="Subjects"
      description="Curriculum courses mapped to academic departments, semester cohorts, and assigned teachers."
      table="subjects"
      searchKeys={['code', 'name']}
      fields={[
        { key: 'code', label: 'Subject Code (e.g. CS501)', required: true },
        { key: 'name', label: 'Subject Name', required: true },
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
        { key: 'credits', label: 'Course Credits', type: 'number', defaultValue: '3' },
        {
          key: 'teacher_id',
          label: 'Assigned Faculty',
          type: 'select',
          options: teachers.map((t) => ({ value: t.id, label: `${t.full_name} (${t.employee_id})` })),
        },
      ]}
      columns={[
        { header: 'Code', render: (s) => <span className="font-mono text-xs font-bold">{s.code}</span> },
        { header: 'Subject Name', render: (s) => <span className="font-semibold">{s.name}</span> },
        { header: 'Department', render: (s) => departments.find((d) => d.id === s.department_id)?.name || '—' },
        { header: 'Sem', render: (s) => `Sem ${s.semester}` },
        { header: 'Credits', render: (s) => s.credits },
        { header: 'Assigned Teacher', render: (s) => teachers.find((t) => t.id === s.teacher_id)?.full_name || 'Unassigned' },
      ]}
    />
  );
};
