import React from 'react';
import { CrudPage } from '../components/CrudPage';
import { Teacher } from '../lib/types';
import { localDb } from '../lib/supabase';
import { Badge } from '../components/ui/badge';

export const Teachers: React.FC = () => {
  const departments = localDb.departments;

  return (
    <CrudPage<Teacher>
      title="Teachers"
      description="Faculty staff directory. Accounts link automatically when signing up with corresponding emails."
      table="teachers"
      searchKeys={['full_name', 'employee_id', 'email', 'mobile']}
      fields={[
        { key: 'employee_id', label: 'Employee ID', required: true },
        { key: 'full_name', label: 'Full Name', required: true },
        { key: 'email', label: 'Email Address', type: 'email' },
        { key: 'mobile', label: 'Mobile Number' },
        {
          key: 'department_id',
          label: 'Department',
          type: 'select',
          options: departments.map((d) => ({ value: d.id, label: d.name })),
        },
      ]}
      columns={[
        { header: 'Employee ID', render: (t) => <span className="font-mono text-xs font-bold">{t.employee_id}</span> },
        { header: 'Faculty Name', render: (t) => <span className="font-semibold">{t.full_name}</span> },
        { header: 'Email', render: (t) => t.email || '—' },
        { header: 'Mobile', render: (t) => t.mobile || '—' },
        {
          header: 'Department',
          render: (t) => departments.find((d) => d.id === t.department_id)?.name || '—',
        },
        {
          header: 'Account Status',
          render: (t) => (
            <Badge variant={t.user_id ? 'success' : 'secondary'}>
              {t.user_id ? 'Linked' : 'Not Registered'}
            </Badge>
          ),
        },
      ]}
    />
  );
};
