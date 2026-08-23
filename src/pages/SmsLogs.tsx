import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { localDb } from '../lib/supabase';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';

export const SmsLogs: React.FC = () => {
  const logs = localDb.sms_logs;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'__all' | 'sent' | 'failed'>('__all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== '__all' && log.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.student_name.toLowerCase().includes(q) ||
          (log.parent_mobile && log.parent_mobile.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Parent Absentee SMS Logs</h2>
        <p className="text-sm text-muted-foreground">
          Complete dispatch record of SMS messages sent to parents when a student is marked absent.
        </p>
      </div>

      <div className="surface-panel grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Search Log</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by student name or parent mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Status Filter</label>
          <Select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            options={[
              { value: '__all', label: 'All Statuses' },
              { value: 'sent', label: 'Delivered / Sent' },
              { value: 'failed', label: 'Failed (No Number)' },
            ]}
          />
        </div>
      </div>

      <div className="surface-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Parent Mobile</TableHead>
              <TableHead>Absence Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SMS Message Content</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No SMS alert logs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-semibold">{log.student_name}</TableCell>
                  <TableCell className="font-mono text-xs">{log.parent_mobile || '—'}</TableCell>
                  <TableCell className="text-xs">{log.attendance_date}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'sent' ? 'success' : 'destructive'} className="uppercase text-[10px]">
                      {log.status === 'sent' ? (
                        <CheckCircle className="h-3 w-3 mr-1 inline" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1 inline" />
                      )}
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-md whitespace-pre-line text-muted-foreground bg-muted/30 p-2 rounded">
                    {log.message}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
