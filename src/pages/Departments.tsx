import React from 'react';
import { CrudPage } from '../components/CrudPage';
import { Department } from '../lib/types';

export const Departments: React.FC = () => {
  return (
    <CrudPage<Department>
      title="Departments"
      description="Academic departments utilized across subjects, faculty, and student batches."
      table="departments"
      searchKeys={['name', 'code']}
      fields={[
        { key: 'name', label: 'Department Name', required: true },
        { key: 'code', label: 'Department Code (e.g. CSE)', required: true },
      ]}
      columns={[
        { header: 'Department Name', render: (d) => <span className="font-semibold">{d.name}</span> },
        { header: 'Code', render: (d) => <span className="font-mono text-xs">{d.code}</span> },
      ]}
    />
  );
};
